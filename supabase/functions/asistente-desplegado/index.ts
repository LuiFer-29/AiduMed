// ARCHIVO GENERADO: no editar. Fuente en supabase/functions/asistente/. Generar con: npx esbuild index.ts --bundle --format=esm --platform=neutral --external:'npm:*'

// index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// correo.ts
import nodemailer from "npm:nodemailer@6.9.16";

// tiempo.ts
var OFFSET = "-06:00";
var DIAS = ["Domingo", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1bado"];
var DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b"];
var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
var MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaLocal(d) {
  return new Date(d.getTime() - 6 * 36e5).toISOString().slice(0, 10);
}
function instante(fecha, hhmm) {
  return /* @__PURE__ */ new Date(`${fecha}T${hhmm.slice(0, 5)}:00${OFFSET}`);
}
function minutosLocales(d) {
  const l = new Date(d.getTime() - 6 * 36e5);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
}
function sumarDias(fecha, n) {
  const d = /* @__PURE__ */ new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diaSemana(fecha) {
  return (/* @__PURE__ */ new Date(`${fecha}T12:00:00Z`)).getUTCDay();
}
function nombreDia(fecha) {
  return DIAS[diaSemana(fecha)];
}
function hora12(d) {
  const m = minutosLocales(d);
  const h = Math.floor(m / 60), min = m % 60;
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}
function fechaLarga(fecha) {
  const [, m, d] = fecha.split("-").map(Number);
  return `${nombreDia(fecha)} ${d} de ${MESES[m - 1]}`;
}
function fechaCorta(fecha) {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS_CORTOS[diaSemana(fecha)]} ${d} ${MESES_CORTOS[m - 1]}`;
}
function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = (h + l - 7 * m + 114) % 31 + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// correo.ts
var transporte = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: "luis_espinoza@aidu.pro", pass: Deno.env.get("GMAIL_APP_PASSWORD") }
});
var esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var cuando = (c) => {
  const i = new Date(c.inicio);
  return `${fechaLarga(fechaLocal(i))}, ${hora12(i)}`;
};
var telefonoBonito = (t) => t.startsWith("504") && t.length === 11 ? `+504 ${t.slice(3, 7)}-${t.slice(7)}` : `+${t}`;
function html(titulo, filas, nota) {
  const tabla = filas.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;font-size:14px;color:#4A5A57;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:15px;font-weight:bold;color:#10211F;">${v}</td></tr>`).join("");
  return `<div style="margin:0;padding:24px 12px;background:#F6F7F4;font-family:Arial,Helvetica,sans-serif;color:#10211F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE3E0;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#0B6E5F;padding:22px 28px;"><img src="https://aidumed.app/assets/img/logo-aidu-med-blanco.png" alt="Aid\xFA Med" height="34" style="display:block;height:34px;border:0;"></td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#10211F;">${esc(titulo)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0">${tabla}</table>
      ${nota ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#4A5A57;">${esc(nota)}</p>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr><td style="background:#0B6E5F;border-radius:10px;">
        <a href="https://aidumed.app/mi-perfil" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Ver mis citas</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;"><p style="margin:0;padding-top:16px;border-top:1px solid #DCE3E0;font-size:12px;line-height:1.6;color:#4A5A57;">Aviso autom\xE1tico de su asistente de citas \xB7 Aid\xFA Med</p></td></tr>
  </table>
</div>`;
}
function crearAvisos(prueba) {
  const prefijo = prueba ? "[Prueba] " : "";
  async function enviar2(para, asunto, cuerpo, texto2) {
    if (!para) return;
    try {
      await transporte.sendMail({ from: '"Aid\xFA Med" <hola@aidu.pro>', to: para, subject: prefijo + asunto, html: cuerpo, text: texto2 });
    } catch (e) {
      console.error("Correo", e);
    }
  }
  const datos = (c, tel) => [
    ["Paciente", esc(c.nombre_paciente || "\u2014")],
    ["Servicio", esc(c.servicio)],
    ["WhatsApp", `<a href="https://wa.me/${esc(tel)}" style="color:#0B6E5F;">${esc(telefonoBonito(tel))}</a>`]
  ];
  return {
    async citaNueva(m, c, tel) {
      await enviar2(
        m.correo,
        `Nueva cita: ${c.nombre_paciente || "paciente"} \xB7 ${cuando(c)}`,
        html("Tiene una cita nueva", [["Fecha", esc(cuando(c))], ...datos(c, tel)]),
        `Nueva cita: ${c.nombre_paciente} \xB7 ${cuando(c)} \xB7 ${c.servicio} \xB7 WhatsApp ${telefonoBonito(tel)}`
      );
    },
    async citaCancelada(m, c, tel) {
      await enviar2(
        m.correo,
        `Cita cancelada: ${c.nombre_paciente || "paciente"} \xB7 ${cuando(c)}`,
        html("El paciente cancel\xF3 su cita", [["Era el", esc(cuando(c))], ...datos(c, tel)], "Ese horario ya qued\xF3 libre para otros pacientes."),
        `Cita cancelada: ${c.nombre_paciente} \xB7 ${cuando(c)} \xB7 ${c.servicio}`
      );
    },
    async citaReagendada(m, nueva, anterior, tel) {
      await enviar2(
        m.correo,
        `Cita reagendada: ${nueva.nombre_paciente || "paciente"} \xB7 ${cuando(nueva)}`,
        html("El paciente cambi\xF3 su cita", [["Nueva fecha", esc(cuando(nueva))], ["Antes", `<span style="text-decoration:line-through;font-weight:normal;">${esc(cuando(anterior))}</span>`], ...datos(nueva, tel)]),
        `Cita reagendada: ${nueva.nombre_paciente} \xB7 de ${cuando(anterior)} a ${cuando(nueva)}`
      );
    },
    async prospecto(tel, nombre, mensaje) {
      await enviar2(
        "suscripciones@aidu.pro",
        `M\xE9dico interesado por WhatsApp: ${nombre || telefonoBonito(tel)}`,
        html("Un m\xE9dico escribi\xF3 al asistente", [["Nombre en WhatsApp", esc(nombre || "\u2014")], ["WhatsApp", `<a href="https://wa.me/${esc(tel)}" style="color:#0B6E5F;">${esc(telefonoBonito(tel))}</a>`], ["Mensaje", esc(mensaje)]]),
        `M\xE9dico interesado: ${nombre || ""} ${telefonoBonito(tel)} \u2014 ${mensaje}`
      );
    }
  };
}

// datos.ts
var sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function crearAlmacen(sb2) {
  const falla = (r) => {
    if (r.error) throw r.error;
  };
  return {
    async conversacion(telefono) {
      const r = await sb2.from("conversaciones").select("*").eq("telefono", telefono).maybeSingle();
      falla(r);
      return r.data;
    },
    async guardarConversacion(c) {
      falla(await sb2.from("conversaciones").upsert({ ...c, actualizada_at: (/* @__PURE__ */ new Date()).toISOString() }));
    },
    async medicoPorId(id) {
      const r = await sb2.from("medicos").select("*").eq("id", id).maybeSingle();
      falla(r);
      return r.data;
    },
    async medicoPorCodigo(codigo) {
      const r = await sb2.from("medicos").select("*").ilike("codigo", codigo).maybeSingle();
      falla(r);
      return r.data;
    },
    async buscarMedicos(texto2) {
      const r = await sb2.from("medicos").select("*").in("estado", ["activo", "aprobado"]);
      falla(r);
      const palabras = sinAcentos(texto2).replace(/\b(dr|dra|doctor|doctora|el|la|de|del|con)\b\.?/g, " ").split(/\s+/).filter((p) => p.length >= 3);
      if (!palabras.length) return [];
      return r.data.filter((m) => {
        const t = sinAcentos(`${m.nombre || ""} ${m.consultorio || ""}`);
        return palabras.every((p) => t.includes(p));
      });
    },
    async paciente(telefono) {
      const r = await sb2.from("pacientes").select("*").eq("telefono", telefono).maybeSingle();
      falla(r);
      return r.data;
    },
    async guardarPaciente(telefono, nombre) {
      const r = await sb2.from("pacientes").upsert({ telefono, nombre }, { onConflict: "telefono" }).select().single();
      falla(r);
      return r.data;
    },
    async citasOcupadas(medicoId, desde, hasta) {
      const r = await sb2.from("citas").select("id, inicio, fin").eq("medico_id", medicoId).eq("estado", "confirmada").lt("inicio", hasta.toISOString()).gt("fin", desde.toISOString());
      falla(r);
      return r.data || [];
    },
    async citasFuturas(pacienteId, medicoId, ahora) {
      const r = await sb2.from("citas").select("*").eq("paciente_id", pacienteId).eq("medico_id", medicoId).eq("estado", "confirmada").gt("inicio", ahora.toISOString()).order("inicio");
      falla(r);
      return r.data || [];
    },
    async cita(id) {
      const r = await sb2.from("citas").select("*").eq("id", id).maybeSingle();
      falla(r);
      return r.data;
    },
    async crearCita(c) {
      const r = await sb2.from("citas").insert(c).select().single();
      if (r.error?.code === "23P01") return "ocupado";
      falla(r);
      return r.data;
    },
    async cancelarCita(id, por) {
      falla(await sb2.from("citas").update({ estado: "cancelada", cancelada_por: por, actualizada_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id));
    },
    async confirmarAsistencia(id) {
      falla(await sb2.from("citas").update({ paciente_confirmo_at: (/* @__PURE__ */ new Date()).toISOString(), actualizada_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id));
    },
    async feriados() {
      const r = await sb2.from("feriados").select("nombre, desde, hasta");
      falla(r);
      return r.data || [];
    },
    async guardarProspecto(telefono, nombre, mensaje) {
      falla(await sb2.from("prospectos").insert({ telefono, nombre, mensaje }));
    },
    async registrar(telefono, direccion, contenido, metaId) {
      await sb2.from("mensajes").insert({ telefono, direccion, contenido, meta_id: metaId || null });
    },
    async yaProcesado(metaId) {
      const r = await sb2.from("mensajes").select("id").eq("meta_id", metaId).limit(1);
      return !!r.data?.length;
    }
  };
}

// disponibilidad.ts
var DIAS2 = ["Domingo", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1bado"];
var AVISO_MINIMO_MIN = 60;
function minutos(texto2) {
  if (!texto2) return 0;
  const n = parseInt(String(texto2).replace(/\D/g, ""), 10);
  if (isNaN(n)) return 0;
  return /h/i.test(texto2) && !/min/i.test(texto2) ? n * 60 : n;
}
function diasDeAnticipacion(texto2) {
  if (!texto2) return 30;
  const n = parseInt(texto2, 10) || 1;
  if (/semana/i.test(texto2)) return n * 7;
  if (/mes/i.test(texto2)) return n * 30;
  return 30;
}
function rangosLibres(p, feriados, anio) {
  const r = [];
  const vac = p.vacaciones || [];
  for (const a of [anio, anio + 1]) {
    if (vac.includes("Semana Santa")) {
      const domingo = pascua(a);
      r.push({ desde: sumarDias(domingo, -6), hasta: domingo, nombre: "Semana Santa" });
    }
    if (vac.includes("Navidad y A\xF1o Nuevo")) {
      r.push({ desde: `${a - 1}-12-24`, hasta: `${a}-01-01`, nombre: "Navidad y A\xF1o Nuevo" });
      r.push({ desde: `${a}-12-24`, hasta: `${a + 1}-01-01`, nombre: "Navidad y A\xF1o Nuevo" });
    }
  }
  for (const f of feriados) {
    if (vac.includes(f.nombre || "")) r.push(f);
  }
  for (const o of p.otras_vacaciones || []) r.push({ desde: o.desde, hasta: o.hasta || o.desde, nombre: o.motivo || o.nombre || "vacaciones" });
  return r;
}
function estaLibreElDia(fecha, rangos) {
  return !rangos.some((r) => fecha >= r.desde && fecha <= r.hasta);
}
function horariosDelDia(p, fecha, duracion, ocupado, rangos, ahora) {
  if (!(p.dias_atencion || []).includes(DIAS2[diaSemana(fecha)])) return [];
  if (!estaLibreElDia(fecha, rangos)) return [];
  if (!p.hora_desde || !p.hora_hasta) return [];
  const pausa = minutos(p.tiempo_entre_citas);
  const paso = duracion <= 15 ? 15 : 30;
  const abre = instante(fecha, p.hora_desde), cierra = instante(fecha, p.hora_hasta);
  const minimo = ahora.getTime() + AVISO_MINIMO_MIN * 6e4;
  const citas = ocupado.map((o) => ({ i: new Date(o.inicio).getTime(), f: new Date(o.fin).getTime() }));
  const almuerzo = p.almuerzo_desde && p.almuerzo_hasta ? { i: instante(fecha, p.almuerzo_desde).getTime(), f: instante(fecha, p.almuerzo_hasta).getTime() } : null;
  const libres = [];
  for (let t = abre.getTime(); t + duracion * 6e4 <= cierra.getTime(); t += paso * 6e4) {
    if (t < minimo) continue;
    const fin = t + duracion * 6e4;
    const choca = citas.some((c) => c.i < fin + pausa * 6e4 && c.f + pausa * 6e4 > t);
    const comiendo = almuerzo && almuerzo.i < fin && almuerzo.f > t;
    if (!choca && !comiendo) libres.push(new Date(t));
  }
  return libres;
}
function diasDisponibles(p, duracion, ocupado, feriados, ahora, desdeFecha, maximo = 30) {
  const hoy = fechaLocal(ahora);
  const limite = sumarDias(hoy, diasDeAnticipacion(p.anticipacion));
  const rangos = rangosLibres(p, feriados, Number(hoy.slice(0, 4)));
  const res = [];
  for (let f = desdeFecha && desdeFecha > hoy ? desdeFecha : hoy; f <= limite && res.length < maximo; f = sumarDias(f, 1)) {
    const libres = horariosDelDia(p, f, duracion, ocupado, rangos, ahora);
    if (libres.length) res.push({ fecha: f, libres });
  }
  return res;
}
function motivoSinHorario(p, fecha, feriados, ahora) {
  const hoy = fechaLocal(ahora);
  if (fecha < hoy) return "esa fecha ya pas\xF3";
  if (fecha > sumarDias(hoy, diasDeAnticipacion(p.anticipacion))) return "todav\xEDa no se abre la agenda para esa fecha";
  if (!(p.dias_atencion || []).includes(DIAS2[diaSemana(fecha)])) return `no hay consulta los ${DIAS2[diaSemana(fecha)].toLowerCase()}`;
  const r = rangosLibres(p, feriados, Number(hoy.slice(0, 4))).find((x) => fecha >= x.desde && fecha <= x.hasta);
  if (r) return `el consultorio est\xE1 cerrado por ${r.nombre || "vacaciones"}`;
  return null;
}

// flujo.ts
var corto = (t, n) => t.length > n ? t.slice(0, n - 1).trimEnd() + "\u2026" : t;
var sinAcentos2 = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
var nombreMedico = (m) => [m.titulo, m.nombre].filter(Boolean).join(" ");
var especialidad = (m) => (m.especialidad === "Otra" ? m.especialidad_otra : m.especialidad) || "";
var lempiras = (p) => {
  const n = Number(String(p ?? "").replace(/\D/g, ""));
  return n ? `L ${n.toLocaleString("en-US")}` : "";
};
var limpiarNombre = (t) => t.replace(/[^\p{L}\s'.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60).split(" ").map((p) => p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p).join(" ");
function codigoEnTexto(texto2) {
  const m = texto2.match(/c[oó]digo[:\s#]*([a-z]{2}\d{2})\b/i) || texto2.match(/^\s*([a-z]{2}\d{2})\s*$/i);
  return m ? m[1].toUpperCase() : null;
}
function interpretarSinIA(texto2) {
  const t = sinAcentos2(texto2.toLowerCase());
  if (/\b(soy (medico|doctor|doctora|dr|dra)|para mi consultorio|mi clinica)\b/.test(t)) return { intencion: "soy_medico" };
  if (/cancel/.test(t)) return { intencion: "cancelar" };
  if (/(reagend|cambiar (la|mi) cita|mover (la|mi) cita)/.test(t)) return { intencion: "reagendar" };
  if (/(mis citas|tengo cita|mi cita)/.test(t)) return { intencion: "ver_citas" };
  if (/(cita|agendar|turno|consulta para|reservar)/.test(t)) return { intencion: "agendar" };
  if (/^(hola|buen[oa]s|saludos|hey|que tal)/.test(t)) return { intencion: "saludo" };
  if (/\?|cuanto|donde|horario|atiende|precio/.test(t)) return { intencion: "pregunta" };
  return { intencion: "otro" };
}
var BOTONES_MENU = [
  { id: "menu:agendar", titulo: "Agendar cita" },
  { id: "menu:citas", titulo: "Mis citas" },
  { id: "menu:pregunta", titulo: "Tengo una pregunta" }
];
async function atender(e, d) {
  const { almacen: almacen2 } = d;
  const conv = await almacen2.conversacion(e.telefono) || { telefono: e.telefono, medico_id: null, paso: "inicio", datos: {} };
  conv.ultimo_mensaje_at = d.ahora.toISOString();
  let medico = conv.medico_id ? await almacen2.medicoPorId(conv.medico_id) : null;
  if (medico && !disponible(medico, d)) medico = null;
  const s = new Sesion(e, d, conv, medico);
  let salidas;
  const codigo = e.texto ? codigoEnTexto(e.texto) : null;
  const porCodigo = codigo ? await almacen2.medicoPorCodigo(codigo) : null;
  if (porCodigo && disponible(porCodigo, d)) {
    s.medico = porCodigo;
    s.conv.medico_id = porCodigo.id;
    salidas = await s.saludo();
  } else if (e.id) {
    salidas = await s.porBoton(e.id);
  } else {
    salidas = await s.porTexto((e.texto || "").trim());
  }
  conv.medico_id = s.medico?.id ?? null;
  await almacen2.guardarConversacion(conv);
  return salidas;
}
function disponible(m, d) {
  return m.estado === "activo" || d.permitirAprobados && m.estado === "aprobado";
}
var Sesion = class {
  constructor(e, d, conv, medico) {
    this.e = e;
    this.d = d;
    this.conv = conv;
    this.medico = medico;
  }
  get datos() {
    return this.conv.datos;
  }
  ir(paso, datos) {
    this.conv.paso = paso;
    if (datos) this.conv.datos = datos;
  }
  // ----- Inicio, sin médico elegido -----
  inicio(texto2 = "\xA1Hola! \u{1F44B} Soy el asistente de citas de *Aid\xFA Med*. \xBFEres paciente o m\xE9dico?") {
    this.ir("inicio", {});
    return [{ tipo: "botones", texto: texto2, botones: [{ id: "ini:paciente", titulo: "Soy paciente" }, { id: "ini:medico", titulo: "Soy m\xE9dico" }] }];
  }
  async saludo() {
    const m = this.medico;
    this.ir("menu", {});
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const nombre = (pac?.nombre || (this.e.nombrePerfil ? limpiarNombre(this.e.nombrePerfil) : "")).split(" ")[0];
    const esp = especialidad(m);
    return [{
      tipo: "botones",
      texto: `\xA1Hola${nombre ? `, ${nombre}` : ""}! \u{1F44B} Soy el asistente de citas de *${nombreMedico(m)}*${esp ? ` (${esp})` : ""}.

\xBFEn qu\xE9 te ayudo?`,
      botones: BOTONES_MENU
    }];
  }
  menu(texto2 = "\xBFEn qu\xE9 m\xE1s te ayudo?") {
    this.ir("menu", {});
    return [{ tipo: "botones", texto: texto2, botones: BOTONES_MENU }];
  }
  // ----- Respuestas a botones y listas -----
  async porBoton(id) {
    const [k, v, w] = id.split(":");
    if (k === "ini" && v === "paciente") {
      this.ir("elegir_medico", {});
      return [{ tipo: "texto", texto: "Escribe el *nombre de tu m\xE9dico* o el *c\xF3digo* que te dio el consultorio (por ejemplo: IB24)." }];
    }
    if (k === "ini" && v === "medico") return this.prospecto();
    if (k === "med") {
      const m = await this.d.almacen.medicoPorId(v);
      if (!m || !disponible(m, this.d)) return this.inicio("Ese m\xE9dico ya no est\xE1 disponible. \xBFEres paciente o m\xE9dico?");
      this.medico = m;
      return this.saludo();
    }
    if (k === "rec") return this.respuestaRecordatorio(v, w);
    if (k === "agenda") {
      const m = await this.d.almacen.medicoPorId(v);
      if (!m || !disponible(m, this.d)) return this.inicio();
      this.medico = m;
      return this.iniciarAgenda();
    }
    if (!this.medico) return this.inicio();
    switch (k) {
      case "menu":
        if (v === "agendar") return this.iniciarAgenda();
        if (v === "citas") return this.misCitas();
        if (v === "pregunta") {
          this.ir("consulta", {});
          return [{ tipo: "texto", texto: "Claro, escr\xEDbeme tu pregunta: horarios, precios, ubicaci\xF3n o lo que necesites saber del consultorio." }];
        }
        return this.menu();
      case "srv":
        this.datos.servicio = Number(v);
        return this.mostrarDias();
      case "dia":
        if (v === "mas") return this.mostrarDias(w);
        if (v === "otro") return this.mostrarDias();
        this.datos.dia = v;
        return this.mostrarHoras();
      case "hora":
        if (v === "mas") return this.mostrarHoras({ desde: Number(w) });
        this.datos.hora = new Date(Number(v)).toISOString();
        return this.pedirNombre();
      case "nom":
        if (v === "otro") {
          this.ir("nombre");
          return [{ tipo: "texto", texto: "Escribe el *nombre completo* de la persona que ir\xE1 a la cita." }];
        }
        this.datos.nombre = this.datos.nombreSugerido;
        return this.confirmar();
      case "conf":
        if (v === "si") return this.crear();
        if (v === "hora") return this.mostrarDias();
        return this.menu("Listo, no agend\xE9 nada. \xBFTe ayudo con algo m\xE1s?");
      case "cita":
        return this.accionesCita(v);
      case "acc":
        if (v === "reagendar") return this.reagendar();
        if (v === "cancelar") return this.preguntarCancelar();
        return this.menu();
      case "canc":
        if (v === "si") return this.cancelar();
        return this.menu("Perfecto, tu cita sigue en pie. \xBFTe ayudo con algo m\xE1s?");
      case "cons":
        if (v === "consultorio") return this.contacto();
        if (v === "agendar") return this.iniciarAgenda();
        return this.menu();
    }
    return this.menu();
  }
  // ----- Texto libre -----
  async porTexto(texto2) {
    const paso = this.conv.paso;
    if (!texto2) return this.medico ? this.repetir() : this.inicio();
    if (/^(menu|menú|inicio|volver|empezar)\W*$/i.test(texto2)) return this.medico ? this.menu("\xBFEn qu\xE9 te ayudo?") : this.inicio();
    if (paso === "elegir_medico") return this.buscarMedico(texto2);
    if (paso === "prospecto") return this.guardarProspecto(texto2);
    if (paso === "nombre" && this.medico) {
      const n = limpiarNombre(texto2);
      if (n.length < 3) return [{ tipo: "texto", texto: "\xBFMe escribes el nombre completo, por favor? (nombre y apellido)" }];
      this.datos.nombre = n;
      return this.confirmar();
    }
    const afirma = /^(s[ií]|si,|claro|confirm|ok|dale|listo|correcto|de acuerdo)/i.test(sinAcentos2(texto2.toLowerCase()));
    const niega = /^(no\b|nel|mejor no)/i.test(sinAcentos2(texto2.toLowerCase()));
    if (this.medico && paso === "quien") {
      if (afirma) {
        this.datos.nombre = this.datos.nombreSugerido;
        return this.confirmar();
      }
      if (!niega && limpiarNombre(texto2).split(" ").length >= 2 && !/\d/.test(texto2)) {
        this.datos.nombre = limpiarNombre(texto2);
        return this.confirmar();
      }
      if (niega) {
        this.ir("nombre");
        return [{ tipo: "texto", texto: "Escribe el *nombre completo* de la persona que ir\xE1 a la cita." }];
      }
    }
    if (this.medico && paso === "confirmar" && afirma) return this.crear();
    if (this.medico && paso === "cancelar" && afirma) return this.cancelar();
    if (this.medico && paso === "cancelar" && niega) return this.menu("Perfecto, tu cita sigue en pie. \xBFTe ayudo con algo m\xE1s?");
    const ip = await this.interpretar(texto2);
    if (!this.medico) {
      if (ip.intencion === "soy_medico") return this.prospecto();
      return this.inicio();
    }
    switch (ip.intencion) {
      case "saludo":
        return this.saludo();
      case "agendar":
        return this.iniciarAgenda(ip);
      case "ver_citas":
      case "reagendar":
      case "cancelar":
        return this.misCitas(ip.intencion);
      case "pregunta":
        return this.responder(ip);
      case "soy_medico":
        return this.prospecto();
    }
    if (["servicio", "dia", "hora"].includes(paso) && (ip.fecha || ip.hora || ip.servicio || ip.parte_dia)) {
      return this.iniciarAgenda(ip, true);
    }
    if (paso === "consulta") return this.responder(ip);
    return this.repetir("No te entend\xED bien \u{1F64F}");
  }
  async interpretar(texto2) {
    const opciones = this.opcionesVisibles();
    let ip = null;
    try {
      ip = await this.d.cerebro.interpretar(texto2, {
        medico: this.medico,
        paso: this.conv.paso,
        hoy: fechaLocal(this.d.ahora),
        ahora: this.d.ahora,
        opciones
      });
    } catch (_) {
      ip = null;
    }
    return ip || interpretarSinIA(texto2);
  }
  opcionesVisibles() {
    const m = this.medico;
    if (!m) return [];
    return (m.servicios || []).map((s) => s.nombre);
  }
  /** Vuelve a mostrar lo que se esperaba en el paso actual. */
  async repetir(prefijo) {
    const p = this.conv.paso;
    const pre = prefijo ? [{ tipo: "texto", texto: `${prefijo} Puedes usar las opciones o escribir *men\xFA* para empezar de nuevo.` }] : [];
    if (p === "servicio") return [...pre, ...await this.iniciarAgenda()];
    if (p === "dia") return [...pre, ...await this.mostrarDias()];
    if (p === "hora") return [...pre, ...await this.mostrarHoras()];
    if (p === "confirmar") return [...pre, ...this.confirmar()];
    return [...pre, ...this.menu("\xBFEn qu\xE9 te ayudo?")];
  }
  // ----- Agendar -----
  servicios() {
    return (this.medico?.servicios || []).filter((s) => s && s.nombre);
  }
  servicioElegido() {
    const i = this.datos.servicio;
    return typeof i === "number" ? this.servicios()[i] || null : null;
  }
  async iniciarAgenda(ip, mantener = false) {
    const servicios = this.servicios();
    if (!servicios.length) {
      return [{ tipo: "texto", texto: "Este consultorio todav\xEDa no tiene servicios para agendar por aqu\xED." }, ...this.contacto()];
    }
    if (!mantener || this.datos.servicio == null) {
      const citaId = this.datos.citaId;
      this.conv.datos = citaId ? { citaId, servicio: this.datos.servicio } : {};
    }
    if (ip?.servicio) {
      const buscado = sinAcentos2(ip.servicio.toLowerCase());
      const i = servicios.findIndex((s) => sinAcentos2(s.nombre.toLowerCase()) === buscado) >= 0 ? servicios.findIndex((s) => sinAcentos2(s.nombre.toLowerCase()) === buscado) : servicios.findIndex((s) => sinAcentos2(s.nombre.toLowerCase()).includes(buscado) || buscado.includes(sinAcentos2(s.nombre.toLowerCase())));
      if (i >= 0) this.datos.servicio = i;
    }
    if (servicios.length === 1) this.datos.servicio = 0;
    if (ip?.parte_dia) this.datos.parte = ip.parte_dia;
    if (ip?.hora) this.datos.horaPreferida = ip.hora;
    if (this.datos.servicio == null) {
      this.ir("servicio");
      return [{
        tipo: "lista",
        texto: "\xBFQu\xE9 servicio necesitas?",
        boton: "Ver servicios",
        secciones: [{
          titulo: "Servicios",
          filas: servicios.slice(0, 10).map((s, i) => ({
            id: `srv:${i}`,
            titulo: corto(s.nombre, 24),
            descripcion: corto([s.duracion, lempiras(s.precio)].filter(Boolean).join(" \xB7 "), 72)
          }))
        }]
      }];
    }
    if (ip?.fecha) return this.mostrarDias(void 0, ip.fecha);
    return this.mostrarDias();
  }
  async ocupado() {
    const dias = diasDeAnticipacion(this.medico.anticipacion) + 2;
    const lista = await this.d.almacen.citasOcupadas(this.medico.id, this.d.ahora, new Date(this.d.ahora.getTime() + dias * 864e5));
    return lista.filter((c) => c.id !== this.datos.citaId);
  }
  async mostrarDias(desde, fechaPedida) {
    const m = this.medico, serv = this.servicioElegido();
    if (!serv) return this.iniciarAgenda();
    const dur = minutos(serv.duracion) || 30;
    const [ocupado, feriados] = [await this.ocupado(), await this.d.almacen.feriados()];
    const pre = [];
    if (fechaPedida) {
      const rangos = rangosLibres(m, feriados, Number(fechaPedida.slice(0, 4)));
      const libres = horariosDelDia(m, fechaPedida, dur, ocupado, rangos, this.d.ahora);
      if (libres.length) {
        this.datos.dia = fechaPedida;
        return this.mostrarHoras();
      }
      const motivo = motivoSinHorario(m, fechaPedida, feriados, this.d.ahora) || "ya no quedan espacios libres";
      pre.push({ tipo: "texto", texto: `El ${fechaLarga(fechaPedida).toLowerCase()} ${motivo}. Estos son los pr\xF3ximos d\xEDas con espacio:` });
      desde = fechaPedida > fechaLocal(this.d.ahora) ? fechaPedida : void 0;
    }
    const dias = diasDisponibles(m, dur, ocupado, feriados, this.d.ahora, desde, 10);
    if (!dias.length) {
      this.ir("menu");
      return [...pre, { tipo: "texto", texto: "Por ahora no hay horarios disponibles en las pr\xF3ximas semanas. \u{1F615}" }, ...this.contacto()];
    }
    const filas = dias.slice(0, 9).map((x) => ({
      id: `dia:${x.fecha}`,
      titulo: corto(fechaLarga(x.fecha).replace(/ de (\w{3})\w*$/, " de $1"), 24),
      descripcion: `${x.libres.length} ${x.libres.length === 1 ? "horario" : "horarios"} \xB7 desde ${hora12(x.libres[0])}`
    }));
    if (dias.length > 9) filas.push({ id: `dia:mas:${sumarDias(dias[8].fecha, 1)}`, titulo: "Ver m\xE1s fechas", descripcion: "D\xEDas siguientes" });
    this.ir("dia");
    return [...pre, {
      tipo: "lista",
      texto: `*${serv.nombre}*${serv.duracion ? ` (${serv.duracion})` : ""}
\xBFQu\xE9 d\xEDa te queda mejor?`,
      boton: "Ver d\xEDas",
      secciones: [{ titulo: "D\xEDas disponibles", filas }]
    }];
  }
  async mostrarHoras(op = {}) {
    const m = this.medico, serv = this.servicioElegido(), fecha = this.datos.dia;
    if (!serv || !fecha) return this.mostrarDias();
    const dur = minutos(serv.duracion) || 30;
    const [ocupado, feriados] = [await this.ocupado(), await this.d.almacen.feriados()];
    let libres = horariosDelDia(m, fecha, dur, ocupado, rangosLibres(m, feriados, Number(fecha.slice(0, 4))), this.d.ahora);
    if (!libres.length) {
      return [{ tipo: "texto", texto: "Ese d\xEDa ya se llen\xF3. Elige otro, por favor:" }, ...await this.mostrarDias()];
    }
    const pre = [];
    if (this.datos.horaPreferida) {
      const [h, mi] = String(this.datos.horaPreferida).split(":").map(Number);
      const exacta = libres.find((t) => minutosLocales(t) === h * 60 + (mi || 0));
      delete this.datos.horaPreferida;
      if (exacta) {
        this.datos.hora = exacta.toISOString();
        return this.pedirNombre();
      }
      pre.push({ tipo: "texto", texto: `A esa hora ya no hay espacio el ${fechaLarga(fecha).toLowerCase()}. Estos son los horarios libres:` });
    }
    if (this.datos.parte) {
      const tarde = this.datos.parte === "tarde";
      const filtrados = libres.filter((t) => minutosLocales(t) >= 12 * 60 === tarde);
      delete this.datos.parte;
      if (filtrados.length) libres = filtrados;
      else pre.push({ tipo: "texto", texto: `En la ${tarde ? "tarde" : "ma\xF1ana"} ya no hay espacio ese d\xEDa. Estos son los horarios libres:` });
    }
    const desde = op.desde || 0;
    const pagina = libres.slice(desde, desde + 8);
    const filasM = pagina.filter((t) => minutosLocales(t) < 720).map((t) => ({ id: `hora:${t.getTime()}`, titulo: hora12(t) }));
    const filasT = pagina.filter((t) => minutosLocales(t) >= 720).map((t) => ({ id: `hora:${t.getTime()}`, titulo: hora12(t) }));
    const otras = [];
    if (libres.length > desde + 8) otras.push({ id: `hora:mas:${desde + 8}`, titulo: "Ver m\xE1s horarios" });
    otras.push({ id: "dia:otro", titulo: "Elegir otro d\xEDa" });
    const secciones = [
      ...filasM.length ? [{ titulo: "Ma\xF1ana", filas: filasM }] : [],
      ...filasT.length ? [{ titulo: "Tarde", filas: filasT }] : [],
      { titulo: "Otras opciones", filas: otras }
    ];
    this.ir("hora");
    return [...pre, { tipo: "lista", texto: `*${fechaLarga(fecha)}*
\xBFA qu\xE9 hora?`, boton: "Ver horarios", secciones }];
  }
  async pedirNombre() {
    if (this.datos.citaId) {
      const anterior = await this.d.almacen.cita(this.datos.citaId);
      if (anterior?.nombre_paciente) {
        this.datos.nombre = anterior.nombre_paciente;
        return this.confirmar();
      }
    }
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const sugerido = pac?.nombre || (this.e.nombrePerfil ? limpiarNombre(this.e.nombrePerfil) : "");
    if (sugerido && sugerido.length >= 3) {
      this.datos.nombreSugerido = sugerido;
      this.ir("quien");
      return [{
        tipo: "botones",
        texto: `\xBFLa cita es para *${sugerido}*?`,
        botones: [{ id: "nom:si", titulo: corto(`S\xED, para ${sugerido.split(" ")[0]}`, 20) }, { id: "nom:otro", titulo: "Otra persona" }]
      }];
    }
    this.ir("nombre");
    return [{ tipo: "texto", texto: "\xBFA nombre de qui\xE9n agendo la cita? Escribe *nombre y apellido*." }];
  }
  resumen() {
    const m = this.medico, serv = this.servicioElegido(), inicio = new Date(this.datos.hora);
    return [
      `\u{1F4C5} ${fechaLarga(fechaLocal(inicio))}, ${hora12(inicio)}`,
      `\u{1FA7A} ${serv.nombre}${serv.duracion ? ` (${serv.duracion})` : ""}${lempiras(serv.precio) ? ` \xB7 ${lempiras(serv.precio)}` : ""}`,
      `\u{1F464} ${this.datos.nombre}`,
      `\u{1F468}\u200D\u2695\uFE0F ${nombreMedico(m)}`,
      m.direccion ? `\u{1F4CD} ${[m.consultorio, m.direccion].filter(Boolean).join(", ")}` : ""
    ].filter(Boolean).join("\n");
  }
  confirmar() {
    if (!this.servicioElegido() || !this.datos.hora || !this.datos.nombre) return this.menu();
    this.ir("confirmar");
    const titulo = this.datos.citaId ? "As\xED quedar\xEDa tu cita *reagendada*:" : "Revisa tu cita:";
    return [{
      tipo: "botones",
      texto: `${titulo}

${this.resumen()}`,
      botones: [{ id: "conf:si", titulo: "Confirmar" }, { id: "conf:hora", titulo: "Cambiar horario" }, { id: "conf:no", titulo: "Cancelar" }]
    }];
  }
  async crear() {
    const m = this.medico, serv = this.servicioElegido(), a = this.d.almacen;
    if (!serv || !this.datos.hora || !this.datos.nombre) return this.menu();
    const inicio = new Date(this.datos.hora), dur = minutos(serv.duracion) || 30;
    const fecha = fechaLocal(inicio);
    const libres = horariosDelDia(m, fecha, dur, await this.ocupado(), rangosLibres(m, await a.feriados(), Number(fecha.slice(0, 4))), this.d.ahora);
    if (!libres.some((t) => t.getTime() === inicio.getTime())) {
      this.datos.dia = fecha;
      return [{ tipo: "texto", texto: "Uy, ese horario se acaba de ocupar. Elige otro, por favor:" }, ...await this.mostrarHoras()];
    }
    let pac = await a.paciente(this.e.telefono);
    if (!pac) pac = await a.guardarPaciente(this.e.telefono, this.datos.nombre);
    else if (!pac.nombre) pac = await a.guardarPaciente(this.e.telefono, this.datos.nombre);
    const precio = Number(String(serv.precio ?? "").replace(/\D/g, "")) || null;
    const res = await a.crearCita({
      medico_id: m.id,
      paciente_id: pac.id,
      nombre_paciente: this.datos.nombre,
      servicio: serv.nombre,
      duracion_min: dur,
      precio,
      inicio: inicio.toISOString(),
      fin: new Date(inicio.getTime() + dur * 6e4).toISOString(),
      reagendada_de: this.datos.citaId || null
    });
    if (res === "ocupado") {
      this.datos.dia = fecha;
      return [{ tipo: "texto", texto: "Uy, ese horario se acaba de ocupar. Elige otro, por favor:" }, ...await this.mostrarHoras()];
    }
    const resumen = this.resumen();
    const reagendada = !!this.datos.citaId;
    if (reagendada) {
      const anterior = await a.cita(this.datos.citaId);
      await a.cancelarCita(this.datos.citaId, "paciente");
      if (anterior) await this.d.avisos.citaReagendada(m, res, anterior, this.e.telefono);
    } else {
      await this.d.avisos.citaNueva(m, res, this.e.telefono);
    }
    this.ir("menu", {});
    const mapa = m.ubicacion_gps ? `
\u{1F5FA}\uFE0F ${m.ubicacion_gps}` : "";
    return [{
      tipo: "texto",
      texto: `\u2705 \xA1Listo! Tu cita qued\xF3 ${reagendada ? "reagendada" : "agendada"}:

${resumen}${mapa}

Te enviar\xE9 un recordatorio un d\xEDa antes. Si necesitas cambiarla o cancelarla, escribe *mis citas*.`
    }];
  }
  // ----- Mis citas -----
  async misCitas(intencion) {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const citas = pac ? await this.d.almacen.citasFuturas(pac.id, this.medico.id, this.d.ahora) : [];
    if (!citas.length) {
      return this.menu(`No tienes citas pr\xF3ximas con ${nombreMedico(this.medico)}. \xBFQuieres agendar una?`);
    }
    if (citas.length === 1 && (intencion === "reagendar" || intencion === "cancelar")) {
      this.datos.citaId = citas[0].id;
      return intencion === "reagendar" ? this.reagendar() : this.preguntarCancelar();
    }
    this.ir("mis_citas", {});
    return [{
      tipo: "lista",
      texto: citas.length === 1 ? "Esta es tu pr\xF3xima cita:" : "Estas son tus pr\xF3ximas citas:",
      boton: "Ver citas",
      secciones: [{
        titulo: "Pr\xF3ximas citas",
        filas: citas.slice(0, 10).map((c) => ({
          id: `cita:${c.id}`,
          titulo: corto(`${fechaCorta(fechaLocal(new Date(c.inicio)))} \xB7 ${hora12(new Date(c.inicio))}`, 24),
          descripcion: corto([c.servicio, c.nombre_paciente].filter(Boolean).join(" \xB7 "), 72)
        }))
      }]
    }];
  }
  async citaPropia(id) {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const c = await this.d.almacen.cita(id);
    if (!c || !pac || c.paciente_id !== pac.id || c.estado !== "confirmada" || new Date(c.inicio) < this.d.ahora) return null;
    return c;
  }
  async accionesCita(id) {
    const c = await this.citaPropia(id);
    if (!c) return this.menu("Esa cita ya no est\xE1 disponible. \xBFEn qu\xE9 te ayudo?");
    this.ir("cita", { citaId: c.id });
    const i = new Date(c.inicio);
    return [{
      tipo: "botones",
      texto: `Tu cita:

\u{1F4C5} ${fechaLarga(fechaLocal(i))}, ${hora12(i)}
\u{1FA7A} ${c.servicio}${c.nombre_paciente ? `
\u{1F464} ${c.nombre_paciente}` : ""}

\xBFQu\xE9 quieres hacer?`,
      botones: [{ id: "acc:reagendar", titulo: "Reagendar" }, { id: "acc:cancelar", titulo: "Cancelar cita" }, { id: "acc:volver", titulo: "Volver" }]
    }];
  }
  async reagendar() {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.misCitas();
    const i = this.servicios().findIndex((s) => s.nombre === c.servicio);
    this.conv.datos = { citaId: c.id, servicio: i >= 0 ? i : void 0 };
    if (i < 0) return this.iniciarAgenda(void 0, true);
    return this.mostrarDias();
  }
  async preguntarCancelar() {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.misCitas();
    this.ir("cancelar", { citaId: c.id });
    const i = new Date(c.inicio);
    return [{
      tipo: "botones",
      texto: `\xBFSeguro que quieres cancelar tu cita del *${fechaLarga(fechaLocal(i)).toLowerCase()}, ${hora12(i)}*?`,
      botones: [{ id: "canc:si", titulo: "S\xED, cancelar" }, { id: "canc:no", titulo: "No, mantenerla" }]
    }];
  }
  async cancelar() {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.menu("Esa cita ya no est\xE1 disponible. \xBFEn qu\xE9 te ayudo?");
    await this.d.almacen.cancelarCita(c.id, "paciente");
    await this.d.avisos.citaCancelada(this.medico, c, this.e.telefono);
    return this.menu("Tu cita qued\xF3 *cancelada*. Ya le avis\xE9 al consultorio. \xBFQuieres agendar otra?");
  }
  // ----- Respuesta al recordatorio -----
  async respuestaRecordatorio(accion, citaId) {
    const c = await this.d.almacen.cita(citaId);
    const pac = await this.d.almacen.paciente(this.e.telefono);
    if (!c || !pac || c.paciente_id !== pac.id) return this.medico ? this.menu("No encontr\xE9 esa cita. \xBFEn qu\xE9 te ayudo?") : this.inicio();
    const m = await this.d.almacen.medicoPorId(c.medico_id);
    if (!m) return this.inicio();
    this.medico = m;
    if (c.estado !== "confirmada" || new Date(c.inicio) < this.d.ahora) return this.menu("Esa cita ya no est\xE1 activa. \xBFEn qu\xE9 te ayudo?");
    this.conv.datos = { citaId: c.id };
    if (accion === "cambiar") return this.reagendar();
    if (accion === "cancelar") return this.preguntarCancelar();
    await this.d.almacen.confirmarAsistencia(c.id);
    this.ir("menu", {});
    const i = new Date(c.inicio);
    const lugar = [m.consultorio, m.direccion].filter(Boolean).join(", ");
    return [{
      tipo: "texto",
      texto: `\xA1Gracias por confirmar! \u{1F64C} Te esperamos el *${fechaLarga(fechaLocal(i)).toLowerCase()} a las ${hora12(i)}*.${lugar ? `

\u{1F4CD} ${lugar}` : ""}${m.ubicacion_gps ? `
\u{1F5FA}\uFE0F ${m.ubicacion_gps}` : ""}`
    }];
  }
  // ----- Preguntas -----
  async responder(ip) {
    this.ir("consulta", {});
    const botones = [{ id: "cons:agendar", titulo: "Agendar cita" }, { id: "cons:consultorio", titulo: "Escribir al consultorio" }, { id: "cons:menu", titulo: "Men\xFA" }];
    if (ip.respuesta && ip.puede_responder !== false) {
      return [{ tipo: "botones", texto: ip.respuesta, botones }];
    }
    return [{ tipo: "texto", texto: "Esa pregunta es mejor que te la responda el consultorio directamente." }, ...this.contacto()];
  }
  contacto() {
    const m = this.medico;
    if (!m) return this.inicio();
    const num = (m.derivar_a === "Otro n\xFAmero" ? m.whatsapp_secretaria : m.whatsapp_consultorio) || m.whatsapp_consultorio || "";
    const digitos = num.replace(/\D/g, "");
    const wa = digitos ? `https://wa.me/${digitos.length === 8 ? "504" + digitos : digitos}` : "";
    const lineas = [
      wa ? `\u{1F4AC} WhatsApp del consultorio: ${wa}` : "",
      m.telefono_consultorio ? `\u{1F4DE} Tel\xE9fono: ${m.telefono_consultorio}` : ""
    ].filter(Boolean);
    this.ir("menu", {});
    return [{ tipo: "botones", texto: lineas.length ? `Puedes comunicarte con el consultorio aqu\xED:

${lineas.join("\n")}` : "Por ahora no tengo otro contacto del consultorio.", botones: BOTONES_MENU }];
  }
  // ----- Buscar médico -----
  async buscarMedico(texto2) {
    const lista = (await this.d.almacen.buscarMedicos(texto2)).filter((m) => disponible(m, this.d));
    if (!lista.length) {
      return [{
        tipo: "botones",
        texto: "No encontr\xE9 a ese m\xE9dico en Aid\xFA Med. Revisa el nombre o pide al consultorio su *c\xF3digo* (por ejemplo: IB24) y escr\xEDbelo aqu\xED.",
        botones: [{ id: "ini:medico", titulo: "Soy m\xE9dico" }]
      }];
    }
    if (lista.length === 1) {
      this.medico = lista[0];
      return this.saludo();
    }
    return [{
      tipo: "lista",
      texto: "Encontr\xE9 estos m\xE9dicos. \xBFCu\xE1l es el tuyo?",
      boton: "Ver m\xE9dicos",
      secciones: [{
        titulo: "M\xE9dicos",
        filas: lista.slice(0, 10).map((m) => ({
          id: `med:${m.id}`,
          titulo: corto(nombreMedico(m), 24),
          descripcion: corto([especialidad(m), m.consultorio].filter(Boolean).join(" \xB7 "), 72)
        }))
      }]
    }];
  }
  // ----- Médicos interesados -----
  prospecto() {
    this.medico = null;
    this.ir("prospecto", {});
    return [{
      tipo: "texto",
      texto: "\xA1Qu\xE9 gusto! \u{1F60A} *Aid\xFA Med* atiende el WhatsApp de su consultorio 24/7: muestra sus horarios libres, agenda las citas y env\xEDa recordatorios.\n\nPuede ver los planes y registrarse aqu\xED: https://aidumed.app\n\nSi prefiere que le contactemos, escr\xEDbame su *nombre, especialidad y ciudad*."
    }];
  }
  async guardarProspecto(texto2) {
    await this.d.almacen.guardarProspecto(this.e.telefono, this.e.nombrePerfil || null, texto2);
    await this.d.avisos.prospecto(this.e.telefono, this.e.nombrePerfil, texto2);
    this.ir("inicio", {});
    return [{ tipo: "texto", texto: "\xA1Gracias! El equipo de Aid\xFA Med le escribir\xE1 muy pronto por este medio. \u{1F64C}" }];
  }
};

// ia.ts
var MODELO = "claude-haiku-5-5";
var HERRAMIENTA = {
  name: "interpretar",
  description: "Registra qu\xE9 quiere el paciente y, si es una pregunta, la respuesta.",
  input_schema: {
    type: "object",
    properties: {
      intencion: {
        type: "string",
        enum: ["agendar", "ver_citas", "reagendar", "cancelar", "pregunta", "saludo", "soy_medico", "otro"],
        description: "agendar: quiere una cita nueva o dice d\xEDa/hora/servicio. ver_citas: quiere ver sus citas. reagendar: cambiar una cita. cancelar: cancelar una cita. pregunta: pregunta informaci\xF3n. saludo: solo saluda. soy_medico: es un m\xE9dico interesado en contratar Aid\xFA Med. otro: nada de lo anterior."
      },
      servicio: { type: "string", description: "Nombre EXACTO de uno de los servicios del consultorio, si lo menciona." },
      fecha: { type: "string", description: "Fecha que pide, en formato YYYY-MM-DD (siempre hoy o en el futuro)." },
      parte_dia: { type: "string", enum: ["manana", "tarde"], description: "Si prefiere ma\xF1ana (antes de 12:00) o tarde." },
      hora: { type: "string", description: "Hora exacta que pide, formato 24 h HH:MM." },
      nombre: { type: "string", description: "Nombre de la persona para la cita, si lo dice." },
      puede_responder: { type: "boolean", description: "true si la pregunta se responde con los datos del consultorio o es m\xE9dica/emergencia (respuesta prudente)." },
      respuesta: { type: "string", description: "Solo si intencion es pregunta: respuesta breve (m\xE1ximo 3 oraciones), tuteando, sin inventar datos." }
    },
    required: ["intencion"]
  }
};
function contexto(ctx) {
  const m = ctx.medico;
  const manana = sumarDias(ctx.hoy, 1);
  const base = [
    `Hoy es ${fechaLarga(ctx.hoy).toLowerCase()} (${ctx.hoy}), son las ${hora12(ctx.ahora)} en Honduras. Ma\xF1ana es ${manana}.`
  ];
  if (!m) return base.join("\n") + "\nTodav\xEDa no se sabe con qu\xE9 m\xE9dico quiere la cita.";
  const servicios = (m.servicios || []).map((s) => `- ${s.nombre}: ${s.duracion || ""}${s.precio ? `, L ${Number(String(s.precio).replace(/\D/g, "")).toLocaleString("en-US")}` : ", precio no publicado"}`).join("\n");
  const otras = (m.otras_vacaciones || []).map((r) => `${r.desde} a ${r.hasta}${r.motivo ? ` (${r.motivo})` : ""}`).join("; ");
  return [
    ...base,
    `Consultorio de ${[m.titulo, m.nombre].filter(Boolean).join(" ")}, ${m.especialidad === "Otra" ? m.especialidad_otra : m.especialidad}.`,
    `Nombre del consultorio: ${m.consultorio || "\u2014"}. Direcci\xF3n: ${m.direccion || "\u2014"}.${m.ubicacion_gps ? ` Mapa: ${m.ubicacion_gps}.` : ""}`,
    `D\xEDas de consulta: ${(m.dias_atencion || []).join(", ") || "\u2014"}. Horario: ${m.hora_desde?.slice(0, 5) || "?"} a ${m.hora_hasta?.slice(0, 5) || "?"}.`,
    `Servicios:
${servicios || "- (sin servicios)"}`,
    `Cierra por: ${(m.vacaciones || []).join(", ") || "\u2014"}${otras ? `; adem\xE1s ${otras}` : ""}.`,
    m.descripcion ? `Sobre el m\xE9dico: ${m.descripcion}` : ""
  ].filter(Boolean).join("\n");
}
function crearCerebro(apiKey) {
  return {
    async interpretar(texto2, ctx) {
      if (!apiKey) return null;
      const sistema = [
        "Eres el asistente de citas por WhatsApp de un consultorio m\xE9dico en Honduras (servicio Aid\xFA Med).",
        "Tu \xFAnica tarea es entender el \xFAltimo mensaje del paciente y llamar a la herramienta 'interpretar'.",
        "Reglas:",
        "- Usa solo los datos del consultorio de abajo. Nunca inventes precios, horarios, direcciones ni servicios.",
        "- Si pregunta algo que esos datos responden, intencion 'pregunta', puede_responder true y una respuesta breve y amable, tuteando.",
        "- Si pregunta por disponibilidad de un d\xEDa concreto, intencion 'agendar' con la fecha (el sistema revisa los horarios); no respondas t\xFA si hay espacio.",
        "- Preguntas m\xE9dicas (s\xEDntomas, medicamentos, diagn\xF3sticos): no des consejo; responde que lo mejor es agendar una consulta. Si describe una emergencia, indica llamar al 911 o ir a la emergencia m\xE1s cercana. En ambos casos puede_responder true.",
        "- Si no se puede responder con los datos, intencion 'pregunta' y puede_responder false.",
        "- Convierte fechas relativas (ma\xF1ana, el jueves, la otra semana) a YYYY-MM-DD futuras.",
        "- 'servicio' debe ser exactamente uno de los nombres de la lista, o vac\xEDo.",
        "",
        "Datos del consultorio:",
        contexto(ctx),
        "",
        `Paso actual de la conversaci\xF3n: ${ctx.paso}.`
      ].join("\n");
      const ctrl = new AbortController();
      const reloj = setTimeout(() => ctrl.abort(), 9e3);
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: ctrl.signal,
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: MODELO,
            max_tokens: 400,
            system: sistema,
            tools: [HERRAMIENTA],
            tool_choice: { type: "tool", name: "interpretar" },
            messages: [{ role: "user", content: texto2.slice(0, 1e3) }]
          })
        });
        if (!r.ok) {
          console.error("IA", r.status, await r.text());
          return null;
        }
        const j = await r.json();
        const uso = j.content?.find((c) => c.type === "tool_use");
        return uso?.input || null;
      } catch (e) {
        console.error("IA", e);
        return null;
      } finally {
        clearTimeout(reloj);
      }
    }
  };
}

// plantillas.ts
var limpio = (t, n = 60) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n) || "\u2014";
var nombreMedico2 = (m) => [m.titulo, m.nombre].filter(Boolean).join(" ");
var primerNombre = (t) => (t || "").split(" ")[0] || "";
function texto(valor) {
  return { type: "text", text: valor };
}
function respuesta(indice, payload) {
  return { type: "button", sub_type: "quick_reply", index: String(indice), parameters: [{ type: "payload", payload }] };
}
function recordatorio(para, c, m) {
  const i = new Date(c.inicio);
  return {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: {
      name: "recordatorio_cita",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
            texto(limpio(nombreMedico2(m))),
            texto(limpio(fechaLarga(fechaLocal(i)).toLowerCase())),
            texto(limpio(hora12(i))),
            texto(limpio([m.consultorio, m.direccion].filter(Boolean).join(", "), 120))
          ]
        },
        respuesta(0, `rec:si:${c.id}`),
        respuesta(1, `rec:cambiar:${c.id}`),
        respuesta(2, `rec:cancelar:${c.id}`)
      ]
    }
  };
}
function canceladaPorConsultorio(para, c, m) {
  const i = new Date(c.inicio);
  return {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: {
      name: "cita_cancelada_consultorio",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
            texto(limpio(nombreMedico2(m))),
            texto(limpio(fechaLarga(fechaLocal(i)).toLowerCase())),
            texto(limpio(hora12(i)))
          ]
        },
        respuesta(0, `agenda:${m.id}`)
      ]
    }
  };
}

// whatsapp.ts
var VERSION = Deno.env.get("WA_API_VERSION") || "v23.0";
function cargaUtil(para, s) {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to: para };
  if (s.tipo === "texto") return { ...base, type: "text", text: { body: corto(s.texto, 4096), preview_url: true } };
  if (s.tipo === "botones") {
    return {
      ...base,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: corto(s.texto, 1024) },
        action: { buttons: s.botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: corto(b.titulo, 20) } })) }
      }
    };
  }
  let restantes = 10;
  const secciones = s.secciones.map((se) => {
    const filas = se.filas.slice(0, restantes);
    restantes -= filas.length;
    return {
      title: corto(se.titulo, 24),
      rows: filas.map((f) => ({ id: f.id.slice(0, 200), title: corto(f.titulo, 24), ...f.descripcion ? { description: corto(f.descripcion, 72) } : {} }))
    };
  }).filter((se) => se.rows.length);
  return {
    ...base,
    type: "interactive",
    interactive: { type: "list", body: { text: corto(s.texto, 1024) }, action: { button: corto(s.boton, 20), sections: secciones } }
  };
}
async function enviar(para, carga) {
  const r = await fetch(`https://graph.facebook.com/${VERSION}/${Deno.env.get("WA_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` },
    body: JSON.stringify(carga)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("WhatsApp error", r.status, JSON.stringify(j));
    return null;
  }
  return j.messages?.[0]?.id || null;
}
async function marcarLeido(metaId) {
  await fetch(`https://graph.facebook.com/${VERSION}/${Deno.env.get("WA_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: metaId, typing_indicator: { type: "text" } })
  }).catch(() => {
  });
}
function leerNotificacion(cuerpo) {
  const res = [];
  for (const entry of cuerpo?.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      const nombres = {};
      for (const c of v.contacts || []) nombres[c.wa_id] = c.profile?.name;
      for (const m of v.messages || []) {
        const e = { telefono: m.from, nombrePerfil: nombres[m.from], metaId: m.id, crudo: m };
        if (m.type === "text") e.texto = m.text?.body;
        else if (m.type === "interactive") {
          const r = m.interactive?.button_reply || m.interactive?.list_reply;
          e.id = r?.id;
          e.texto = r?.title;
        } else if (m.type === "button") {
          e.id = m.button?.payload;
          e.texto = m.button?.text;
        } else {
          e.texto = "";
        }
        res.push(e);
      }
    }
  }
  return res;
}
async function firmaValida(cuerpo, firma, secreto) {
  if (!firma || !secreto) return false;
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo)));
  const esperado = "sha256=" + Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (esperado.length !== firma.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0;
}

// index.ts
var claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
  try {
    return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
  } catch {
    return "";
  }
})();
var sb = createClient(Deno.env.get("SUPABASE_URL"), claveServicio, { auth: { persistSession: false } });
var almacen = crearAlmacen(sb);
var cerebro = crearCerebro(Deno.env.get("ANTHROPIC_API_KEY"));
var ORIGENES = ["https://aidumed.app", "https://www.aidumed.app", "https://aidumed.netlify.app"];
function cors(req) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
var json = (req, cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { ...cors(req), "content-type": "application/json" } });
Deno.serve(async (req) => {
  const ruta = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method === "GET") {
    const p = new URL(req.url).searchParams;
    if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === Deno.env.get("WA_VERIFY_TOKEN")) {
      return new Response(p.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("No autorizado", { status: 403 });
  }
  if (req.method === "POST" && ruta === "simular") return simular(req);
  if (req.method === "POST" && (ruta === "recordatorios" || ruta === "evento")) {
    if (req.headers.get("x-aviso-secreto") !== Deno.env.get("AVISO_SECRETO")) return new Response("No autorizado", { status: 401 });
    return ruta === "recordatorios" ? recordatorios() : evento(req);
  }
  if (req.method === "POST") return webhook(req);
  return new Response("M\xE9todo no permitido", { status: 405 });
});
async function webhook(req) {
  const crudo = await req.text();
  if (!await firmaValida(crudo, req.headers.get("x-hub-signature-256"), Deno.env.get("WA_APP_SECRET"))) {
    return new Response("Firma inv\xE1lida", { status: 401 });
  }
  let cuerpo;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response("ok");
  }
  const avisos = crearAvisos(false);
  for (const m of leerNotificacion(cuerpo)) {
    try {
      if (await almacen.yaProcesado(m.metaId)) continue;
      await almacen.registrar(m.telefono, "entrante", m.crudo, m.metaId);
      marcarLeido(m.metaId);
      const salidas = await atender(m, { almacen, avisos, cerebro, ahora: /* @__PURE__ */ new Date() });
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
async function simular(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await sb.auth.getUser(token);
  if (u.error || !u.data.user) return json(req, { error: "Inicie sesi\xF3n de nuevo." }, 401);
  const admin = await sb.from("admins").select("user_id").eq("user_id", u.data.user.id).maybeSingle();
  if (!admin.data) return json(req, { error: "Solo administradores." }, 403);
  const telefono = `sim${u.data.user.id.replace(/-/g, "").slice(0, 10)}`;
  let cuerpo = {};
  try {
    cuerpo = await req.json();
  } catch {
  }
  if (cuerpo.reiniciar) {
    await sb.from("conversaciones").delete().eq("telefono", telefono);
    await sb.from("pacientes").delete().eq("telefono", telefono);
    return json(req, { ok: true });
  }
  const e = { telefono, nombrePerfil: cuerpo.nombrePerfil || "Paciente de prueba", texto: cuerpo.texto, id: cuerpo.id };
  await almacen.registrar(telefono, "entrante", { texto: e.texto, id: e.id }, null);
  const salidas = await atender(e, { almacen, avisos: crearAvisos(true), cerebro, ahora: /* @__PURE__ */ new Date(), permitirAprobados: true });
  for (const s of salidas) await almacen.registrar(telefono, "saliente", s, null);
  return json(req, { salidas, ia: !!Deno.env.get("ANTHROPIC_API_KEY") });
}
var whatsappListo = () => !!(Deno.env.get("WA_TOKEN") && Deno.env.get("WA_PHONE_ID"));
var esSimulado = (tel) => tel.startsWith("sim");
async function recordatorios() {
  const ahora = Date.now();
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("estado", "confirmada").is("recordatorio_at", null).gte("inicio", new Date(ahora + 20 * 36e5).toISOString()).lte("inicio", new Date(ahora + 26 * 36e5).toISOString());
  if (r.error) return new Response(r.error.message, { status: 500 });
  let enviados = 0, pendientes = 0;
  for (const fila of r.data || []) {
    const tel = fila.pacientes?.telefono;
    if (!tel || esSimulado(tel)) continue;
    if (!whatsappListo()) {
      pendientes++;
      continue;
    }
    const carga = recordatorio(tel, fila, fila.medicos);
    const id = await enviar(tel, carga);
    await almacen.registrar(tel, "saliente", carga, id);
    if (id) {
      enviados++;
      await sb.from("citas").update({ recordatorio_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", fila.id);
    }
  }
  return new Response(JSON.stringify({ enviados, pendientes }), { headers: { "content-type": "application/json" } });
}
async function evento(req) {
  const { tipo, cita_id } = await req.json().catch(() => ({}));
  if (tipo !== "cancelada_consultorio" || !cita_id) return new Response("Sin acci\xF3n");
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("id", cita_id).maybeSingle();
  const tel = r.data?.pacientes?.telefono;
  if (!r.data || !tel || esSimulado(tel) || !whatsappListo()) return new Response("Sin env\xEDo");
  const carga = canceladaPorConsultorio(tel, r.data, r.data.medicos);
  const id = await enviar(tel, carga);
  await almacen.registrar(tel, "saliente", carga, id);
  return new Response(id ? "Enviado" : "Error al enviar");
}
