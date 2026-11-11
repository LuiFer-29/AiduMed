// Aidú Med · Asistente de citas por WhatsApp.
//  GET  /asistente            → verificación del webhook de Meta
//  POST /asistente            → mensajes de WhatsApp (firma de Meta obligatoria)
//  POST /asistente/simular    → simulador del panel de administración (sesión de administrador)
//  POST /asistente/recordatorios → recordatorios de citas (día anterior, 5:30–11:30 p. m., pg_cron; clave interna)
//  POST /asistente/evento     → avisos (el consultorio canceló, foto nueva por aprobar; trigger; clave interna)
//  POST /asistente/panel      → acciones del panel del médico (sesión del médico): días cerrados y "Atender"
import { createClient } from "npm:@supabase/supabase-js@2";
import { avisarFotoPendiente, crearAvisos, recordarRegistro } from "./correo.ts";
import { crearAlmacen } from "./datos.ts";
import { atender, type Cita, type Medico, type Salida } from "./flujo.ts";
import { crearCerebro } from "./ia.ts";
import { canceladaPorConsultorio, recordatorio, turnoListo, turnoListoTexto } from "./plantillas.ts";
import { rangosLibres, type Rango } from "./disponibilidad.ts";
import { fechaLocal, instante, minutosLocales, sumarDias } from "./tiempo.ts";
import { cargaUtil, enviar, firmaValida, leerNotificacion, marcarLeido } from "./whatsapp.ts";

const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; } })();
const sb = createClient(Deno.env.get("SUPABASE_URL")!, claveServicio, { auth: { persistSession: false } });
const almacen = crearAlmacen(sb);
// Precio de Claude Haiku por millón de tokens (USD), para el panel de costos.
const TARIFA_IA = { entrada: 1, salida: 5 };
const cerebro = crearCerebro(Deno.env.get("ANTHROPIC_API_KEY"), (medicoId, entrada, salida, modelo) => {
  const costo = (entrada * TARIFA_IA.entrada + salida * TARIFA_IA.salida) / 1e6;
  sb.from("ia_uso").insert({ medico_id: medicoId, tokens_entrada: entrada, tokens_salida: salida, modelo, costo_usd: costo }).then(() => {});
});

const ORIGENES = ["https://aidumed.app", "https://www.aidumed.app", "https://aidumed.netlify.app"];
function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors(req), "content-type": "application/json" } });

Deno.serve(async (req) => {
  const ruta = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });

  // Verificación del webhook (Meta, al configurar la URL).
  if (req.method === "GET") {
    const p = new URL(req.url).searchParams;
    if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === Deno.env.get("WA_VERIFY_TOKEN")) {
      return new Response(p.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("No autorizado", { status: 403 });
  }

  if (req.method === "POST" && ruta === "simular") return simular(req);
  if (req.method === "POST" && ruta === "panel") return panel(req);
  if (req.method === "POST" && ruta === "costos") return costos(req);
  if (req.method === "POST" && ruta === "admin") return administrar(req);
  if (req.method === "POST" && (ruta === "recordatorios" || ruta === "evento" || ruta === "meta")) {
    if (req.headers.get("x-aviso-secreto") !== Deno.env.get("AVISO_SECRETO")) return new Response("No autorizado", { status: 401 });
    return ruta === "recordatorios" ? recordatorios() : ruta === "evento" ? evento(req) : meta(req);
  }
  if (req.method === "POST") return webhook(req);
  return new Response("Método no permitido", { status: 405 });
});

// ---------- WhatsApp ----------
async function webhook(req: Request): Promise<Response> {
  const crudo = await req.text();
  if (!(await firmaValida(crudo, req.headers.get("x-hub-signature-256"), Deno.env.get("WA_APP_SECRET")))) {
    return new Response("Firma inválida", { status: 401 });
  }
  let cuerpo: any;
  try { cuerpo = JSON.parse(crudo); } catch { return new Response("ok"); }
  const avisos = crearAvisos(false);
  for (const m of leerNotificacion(cuerpo)) {
    try {
      if (await almacen.yaProcesado(m.metaId)) continue; // Meta reintenta: no responder dos veces
      await almacen.registrar(m.telefono, "entrante", m.crudo, m.metaId);
      marcarLeido(m.metaId);
      const salidas = await atender(m, { almacen, avisos, cerebro, ahora: new Date() });
      const medicoId = await almacen.medicoDeConversacion(m.telefono);
      for (const s of salidas) {
        const carga = cargaUtil(m.telefono, s);
        const id = await enviar(m.telefono, carga);
        await almacen.registrar(m.telefono, "saliente", carga, id, medicoId);
      }
    } catch (e) {
      console.error("Error atendiendo", m.telefono, e);
    }
  }
  return new Response("ok");
}

// ---------- Simulador del panel ----------
async function simular(req: Request): Promise<Response> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await sb.auth.getUser(token);
  if (u.error || !u.data.user) return json(req, { error: "Inicie sesión de nuevo." }, 401);
  const admin = await sb.from("admins").select("user_id").eq("user_id", u.data.user.id).maybeSingle();
  if (!admin.data) return json(req, { error: "Solo administradores." }, 403);

  const telefono = `sim${u.data.user.id.replace(/-/g, "").slice(0, 10)}`;
  let cuerpo: any = {};
  try { cuerpo = await req.json(); } catch { /* vacío */ }

  if (cuerpo.reiniciar) {
    await sb.from("conversaciones").delete().eq("telefono", telefono);
    await sb.from("pacientes").delete().eq("telefono", telefono); // borra también sus citas de prueba
    return json(req, { ok: true });
  }
  const e = { telefono, nombrePerfil: cuerpo.nombrePerfil || "Paciente de prueba", texto: cuerpo.texto, id: cuerpo.id };
  await almacen.registrar(telefono, "entrante", { texto: e.texto, id: e.id }, null);
  const salidas: Salida[] = await atender(e, { almacen, avisos: crearAvisos(true), cerebro, ahora: new Date(), permitirAprobados: true });
  for (const s of salidas) await almacen.registrar(telefono, "saliente", s, null);
  return json(req, { salidas, ia: !!Deno.env.get("ANTHROPIC_API_KEY") });
}

// ---------- Mensajes que inicia el asistente ----------
const whatsappListo = () => !!(Deno.env.get("WA_TOKEN") && Deno.env.get("WA_PHONE_ID"));
const esSimulado = (tel: string) => tel.startsWith("sim");

async function recordatorios(): Promise<Response> {
  // Se envían el día anterior a la cita desde las 5:30 p. m. (hora de Honduras). La tarea corre
  // 5:30, 6:30 … 11:30 p. m.; las horas siguientes reintentan lo que no se pudo enviar.
  const ahora = new Date();
  const desde = 17 * 60 + 30;
  if (minutosLocales(ahora) < desde) return new Response(JSON.stringify({ enviados: 0, motivo: "antes de las 5:30 p. m." }), { headers: { "content-type": "application/json" } });
  const hoy = fechaLocal(ahora), manana = sumarDias(hoy, 1);
  // Las citas agendadas después de las 5:30 p. m. no llevan recordatorio: el paciente acaba de confirmarla.
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("estado", "confirmada").is("recordatorio_at", null)
    .gte("inicio", instante(manana, "00:00").toISOString()).lt("inicio", instante(sumarDias(manana, 1), "00:00").toISOString())
    .lt("creada_at", instante(hoy, "17:30").toISOString());
  if (r.error) return new Response(r.error.message, { status: 500 });
  let enviados = 0, pendientes = 0;
  for (const fila of r.data || []) {
    const tel = fila.pacientes?.telefono as string;
    if (!tel || esSimulado(tel)) continue;
    if (!whatsappListo()) { pendientes++; continue; }
    const carga = recordatorio(tel, fila as Cita, fila.medicos as Medico);
    const id = await enviar(tel, carga);
    await almacen.registrar(tel, "saliente", carga, id, fila.medico_id);
    if (id) {
      enviados++;
      await sb.from("citas").update({ recordatorio_at: new Date().toISOString() }).eq("id", fila.id);
    }
  }
  return new Response(JSON.stringify({ enviados, pendientes }), { headers: { "content-type": "application/json" } });
}

async function evento(req: Request): Promise<Response> {
  const { tipo, cita_id, medico_id } = await req.json().catch(() => ({}));
  if (tipo === "foto_pendiente" && medico_id) {
    const m = await sb.from("medicos").select("*").eq("id", medico_id).maybeSingle();
    if (!m.data?.foto_pendiente_path) return new Response("Sin foto");
    const firmada = await sb.storage.from("fotos").createSignedUrl(m.data.foto_pendiente_path, 7 * 86400);
    await avisarFotoPendiente(m.data as Medico, firmada.data?.signedUrl || "");
    return new Response("Avisado");
  }
  if (tipo !== "cancelada_consultorio" || !cita_id) return new Response("Sin acción");
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("id", cita_id).maybeSingle();
  const tel = r.data?.pacientes?.telefono as string | undefined;
  if (!r.data || !tel || esSimulado(tel) || !whatsappListo()) return new Response("Sin envío");
  const carga = canceladaPorConsultorio(tel, r.data as Cita, r.data.medicos as Medico);
  const id = await enviar(tel, carga);
  await almacen.registrar(tel, "saliente", carga, id, r.data.medico_id);
  return new Response(id ? "Enviado" : "Error al enviar");
}

// ---------- Panel del médico ----------
async function panel(req: Request): Promise<Response> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await sb.auth.getUser(token);
  if (u.error || !u.data.user) return json(req, { error: "Inicie sesión de nuevo." }, 401);
  const uid = u.data.user.id;
  const cuerpo = await req.json().catch(() => ({}));
  const med = await sb.from("medicos").select("*").eq("id", uid).maybeSingle();
  if (!med.data) return json(req, { error: "No encontramos su perfil." }, 404);
  const m = med.data as Medico;

  // Días en que el consultorio no atiende por vacaciones, feriados o días libres (para "Mis citas").
  if (cuerpo.accion === "cerrados") {
    const desde = String(cuerpo.desde || ""), hasta = String(cuerpo.hasta || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || hasta < desde) return json(req, { error: "Fechas no válidas" }, 400);
    const feriados = await almacen.feriados();
    const rangos = rangosLibres(m, feriados, Number(desde.slice(0, 4)));
    const propias = (m.otras_vacaciones || []) as (Rango & { origen?: string })[];
    const dias: { fecha: string; etiqueta: string }[] = [];
    for (let f = desde, n = 0; f <= hasta && n < 120; f = sumarDias(f, 1), n++) {
      const o = propias.find((x) => f >= x.desde && f <= (x.hasta || x.desde));
      const r = rangos.find((x) => f >= x.desde && f <= x.hasta);
      if (!o && !r) continue;
      // Una sola palabra para todos los casos: "Sin consulta", con el motivo si lo hay.
      const motivo = o ? o.motivo : r!.nombre;
      const etiqueta = motivo && motivo !== "vacaciones" ? `Sin consulta · ${motivo}` : "Sin consulta";
      dias.push({ fecha: f, etiqueta });
    }
    return json(req, { dias });
  }

  // "Atender": avisa al paciente que el médico está listo.
  if (cuerpo.accion === "atender") {
    const r = await sb.from("citas").select("*, pacientes(telefono)").eq("id", String(cuerpo.cita_id || "")).eq("medico_id", uid).maybeSingle();
    if (!r.data) return json(req, { error: "No encontramos esa cita." }, 404);
    if (r.data.estado !== "confirmada") return json(req, { error: "La cita ya no está confirmada." }, 400);
    const tel = r.data.pacientes?.telefono as string | undefined;
    const ahora = new Date().toISOString();
    if (!tel) return json(req, { error: "La cita no tiene número de WhatsApp." }, 400);
    if (esSimulado(tel)) {
      await sb.from("citas").update({ llamado_at: ahora }).eq("id", r.data.id);
      return json(req, { ok: true, via: "prueba", llamado_at: ahora });
    }
    if (!whatsappListo()) return json(req, { error: "WhatsApp no está configurado todavía." }, 503);
    // Si el paciente escribió en las últimas 24 h, WhatsApp permite texto libre (gratis); si no, plantilla.
    const ult = await sb.from("mensajes").select("creado_at").eq("telefono", tel).eq("direccion", "entrante")
      .gte("creado_at", new Date(Date.now() - 23.5 * 3600_000).toISOString()).limit(1);
    const enVentana = !!ult.data?.length;
    const carga = enVentana ? cargaUtil(tel, { tipo: "texto", texto: turnoListoTexto(r.data as Cita, m) }) : turnoListo(tel, r.data as Cita, m);
    const id = await enviar(tel, carga);
    await almacen.registrar(tel, "saliente", carga, id, uid);
    if (!id) return json(req, { error: "WhatsApp no aceptó el mensaje. Intente de nuevo en un momento." }, 502);
    await sb.from("citas").update({ llamado_at: ahora }).eq("id", r.data.id);
    return json(req, { ok: true, via: enVentana ? "texto" : "plantilla", llamado_at: ahora });
  }
  return json(req, { error: "Acción no válida" }, 400);
}

// ---------- Acciones del administrador sobre registros incompletos ----------
async function esAdmin(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await sb.auth.getUser(token);
  if (u.error || !u.data.user) return null;
  const a = await sb.from("admins").select("user_id").eq("user_id", u.data.user.id).maybeSingle();
  return a.data ? u.data.user.id : null;
}

async function administrar(req: Request): Promise<Response> {
  if (!(await esAdmin(req))) return json(req, { error: "Solo administradores." }, 403);
  const { accion, user_id } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(user_id || ""))) return json(req, { error: "Cuenta no válida" }, 400);
  const usuario = await sb.auth.admin.getUserById(user_id);
  if (usuario.error || !usuario.data.user) return json(req, { error: "No encontramos esa cuenta." }, 404);
  const med = await sb.from("medicos").select("estado, nombre, titulo").eq("id", user_id).maybeSingle();
  // Solo se actúa sobre registros que no se han enviado (Registro incompleto o «Solo cuenta»).
  if (med.data && med.data.estado !== "borrador") return json(req, { error: "Esta acción es solo para registros incompletos." }, 400);
  const admin = await sb.from("admins").select("user_id").eq("user_id", user_id).maybeSingle();
  if (admin.data) return json(req, { error: "No se puede aplicar a un administrador." }, 400);

  if (accion === "recordar") {
    const correo = usuario.data.user.email;
    if (!correo) return json(req, { error: "La cuenta no tiene correo." }, 400);
    const nombre = med.data?.nombre ? [med.data.titulo, med.data.nombre].filter(Boolean).join(" ") : null;
    const ok = await recordarRegistro(correo, nombre);
    if (!ok) return json(req, { error: "No se pudo enviar el correo. Intente de nuevo." }, 502);
    const ahora = new Date().toISOString();
    await sb.from("registro_recordatorios").insert({ user_id, enviado_at: ahora });
    return json(req, { ok: true, enviado_at: ahora });
  }
  if (accion === "eliminar") {
    // Borra los archivos (foto y carné) y la cuenta; la ficha del médico se borra en cascada.
    for (const bucket of ["fotos", "carnes"]) {
      const l = await sb.storage.from(bucket).list(user_id, { limit: 100 });
      const rutas = (l.data || []).map((f) => `${user_id}/${f.name}`);
      if (rutas.length) await sb.storage.from(bucket).remove(rutas);
    }
    const r = await sb.auth.admin.deleteUser(user_id);
    if (r.error) return json(req, { error: "No se pudo eliminar: " + r.error.message }, 500);
    return json(req, { ok: true });
  }
  return json(req, { error: "Acción no válida" }, 400);
}

// ---------- Costos y uso (panel de administración) ----------
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const filas: T[] = [];
  for (let i = 0; ; i += 1000) {
    const r = await consulta(i, i + 999);
    if (r.error) throw r.error;
    filas.push(...(r.data || []));
    if (!r.data || r.data.length < 1000) return filas;
  }
}

async function costos(req: Request): Promise<Response> {
  if (!(await esAdmin(req))) return json(req, { error: "Solo administradores." }, 403);

  const { hasta: mesHasta, meses: nMeses } = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(nMeses) || 6, 1), 24);
  if (!/^\d{4}-\d{2}$/.test(String(mesHasta || ""))) return json(req, { error: "Mes no válido" }, 400);
  // Meses en hora de Honduras (UTC-6), del más antiguo al pedido.
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const [a, m] = mesHasta.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    lista.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const inicioMes = (ym: string) => new Date(`${ym}-01T00:00:00-06:00`);
  const desde = inicioMes(lista[0]);
  const [ua, um] = mesHasta.split("-").map(Number);
  const fin = new Date(Date.UTC(ua, um, 1, 6)); // primer día del mes siguiente, 00:00 en Honduras
  const mesDe = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3600_000).toISOString().slice(0, 7);

  const [mensajes, citas, ia] = await Promise.all([
    todas<{ creado_at: string; medico_id: string | null; tipo: string | null; contenido: any; telefono: string }>((a, b) =>
      sb.from("mensajes").select("creado_at, medico_id, tipo, contenido, telefono").eq("direccion", "saliente").not("telefono", "like", "sim%")
        .gte("creado_at", desde.toISOString()).lt("creado_at", fin.toISOString()).order("id").range(a, b)),
    todas<{ creada_at: string; medico_id: string; pacientes: { telefono: string } | null }>((a, b) =>
      sb.from("citas").select("creada_at, medico_id, pacientes(telefono)").gte("creada_at", desde.toISOString()).lt("creada_at", fin.toISOString()).order("id").range(a, b)),
    todas<{ creado_at: string; medico_id: string | null; costo_usd: number; tokens_entrada: number; tokens_salida: number }>((a, b) =>
      sb.from("ia_uso").select("creado_at, medico_id, costo_usd, tokens_entrada, tokens_salida").gte("creado_at", desde.toISOString()).lt("creado_at", fin.toISOString()).order("id").range(a, b)),
  ]);

  type Uso = { citas: number; servicio: number; plantilla: number; ia: number };
  const vacio = (): Uso => ({ citas: 0, servicio: 0, plantilla: 0, ia: 0 });
  const porMes: Record<string, Uso & { medicos: Record<string, Uso>; sin_medico: Uso }> = {};
  for (const ym of lista) porMes[ym] = { ...vacio(), medicos: {}, sin_medico: vacio() };
  const de = (ym: string, id: string | null) => {
    const mes = porMes[ym];
    if (!mes) return null;
    if (!id) return mes.sin_medico;
    return (mes.medicos[id] ||= vacio());
  };
  for (const x of mensajes) {
    const ym = mesDe(x.creado_at);
    const tipo = x.tipo || (x.contenido?.type === "template" ? "plantilla" : "servicio");
    const k = tipo === "plantilla" ? "plantilla" : "servicio";
    if (!porMes[ym]) continue;
    porMes[ym][k]++;
    de(ym, x.medico_id)![k]++;
  }
  for (const c of citas) {
    if (c.pacientes?.telefono?.startsWith("sim")) continue;
    const ym = mesDe(c.creada_at);
    if (!porMes[ym]) continue;
    porMes[ym].citas++;
    de(ym, c.medico_id)!.citas++;
  }
  for (const x of ia) {
    const ym = mesDe(x.creado_at);
    if (!porMes[ym]) continue;
    porMes[ym].ia += Number(x.costo_usd) || 0;
    de(ym, x.medico_id)!.ia += Number(x.costo_usd) || 0;
  }

  // Costo real que reporta Meta (si el token tiene permiso).
  let meta: { porMes: Record<string, number>; error?: string } = { porMes: {} };
  const waba = Deno.env.get("WA_WABA_ID") || "1490208389720856";
  if (Deno.env.get("WA_TOKEN")) {
    try {
      const ini = Math.floor(desde.getTime() / 1000), hasta = Math.floor(Math.min(fin.getTime(), Date.now()) / 1000);
      const campos = `pricing_analytics.start(${ini}).end(${hasta}).granularity(DAILY)`;
      const r = await fetch(`https://graph.facebook.com/${Deno.env.get("WA_API_VERSION") || "v25.0"}/${waba}?fields=${encodeURIComponent(campos)}`, { headers: { authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` } });
      const j = await r.json();
      if (!r.ok) meta.error = j?.error?.message || `Error ${r.status}`;
      for (const p of j?.pricing_analytics?.data?.[0]?.data_points || []) {
        const ym = mesDe(new Date(Number(p.start) * 1000).toISOString());
        meta.porMes[ym] = (meta.porMes[ym] || 0) + (Number(p.cost) || 0);
      }
    } catch (e) {
      meta.error = String(e);
    }
  }
  return json(req, { meses: lista, porMes, meta });
}

// ---------- Mantenimiento con Meta (uso interno) ----------
// Suscribe la cuenta de WhatsApp Business a esta app para que Meta entregue los mensajes al webhook.
async function meta(req: Request): Promise<Response> {
  const { accion, waba, solo } = await req.json().catch(() => ({}));
  if (!/^\d+$/.test(String(waba || ""))) return new Response("Falta waba", { status: 400 });
  const version = Deno.env.get("WA_API_VERSION") || "v25.0";
  const url = `https://graph.facebook.com/${version}/${waba}/subscribed_apps`;
  const auth = { authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` };
  const base = `https://graph.facebook.com/${version}/${waba}`;
  if (accion === "plantillas" || accion === "ver_plantillas") {
    const creadas: unknown[] = [];
    if (accion === "plantillas") {
      for (const p of PLANTILLAS.filter((x) => !solo || x.name === solo)) {
        const r = await fetch(`${base}/message_templates`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(p) });
        creadas.push({ nombre: p.name, respuesta: await r.json().catch(() => ({ status: r.status })) });
      }
    }
    const g = await fetch(`${base}/message_templates?fields=name,status,category,language,rejected_reason&limit=50`, { headers: auth });
    return new Response(JSON.stringify({ creadas, plantillas: await g.json().catch(() => ({})) }), { headers: { "content-type": "application/json" } });
  }
  let suscribir: unknown = null;
  if (accion === "suscribir") {
    const r = await fetch(url, { method: "POST", headers: auth });
    suscribir = await r.json().catch(() => ({ status: r.status }));
  }
  const g = await fetch(url, { headers: auth });
  const apps = await g.json().catch(() => ({ status: g.status }));
  return new Response(JSON.stringify({ suscribir, apps }), { headers: { "content-type": "application/json" } });
}

// Plantillas de utilidad que el asistente usa para escribir primero (deben estar aprobadas por Meta).
const PLANTILLAS = [
  {
    name: "recordatorio_cita", language: "es", category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, te recordamos tu cita con {{2}} el {{3}} a las {{4}}. Lugar: {{5}}. ¿Nos confirmas tu asistencia?",
        example: { body_text: [["María", "Dr. Luis Espinoza", "martes 11 de noviembre", "10:00 a. m.", "Clínica Sonrisa, Barrio El Centro, San Pedro Sula"]] },
      },
      { type: "FOOTER", text: "Aidú Med · Asistente de citas" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmo" }, { type: "QUICK_REPLY", text: "Cambiar fecha" }, { type: "QUICK_REPLY", text: "Cancelar cita" }] },
    ],
  },
  {
    name: "cita_cancelada_consultorio", language: "es", category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, el consultorio de {{2}} tuvo que cancelar tu cita del {{3}} a las {{4}}. Lamentamos el inconveniente. ¿Quieres elegir otra fecha?",
        example: { body_text: [["María", "Dr. Luis Espinoza", "martes 11 de noviembre", "10:00 a. m."]] },
      },
      { type: "FOOTER", text: "Aidú Med · Asistente de citas" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Elegir otra fecha" }] },
    ],
  },
  {
    name: "turno_listo", language: "es", category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, {{2}} ya puede atenderte. Por favor, dirígete a: *{{3}}*. ¡Te esperamos!",
        example: { body_text: [["María", "el Dr. Luis Espinoza", "Consultorio 204"]] },
      },
      { type: "FOOTER", text: "Aidú Med · Asistente de citas" },
    ],
  },
];
