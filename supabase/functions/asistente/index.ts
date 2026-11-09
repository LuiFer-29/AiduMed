// Aidú Med · Asistente de citas por WhatsApp.
//  GET  /asistente            → verificación del webhook de Meta
//  POST /asistente            → mensajes de WhatsApp (firma de Meta obligatoria)
//  POST /asistente/simular    → simulador del panel de administración (sesión de administrador)
import { createClient } from "npm:@supabase/supabase-js@2";
import { crearAvisos } from "./correo.ts";
import { crearAlmacen } from "./datos.ts";
import { atender, type Salida } from "./flujo.ts";
import { crearCerebro } from "./ia.ts";
import { cargaUtil, enviar, firmaValida, leerNotificacion, marcarLeido } from "./whatsapp.ts";

const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; } })();
const sb = createClient(Deno.env.get("SUPABASE_URL")!, claveServicio, { auth: { persistSession: false } });
const almacen = crearAlmacen(sb);
const cerebro = crearCerebro(Deno.env.get("ANTHROPIC_API_KEY"));

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
      for (const s of salidas) {
        const carga = cargaUtil(m.telefono, s);
        const id = await enviar(m.telefono, carga);
        await almacen.registrar(m.telefono, "saliente", carga, id);
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
