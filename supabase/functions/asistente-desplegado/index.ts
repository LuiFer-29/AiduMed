// ARCHIVO GENERADO: no editar a mano. Fuente en supabase/functions/asistente/ (se empaqueta con esbuild).

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
function html(titulo, filas, nota, boton = ["Ver mis citas", "https://aidumed.app/mi-perfil"], pie = "Aviso autom\xE1tico de su asistente de citas \xB7 Aid\xFA Med") {
  const tabla = filas.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;font-size:14px;color:#4A5A57;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:15px;font-weight:bold;color:#10211F;">${v}</td></tr>`).join("");
  return `<div style="margin:0;padding:24px 12px;background:#F6F7F4;font-family:Arial,Helvetica,sans-serif;color:#10211F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE3E0;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#0B6E5F;padding:22px 28px;"><img src="https://aidumed.app/assets/img/logo-aidu-med-blanco.png" alt="Aid\xFA Med" height="34" style="display:block;height:34px;border:0;"></td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#10211F;">${esc(titulo)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0">${tabla}</table>
      ${nota ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#4A5A57;">${esc(nota)}</p>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr><td style="background:#0B6E5F;border-radius:10px;">
        <a href="${boton[1]}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">${esc(boton[0])}</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;"><p style="margin:0;padding-top:16px;border-top:1px solid #DCE3E0;font-size:12px;line-height:1.6;color:#4A5A57;">${esc(pie)}</p></td></tr>
  </table>
</div>`;
}
async function avisarFotoPendiente(m, urlFoto) {
  const nombre = [m.titulo, m.nombre].filter(Boolean).join(" ") || m.correo || "Un m\xE9dico";
  try {
    const r = await transporte.sendMail({
      from: '"Aid\xFA Med" <hola@aidu.pro>',
      to: "suscripciones@aidu.pro",
      subject: `Foto nueva por aprobar: ${nombre}`,
      html: html(
        "Foto de perfil por aprobar",
        [
          ["M\xE9dico", esc(nombre)],
          ["Correo", esc(m.correo || "\u2014")],
          ["Foto nueva", `<img src="${esc(urlFoto)}" alt="" width="160" style="display:block;width:160px;height:160px;object-fit:cover;border-radius:999px;border:1px solid #DCE3E0;">`]
        ],
        "La foto no se muestra hasta que usted la apruebe en el panel de administraci\xF3n.",
        ["Revisar en el panel", "https://aidumed.app/admin?fotos=1"],
        "Aviso interno \xB7 Aid\xFA Med"
      ),
      text: `Foto nueva por aprobar: ${nombre}. Rev\xEDsela en https://aidumed.app/admin?fotos=1`
    });
    console.log(`Correo enviado: foto por aprobar \u2192 suscripciones@aidu.pro (${r.response || r.messageId})`);
  } catch (e) {
    console.error("Correo", e);
  }
}
function crearAvisos(prueba) {
  const prefijo = prueba ? "[Prueba] " : "";
  async function enviar2(para, asunto, cuerpo, texto2) {
    if (!para) return;
    try {
      const r = await transporte.sendMail({ from: '"Aid\xFA Med" <hola@aidu.pro>', to: para, subject: prefijo + asunto, html: cuerpo, text: texto2 });
      console.log(`Correo enviado: "${prefijo + asunto}" \u2192 ${para} (${r.response || r.messageId})`);
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
    async historial(pacienteId) {
      const r = await sb2.from("citas").select("medico_id, inicio, estado").eq("paciente_id", pacienteId).order("inicio", { ascending: false }).limit(50);
      falla(r);
      return r.data || [];
    },
    async citasFuturasTodas(pacienteId, ahora) {
      const r = await sb2.from("citas").select("*").eq("paciente_id", pacienteId).eq("estado", "confirmada").gt("inicio", ahora.toISOString()).order("inicio").limit(10);
      falla(r);
      return r.data || [];
    },
    async medicosDisponibles() {
      const r = await sb2.from("medicos").select("*").in("estado", ["activo", "aprobado"]);
      falla(r);
      return r.data || [];
    },
    async guardarSolicitud(telefono, especialidad2) {
      await sb2.from("solicitudes_pacientes").insert({ telefono, especialidad: especialidad2 });
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
  const fijado = (nombre, a) => feriados.filter((f) => f.nombre === nombre && Number(f.desde.slice(0, 4)) === a);
  for (const a of [anio - 1, anio, anio + 1]) {
    if (vac.includes("Semana Santa")) {
      const f = fijado("Semana Santa", a);
      if (f.length) r.push(...f);
      else {
        const domingo = pascua(a);
        r.push({ desde: sumarDias(domingo, -6), hasta: domingo, nombre: "Semana Santa" });
      }
    }
    if (vac.includes("Navidad y A\xF1o Nuevo")) {
      const f = fijado("Navidad y A\xF1o Nuevo", a);
      if (f.length) r.push(...f);
      else r.push({ desde: `${a}-12-24`, hasta: `${a + 1}-01-01`, nombre: "Navidad y A\xF1o Nuevo" });
    }
  }
  for (const f of feriados) {
    if (f.nombre === "Semana Santa" || f.nombre === "Navidad y A\xF1o Nuevo") continue;
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
  const minimo = ahora.getTime() + (p.aviso_minimo_min || AVISO_MINIMO_MIN) * 6e4;
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

// especialidades.ts
var ESPECIALIDADES = [
  { nombre: "Medicina general", plural: "m\xE9dicos generales", raices: ["medicina general", "medico general", "doctor general", "general", "chequeo", "consulta general", "medico familiar", "medicina familiar"] },
  { nombre: "Odontolog\xEDa", plural: "dentistas", raices: ["odonto", "dentist", "dental", "muela", "diente", "ortodon", "brackets", "frenos"] },
  { nombre: "Pediatr\xEDa", plural: "pediatras", raices: ["pediatr", "ni\xF1o", "nino", "ni\xF1a", "nina", "bebe", "beb\xE9", "infantil", "hijo", "hija"] },
  { nombre: "Ortopedia", plural: "ortopedistas", raices: ["ortoped", "traumatolog", "hueso", "fractura", "rodilla", "columna"] },
  { nombre: "Nefrolog\xEDa", plural: "nefr\xF3logos", raices: ["nefrolog", "ri\xF1on", "rinon", "renal"] },
  { nombre: "Ginecolog\xEDa", plural: "ginec\xF3logos", raices: ["ginecolog", "gineco", "obstetr", "embaraz", "prenatal"] },
  { nombre: "Dermatolog\xEDa", plural: "dermat\xF3logos", raices: ["dermatolog", "piel", "acne", "acn\xE9", "manchas"] },
  { nombre: "Cardiolog\xEDa", plural: "cardi\xF3logos", raices: ["cardiolog", "corazon", "coraz\xF3n", "presion alta", "hipertens"] },
  { nombre: "Oftalmolog\xEDa", plural: "oftalm\xF3logos", raices: ["oftalmolog", "ojo", "vista", "lentes", "optometr"] },
  { nombre: "Otorrinolaringolog\xEDa", plural: "otorrinos", raices: ["otorrin", "oido", "o\xEDdo", "garganta", "nariz"] },
  { nombre: "Psicolog\xEDa", plural: "psic\xF3logos", raices: ["psicolog", "sicolog", "terapia", "ansiedad", "depresion", "depresi\xF3n"] },
  { nombre: "Psiquiatr\xEDa", plural: "psiquiatras", raices: ["psiquiatr", "siquiatr"] },
  { nombre: "Nutrici\xF3n", plural: "nutricionistas", raices: ["nutri", "dieta", "bajar de peso"] },
  { nombre: "Medicina interna", plural: "internistas", raices: ["internist", "medicina interna"] },
  { nombre: "Endocrinolog\xEDa", plural: "endocrin\xF3logos", raices: ["endocrin", "tiroides", "diabet"] },
  { nombre: "Gastroenterolog\xEDa", plural: "gastroenter\xF3logos", raices: ["gastro", "estomago", "est\xF3mago", "colitis", "gastritis"] },
  { nombre: "Neurolog\xEDa", plural: "neur\xF3logos", raices: ["neurolog", "migra\xF1a", "migrana", "convulsion"] },
  { nombre: "Urolog\xEDa", plural: "ur\xF3logos", raices: ["urolog", "prostata", "pr\xF3stata"] },
  { nombre: "Neumolog\xEDa", plural: "neum\xF3logos", raices: ["neumolog", "pulmon", "pulm\xF3n", "asma"] },
  { nombre: "Fisioterapia", plural: "fisioterapeutas", raices: ["fisioter", "terapia fisica", "rehabilitacion", "rehabilitaci\xF3n"] },
  { nombre: "Cirug\xEDa general", plural: "cirujanos", raices: ["cirujan", "cirugia", "cirug\xEDa"] },
  { nombre: "Oncolog\xEDa", plural: "onc\xF3logos", raices: ["oncolog", "cancer", "c\xE1ncer"] },
  { nombre: "Reumatolog\xEDa", plural: "reumat\xF3logos", raices: ["reumatolog", "artritis"] },
  { nombre: "Alergolog\xEDa", plural: "alerg\xF3logos", raices: ["alergolog", "alergia"] }
];
var normal = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function especialidadEnTexto(texto2) {
  const t = ` ${normal(texto2).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ")} `;
  let mejor = null;
  for (const e of ESPECIALIDADES) {
    for (const r of [normal(e.nombre), ...e.raices.map(normal)]) {
      if (t.includes(` ${r}`)) {
        if (!mejor || r.length > mejor.largo) mejor = { e, largo: r.length };
      }
    }
  }
  return mejor ? mejor.e : null;
}
function esDeEspecialidad(m, e) {
  const suya = m.especialidad === "Otra" ? m.especialidad_otra || "" : m.especialidad || "";
  if (!suya) return false;
  if (normal(suya) === normal(e.nombre)) return true;
  const reconocida = especialidadEnTexto(suya);
  return !!reconocida && reconocida.nombre === e.nombre;
}

// flujo.ts
var corto = (t, n) => t.length > n ? t.slice(0, n - 1).trimEnd() + "\u2026" : t;
var sinAcentos2 = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
var nombreMedico = (m) => [m.titulo, m.nombre].filter(Boolean).join(" ");
var lugarMedico = (m) => [[m.numero_consultorio ? `Consultorio ${m.numero_consultorio}` : "", m.consultorio].filter(Boolean).join(" \xB7 "), m.direccion].filter(Boolean).join(", ");
var articulo = (m) => m.titulo === "Dra." ? "la " : m.titulo === "Dr." ? "el " : "";
var conArticuloNegrita = (m) => `${articulo(m)}*${nombreMedico(m)}*`;
function botonMismoMedico(m) {
  const p = (m.nombre || "").trim().split(/\s+/);
  const apellido = p.length === 2 ? p[1] : p.length === 4 ? p[2] : "";
  const t = apellido ? `Cita ${m.titulo ? m.titulo + " " : ""}${apellido}` : "";
  return t && t.length <= 20 ? t : "Cita con mi m\xE9dico";
}
var especialidad = (m) => (m.especialidad === "Otra" ? m.especialidad_otra : m.especialidad) || "";
var lempiras = (p) => {
  const n = Number(String(p ?? "").replace(/\D/g, ""));
  return n ? `L ${n.toLocaleString("en-US")}` : "";
};
var limpiarNombre = (t) => t.replace(/[^\p{L}\s'.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60).split(" ").map((p) => p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p).join(" ");
function medicoEnTexto(texto2) {
  const m = texto2.match(/cita con (?:el |la )?(?:dra?|doctora?)\.?\s+([\p{L}][\p{L} .'-]{2,60}?)[\s.!¡]*$/iu);
  return m ? m[1].trim() : null;
}
var INVISIBLES = ["\u200B", "\u200C", "\u200D", "\u2060"];
var ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function codigoInvisible(texto2) {
  const marcas = [...texto2].filter((c) => INVISIBLES.includes(c)).map((c) => INVISIBLES.indexOf(c));
  if (marcas.length < 12 || marcas.length % 3) return null;
  let codigo = "";
  for (let i = 0; i < marcas.length; i += 3) {
    const n = marcas[i] * 16 + marcas[i + 1] * 4 + marcas[i + 2];
    if (n >= ALFABETO.length) return null;
    codigo += ALFABETO[n];
  }
  return /^[A-Z]{2}\d{2}$/.test(codigo) ? codigo : null;
}
var quitarInvisibles = (t) => [...t].filter((c) => !INVISIBLES.includes(c)).join("");
function codigoEnTexto(texto2) {
  const oculto = codigoInvisible(texto2);
  if (oculto) return oculto;
  texto2 = quitarInvisibles(texto2);
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
  const anterior = conv.ultimo_mensaje_at ? Date.parse(conv.ultimo_mensaje_at) : 0;
  conv.ultimo_mensaje_at = d.ahora.toISOString();
  let medico = conv.medico_id ? await almacen2.medicoPorId(conv.medico_id) : null;
  if (medico && !disponible(medico, d)) medico = null;
  const s = new Sesion(e, d, conv, medico);
  let salidas;
  const codigo = e.texto ? codigoEnTexto(e.texto) : null;
  const porCodigo = codigo ? await almacen2.medicoPorCodigo(codigo) : null;
  const nombre = !porCodigo && e.texto ? medicoEnTexto(quitarInvisibles(e.texto)) : null;
  const porNombre = nombre ? (await almacen2.buscarMedicos(nombre)).filter((m) => disponible(m, d)) : [];
  const exactos = porNombre.filter((m) => sinAcentos2((m.nombre || "").toLowerCase()) === sinAcentos2(nombre.toLowerCase()));
  if (porCodigo && disponible(porCodigo, d)) {
    s.medico = porCodigo;
    s.conv.medico_id = porCodigo.id;
    salidas = await s.saludo();
  } else if (exactos.length === 1 || porNombre.length === 1) {
    s.medico = exactos.length === 1 ? exactos[0] : porNombre[0];
    salidas = await s.saludo();
  } else if (porNombre.length > 1) {
    salidas = await s.buscarMedico(nombre);
  } else if (e.id) {
    salidas = await s.porBoton(e.id);
  } else if (esRegreso(conv, anterior, d.ahora)) {
    salidas = await s.regreso();
  } else {
    salidas = await s.porTexto(quitarInvisibles(e.texto || "").trim());
  }
  conv.medico_id = s.medico?.id ?? null;
  await almacen2.guardarConversacion(conv);
  return salidas;
}
var PASOS_EN_REPOSO = ["inicio", "menu", "consulta", "mis_citas", "cita", "regreso"];
function esRegreso(conv, anterior, ahora) {
  if (!anterior) return false;
  const min = (ahora.getTime() - anterior) / 6e4;
  return min >= 30 && PASOS_EN_REPOSO.includes(conv.paso) || min >= 180;
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
  // ----- Regreso: ¿con el mismo médico, con otro o gestionar citas? -----
  async regreso() {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const historial = pac ? await this.d.almacen.historial(pac.id) : [];
    const ultimoId = this.conv.medico_id || historial[0]?.medico_id || null;
    let ultimo = ultimoId ? await this.d.almacen.medicoPorId(ultimoId) : null;
    if (ultimo && !disponible(ultimo, this.d)) ultimo = null;
    if (!ultimo) return this.inicio(`\xA1Hola de nuevo! \u{1F44B} Soy el asistente de citas de *Aid\xFA Med*. \xBFEres paciente o m\xE9dico?`);
    this.medico = ultimo;
    this.ir("regreso", {});
    const nombre = (pac?.nombre || (this.e.nombrePerfil ? limpiarNombre(this.e.nombrePerfil) : "")).split(" ")[0];
    const proximas = pac ? await this.d.almacen.citasFuturasTodas(pac.id, this.d.ahora) : [];
    const esp = especialidad(ultimo);
    let contexto2;
    if (proximas.length) {
      const c = proximas[0], i = new Date(c.inicio);
      const mc = c.medico_id === ultimo.id ? ultimo : await this.d.almacen.medicoPorId(c.medico_id);
      contexto2 = `Tienes una cita con ${mc ? conArticuloNegrita(mc) : "tu m\xE9dico"} el *${fechaLarga(fechaLocal(i)).toLowerCase()}* a las *${hora12(i)}*`;
      if (mc && mc.id !== ultimo.id) contexto2 += `
Tu \xFAltimo m\xE9dico consultado fue ${conArticuloNegrita(ultimo)}${esp ? ` (${esp})` : ""}.`;
    } else if (historial.some((h) => h.medico_id === ultimo.id)) {
      contexto2 = `Vemos que tu \xFAltima cita m\xE9dica fue con ${conArticuloNegrita(ultimo)}${esp ? ` (${esp})` : ""}.`;
    } else {
      contexto2 = `Vemos que la \xFAltima vez nos consultaste por ${conArticuloNegrita(ultimo)}${esp ? ` (${esp})` : ""}.`;
    }
    return [{
      tipo: "botones",
      texto: `\xA1Hola de nuevo${nombre ? `, ${nombre}` : ""}! \u{1F44B}

${contexto2}

\xBFCon qu\xE9 te podemos ayudar?`,
      botones: [
        { id: `reg:mismo:${ultimo.id}`, titulo: botonMismoMedico(ultimo) },
        { id: "reg:otro", titulo: "Cita con otro m\xE9dico" },
        { id: "reg:citas", titulo: "Gestionar mis citas" }
      ]
    }];
  }
  pedirEspecialidad(prefijo = "") {
    this.ir("buscar_especialidad", {});
    return [{ tipo: "texto", texto: `${prefijo}\xBFQu\xE9 especialidad o m\xE9dico buscas? Escr\xEDbelo como quieras, por ejemplo: *pediatra*, *dentista*, *ginec\xF3loga* o el *nombre del doctor*.` }];
  }
  /** El paciente escribió una especialidad o un nombre. */
  async buscarEspecialidad(texto2) {
    const e = especialidadEnTexto(texto2);
    if (!e) {
      const porNombre = (await this.d.almacen.buscarMedicos(texto2)).filter((m) => disponible(m, this.d));
      if (porNombre.length) return this.buscarMedico(texto2);
      return [{ tipo: "texto", texto: "No logr\xE9 identificar la especialidad \u{1F64F} Prueba con otra palabra, por ejemplo: *pediatra*, *dentista*, *dermat\xF3logo* o el nombre del doctor." }];
    }
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const historial = pac ? await this.d.almacen.historial(pac.id) : [];
    const vistos = [...new Set(historial.map((h) => h.medico_id))];
    for (const id of vistos) {
      const m = await this.d.almacen.medicoPorId(id);
      if (m && disponible(m, this.d) && esDeEspecialidad(m, e)) {
        this.medico = m;
        this.ir("cabecera", { especialidad: e.nombre });
        return [{
          tipo: "botones",
          texto: `${m.titulo === "Dra." ? "La" : m.titulo === "Dr." ? "El" : ""} *${nombreMedico(m)}* (${e.nombre}) ya te atendi\xF3 antes. \xBFAgendamos con ${m.titulo === "Dra." ? "ella" : "\xE9l"}?`,
          botones: [{ id: `esp:si:${m.id}`, titulo: `S\xED, con ${m.titulo === "Dra." ? "ella" : "\xE9l"}` }, { id: `esp:otros:${ESPECIALIDADES.indexOf(e)}`, titulo: "Ver otros" }]
        }];
      }
    }
    return this.medicosDeEspecialidad(ESPECIALIDADES.indexOf(e));
  }
  async medicosDeEspecialidad(indice) {
    const e = ESPECIALIDADES[indice];
    if (!e) return this.pedirEspecialidad();
    const lista = (await this.d.almacen.medicosDisponibles()).filter((m) => disponible(m, this.d) && esDeEspecialidad(m, e));
    if (!lista.length) {
      this.ir("sin_especialidad", { especialidad: e.nombre });
      return [{
        tipo: "botones",
        texto: `Todav\xEDa no tenemos ${e.plural} en *Aid\xFA Med*, pero estamos sumando m\xE9dicos cada semana \u{1F49A}

\xBFQuieres que te avisemos por aqu\xED cuando se sume uno?`,
        botones: [{ id: `avisar:${indice}`, titulo: "S\xED, av\xEDsame" }, { id: "reg:otro", titulo: "Buscar otra" }]
      }];
    }
    if (lista.length === 1) {
      const m = lista[0];
      this.medico = m;
      this.ir("cabecera", { especialidad: e.nombre });
      return [{
        tipo: "botones",
        texto: `En *Aid\xFA Med* tenemos ${m.titulo === "Dra." ? "a la" : m.titulo === "Dr." ? "al" : "a"} *${nombreMedico(m)}* (${e.nombre})${m.consultorio ? `, en ${m.consultorio}` : ""}. \xBFAgendamos una cita?`,
        botones: [{ id: `esp:si:${m.id}`, titulo: "S\xED, agendar" }, { id: "reg:otro", titulo: "Buscar otra" }]
      }];
    }
    this.ir("elegir_medico", {});
    return [{
      tipo: "lista",
      texto: `Estos son los ${e.plural} de *Aid\xFA Med*. Elige con qui\xE9n quieres tu cita:`,
      boton: "Ver m\xE9dicos",
      secciones: [{
        titulo: corto(e.nombre, 24),
        filas: lista.slice(0, 10).map((m) => ({
          id: `med:${m.id}`,
          titulo: corto(nombreMedico(m), 24),
          descripcion: corto([m.consultorio, m.direccion].filter(Boolean).join(" \xB7 "), 72)
        }))
      }]
    }];
  }
  /** Citas próximas con todos sus médicos. */
  async misCitasTodas() {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const citas = pac ? await this.d.almacen.citasFuturasTodas(pac.id, this.d.ahora) : [];
    if (!citas.length) {
      return [{
        tipo: "botones",
        texto: "No tienes citas pr\xF3ximas. \xBFQuieres agendar una?",
        botones: [...this.medico ? [{ id: `reg:mismo:${this.medico.id}`, titulo: botonMismoMedico(this.medico) }] : [], { id: "reg:otro", titulo: "Cita con otro m\xE9dico" }]
      }];
    }
    const medicos = /* @__PURE__ */ new Map();
    for (const c of citas) if (!medicos.has(c.medico_id)) medicos.set(c.medico_id, await this.d.almacen.medicoPorId(c.medico_id));
    this.ir("mis_citas", {});
    return [{
      tipo: "lista",
      texto: citas.length === 1 ? "Esta es tu pr\xF3xima cita. T\xF3cala para cambiarla o cancelarla:" : "Estas son tus pr\xF3ximas citas. Toca una para cambiarla o cancelarla:",
      boton: "Ver citas",
      secciones: [{
        titulo: "Pr\xF3ximas citas",
        filas: citas.map((c) => {
          const m = medicos.get(c.medico_id);
          return {
            id: `cita:${c.id}`,
            titulo: corto(`${fechaCorta(fechaLocal(new Date(c.inicio)))} \xB7 ${hora12(new Date(c.inicio))}`, 24),
            descripcion: corto([m ? nombreMedico(m) : "", c.servicio, c.nombre_paciente].filter(Boolean).join(" \xB7 "), 72)
          };
        })
      }]
    }];
  }
  // ----- Respuestas a botones y listas -----
  async porBoton(id) {
    const [k, v, w] = id.split(":");
    if (k === "ini" && v === "paciente") return this.pedirEspecialidad();
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
    if (k === "reg") {
      if (v === "otro") return this.pedirEspecialidad();
      if (v === "citas") return this.misCitasTodas();
      if (v === "mismo") {
        const m = await this.d.almacen.medicoPorId(w);
        if (!m || !disponible(m, this.d)) return this.pedirEspecialidad("Ese m\xE9dico ya no est\xE1 disponible en Aid\xFA Med. ");
        this.medico = m;
        return this.iniciarAgenda();
      }
    }
    if (k === "esp") {
      if (v === "otros") return this.medicosDeEspecialidad(Number(w));
      if (v === "si") {
        const m = await this.d.almacen.medicoPorId(w);
        if (!m || !disponible(m, this.d)) return this.pedirEspecialidad("Ese m\xE9dico ya no est\xE1 disponible. ");
        this.medico = m;
        return this.iniciarAgenda();
      }
    }
    if (k === "avisar") {
      const e = ESPECIALIDADES[Number(v)];
      if (e) await this.d.almacen.guardarSolicitud(this.e.telefono, e.nombre);
      this.ir("inicio", {});
      return [{ tipo: "texto", texto: `\xA1Listo! Te escribiremos por aqu\xED en cuanto ${e ? `tengamos ${e.plural}` : "tengamos esa especialidad"} en Aid\xFA Med. \u{1F64C}

Mientras tanto, si necesitas otra especialidad, escr\xEDbela cuando quieras.` }];
    }
    if (k === "cita") return this.accionesCita(v);
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
    if (paso === "buscar_especialidad" || paso === "sin_especialidad") return this.buscarEspecialidad(texto2);
    if (paso === "elegir_medico") return especialidadEnTexto(texto2) ? this.buscarEspecialidad(texto2) : this.buscarMedico(texto2);
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
    if (this.medico && paso === "cabecera" && afirma) return this.iniciarAgenda();
    if (paso === "cabecera" && niega) return this.medicosDeEspecialidad(ESPECIALIDADES.findIndex((x) => x.nombre === this.datos.especialidad));
    if (paso === "cabecera" && especialidadEnTexto(texto2)) return this.buscarEspecialidad(texto2);
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
    const dias = diasDisponibles(m, dur, ocupado, feriados, this.d.ahora, desde, 8);
    if (!dias.length) {
      this.ir("menu");
      return [...pre, { tipo: "texto", texto: "Por ahora no hay horarios disponibles en las pr\xF3ximas semanas. \u{1F615}" }, ...this.contacto()];
    }
    const filas = dias.slice(0, 7).map((x) => ({
      id: `dia:${x.fecha}`,
      titulo: corto(fechaLarga(x.fecha).replace(/ de (\w{3})\w*$/, " de $1"), 24),
      descripcion: `${x.libres.length} ${x.libres.length === 1 ? "horario" : "horarios"} \xB7 desde ${hora12(x.libres[0])}`
    }));
    if (dias.length > 7) filas.push({ id: `dia:mas:${sumarDias(dias[6].fecha, 1)}`, titulo: "Ver m\xE1s fechas", descripcion: "Siguientes d\xEDas con espacio" });
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
      m.direccion || m.consultorio ? `\u{1F4CD} ${lugarMedico(m)}` : ""
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

Te enviar\xE9 un recordatorio el d\xEDa anterior por la tarde. Si necesitas cambiarla o cancelarla, escribe *mis citas*.`
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
    if (!c) return this.medico ? this.menu("Esa cita ya no est\xE1 disponible. \xBFEn qu\xE9 te ayudo?") : this.inicio();
    if (!this.medico || this.medico.id !== c.medico_id) this.medico = await this.d.almacen.medicoPorId(c.medico_id);
    if (!this.medico) return this.inicio();
    this.ir("cita", { citaId: c.id });
    const i = new Date(c.inicio);
    return [{
      tipo: "botones",
      texto: `Tu cita con ${conArticuloNegrita(this.medico)}:

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
      texto: `\xA1Gracias por confirmar! \u{1F64C} Te esperamos el *${fechaLarga(fechaLocal(i)).toLowerCase()} a las ${hora12(i)}*${lugar ? `

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
            texto(limpio(lugarMedico(m), 120))
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
function conArticulo(m) {
  const n = nombreMedico2(m);
  return m.titulo === "Dra." ? `la ${n}` : m.titulo === "Dr." ? `el ${n}` : n;
}
function destino(m) {
  return m.numero_consultorio ? `Consultorio ${m.numero_consultorio}` : m.consultorio || "el consultorio";
}
function turnoListo(para, c, m) {
  return {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: {
      name: "turno_listo",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
          texto(limpio(conArticulo(m))),
          texto(limpio(destino(m), 80))
        ]
      }]
    }
  };
}
function turnoListoTexto(c, m) {
  const quien = conArticulo(m);
  const listo = m.titulo === "Dra." ? "lista" : "listo";
  const nombre = primerNombre(c.nombre_paciente);
  const a = m.numero_consultorio ? `al *Consultorio ${m.numero_consultorio}*` : m.consultorio ? `a *${m.consultorio}*` : "al consultorio";
  return `Hola${nombre ? ` ${nombre}` : ""} \u{1F44B}

${quien.charAt(0).toUpperCase() + quien.slice(1)} est\xE1 ${listo} para atenderte. Por favor, dir\xEDgete ${a}.`;
}

// whatsapp.ts
var VERSION = Deno.env.get("WA_API_VERSION") || "v25.0";
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
  if (req.method === "POST" && ruta === "panel") return panel(req);
  if (req.method === "POST" && (ruta === "recordatorios" || ruta === "evento" || ruta === "meta")) {
    if (req.headers.get("x-aviso-secreto") !== Deno.env.get("AVISO_SECRETO")) return new Response("No autorizado", { status: 401 });
    return ruta === "recordatorios" ? recordatorios() : ruta === "evento" ? evento(req) : meta(req);
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
  const ahora = /* @__PURE__ */ new Date();
  const desde = 17 * 60 + 30;
  if (minutosLocales(ahora) < desde) return new Response(JSON.stringify({ enviados: 0, motivo: "antes de las 5:30 p. m." }), { headers: { "content-type": "application/json" } });
  const hoy = fechaLocal(ahora), manana = sumarDias(hoy, 1);
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("estado", "confirmada").is("recordatorio_at", null).gte("inicio", instante(manana, "00:00").toISOString()).lt("inicio", instante(sumarDias(manana, 1), "00:00").toISOString()).lt("creada_at", instante(hoy, "17:30").toISOString());
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
  const { tipo, cita_id, medico_id } = await req.json().catch(() => ({}));
  if (tipo === "foto_pendiente" && medico_id) {
    const m = await sb.from("medicos").select("*").eq("id", medico_id).maybeSingle();
    if (!m.data?.foto_pendiente_path) return new Response("Sin foto");
    const firmada = await sb.storage.from("fotos").createSignedUrl(m.data.foto_pendiente_path, 7 * 86400);
    await avisarFotoPendiente(m.data, firmada.data?.signedUrl || "");
    return new Response("Avisado");
  }
  if (tipo !== "cancelada_consultorio" || !cita_id) return new Response("Sin acci\xF3n");
  const r = await sb.from("citas").select("*, pacientes(telefono), medicos(*)").eq("id", cita_id).maybeSingle();
  const tel = r.data?.pacientes?.telefono;
  if (!r.data || !tel || esSimulado(tel) || !whatsappListo()) return new Response("Sin env\xEDo");
  const carga = canceladaPorConsultorio(tel, r.data, r.data.medicos);
  const id = await enviar(tel, carga);
  await almacen.registrar(tel, "saliente", carga, id);
  return new Response(id ? "Enviado" : "Error al enviar");
}
async function panel(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await sb.auth.getUser(token);
  if (u.error || !u.data.user) return json(req, { error: "Inicie sesi\xF3n de nuevo." }, 401);
  const uid = u.data.user.id;
  const cuerpo = await req.json().catch(() => ({}));
  const med = await sb.from("medicos").select("*").eq("id", uid).maybeSingle();
  if (!med.data) return json(req, { error: "No encontramos su perfil." }, 404);
  const m = med.data;
  if (cuerpo.accion === "cerrados") {
    const desde = String(cuerpo.desde || ""), hasta = String(cuerpo.hasta || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || hasta < desde) return json(req, { error: "Fechas no v\xE1lidas" }, 400);
    const feriados = await almacen.feriados();
    const rangos = rangosLibres(m, feriados, Number(desde.slice(0, 4)));
    const propias = m.otras_vacaciones || [];
    const dias = [];
    for (let f = desde, n = 0; f <= hasta && n < 120; f = sumarDias(f, 1), n++) {
      const o = propias.find((x) => f >= x.desde && f <= (x.hasta || x.desde));
      const r = rangos.find((x) => f >= x.desde && f <= x.hasta);
      if (!o && !r) continue;
      const motivo = o ? o.motivo : r.nombre;
      const etiqueta = motivo && motivo !== "vacaciones" ? `Sin consulta \xB7 ${motivo}` : "Sin consulta";
      dias.push({ fecha: f, etiqueta });
    }
    return json(req, { dias });
  }
  if (cuerpo.accion === "atender") {
    const r = await sb.from("citas").select("*, pacientes(telefono)").eq("id", String(cuerpo.cita_id || "")).eq("medico_id", uid).maybeSingle();
    if (!r.data) return json(req, { error: "No encontramos esa cita." }, 404);
    if (r.data.estado !== "confirmada") return json(req, { error: "La cita ya no est\xE1 confirmada." }, 400);
    const tel = r.data.pacientes?.telefono;
    const ahora = (/* @__PURE__ */ new Date()).toISOString();
    if (!tel) return json(req, { error: "La cita no tiene n\xFAmero de WhatsApp." }, 400);
    if (esSimulado(tel)) {
      await sb.from("citas").update({ llamado_at: ahora }).eq("id", r.data.id);
      return json(req, { ok: true, via: "prueba", llamado_at: ahora });
    }
    if (!whatsappListo()) return json(req, { error: "WhatsApp no est\xE1 configurado todav\xEDa." }, 503);
    const ult = await sb.from("mensajes").select("creado_at").eq("telefono", tel).eq("direccion", "entrante").gte("creado_at", new Date(Date.now() - 23.5 * 36e5).toISOString()).limit(1);
    const enVentana = !!ult.data?.length;
    const carga = enVentana ? cargaUtil(tel, { tipo: "texto", texto: turnoListoTexto(r.data, m) }) : turnoListo(tel, r.data, m);
    const id = await enviar(tel, carga);
    await almacen.registrar(tel, "saliente", carga, id);
    if (!id) return json(req, { error: "WhatsApp no acept\xF3 el mensaje. Intente de nuevo en un momento." }, 502);
    await sb.from("citas").update({ llamado_at: ahora }).eq("id", r.data.id);
    return json(req, { ok: true, via: enVentana ? "texto" : "plantilla", llamado_at: ahora });
  }
  return json(req, { error: "Acci\xF3n no v\xE1lida" }, 400);
}
async function meta(req) {
  const { accion, waba, solo } = await req.json().catch(() => ({}));
  if (!/^\d+$/.test(String(waba || ""))) return new Response("Falta waba", { status: 400 });
  const version = Deno.env.get("WA_API_VERSION") || "v25.0";
  const url = `https://graph.facebook.com/${version}/${waba}/subscribed_apps`;
  const auth = { authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` };
  const base = `https://graph.facebook.com/${version}/${waba}`;
  if (accion === "plantillas" || accion === "ver_plantillas") {
    const creadas = [];
    if (accion === "plantillas") {
      for (const p of PLANTILLAS.filter((x) => !solo || x.name === solo)) {
        const r = await fetch(`${base}/message_templates`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(p) });
        creadas.push({ nombre: p.name, respuesta: await r.json().catch(() => ({ status: r.status })) });
      }
    }
    const g2 = await fetch(`${base}/message_templates?fields=name,status,category,language,rejected_reason&limit=50`, { headers: auth });
    return new Response(JSON.stringify({ creadas, plantillas: await g2.json().catch(() => ({})) }), { headers: { "content-type": "application/json" } });
  }
  let suscribir = null;
  if (accion === "suscribir") {
    const r = await fetch(url, { method: "POST", headers: auth });
    suscribir = await r.json().catch(() => ({ status: r.status }));
  }
  const g = await fetch(url, { headers: auth });
  const apps = await g.json().catch(() => ({ status: g.status }));
  return new Response(JSON.stringify({ suscribir, apps }), { headers: { "content-type": "application/json" } });
}
var PLANTILLAS = [
  {
    name: "recordatorio_cita",
    language: "es",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, te recordamos tu cita con {{2}} el {{3}} a las {{4}}. Lugar: {{5}}. \xBFNos confirmas tu asistencia?",
        example: { body_text: [["Mar\xEDa", "Dr. Luis Espinoza", "martes 11 de noviembre", "10:00 a. m.", "Cl\xEDnica Sonrisa, Barrio El Centro, San Pedro Sula"]] }
      },
      { type: "FOOTER", text: "Aid\xFA Med \xB7 Asistente de citas" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmo" }, { type: "QUICK_REPLY", text: "Cambiar fecha" }, { type: "QUICK_REPLY", text: "Cancelar cita" }] }
    ]
  },
  {
    name: "cita_cancelada_consultorio",
    language: "es",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, el consultorio de {{2}} tuvo que cancelar tu cita del {{3}} a las {{4}}. Lamentamos el inconveniente. \xBFQuieres elegir otra fecha?",
        example: { body_text: [["Mar\xEDa", "Dr. Luis Espinoza", "martes 11 de noviembre", "10:00 a. m."]] }
      },
      { type: "FOOTER", text: "Aid\xFA Med \xB7 Asistente de citas" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Elegir otra fecha" }] }
    ]
  },
  {
    name: "turno_listo",
    language: "es",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, {{2}} ya puede atenderte. Por favor, dir\xEDgete a: *{{3}}*. \xA1Te esperamos!",
        example: { body_text: [["Mar\xEDa", "el Dr. Luis Espinoza", "Consultorio 204"]] }
      },
      { type: "FOOTER", text: "Aid\xFA Med \xB7 Asistente de citas" }
    ]
  }
];
