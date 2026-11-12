// Aidú Med · Mensajes que inicia el asistente (fuera de la ventana de 24 h): requieren plantillas aprobadas por Meta.
//
// Plantillas a crear en WhatsApp Manager (categoría "Utilidad", idioma "Español (es)"):
//
// 1) recordatorio_cita
//    Cuerpo: Hola {{1}}, te recordamos tu cita con {{2}} el {{3}} a las {{4}}. Lugar: {{5}}. ¿Nos confirmas tu asistencia?
//    Botones de respuesta rápida: "Confirmo" · "Cambiar fecha" · "Cancelar cita"
//
// 2) cita_cancelada_consultorio
//    Cuerpo: Hola {{1}}, el consultorio de {{2}} tuvo que cancelar tu cita del {{3}} a las {{4}}. Lamentamos el inconveniente. ¿Quieres elegir otra fecha?
//    Botón de respuesta rápida: "Elegir otra fecha"
//
// 3) turno_listo (botón "Atender" del panel, cuando el paciente no ha escrito en 24 h)
//    Cuerpo: Hola {{1}}, {{2}} ya puede atenderte. Por favor, dirígete a: *{{3}}*. ¡Te esperamos!
//
// Versión 2 (trato de usted, nov. 2026): recordatorio_cita_v2, cita_cancelada_v2, turno_listo_v2.
// Cada función devuelve las opciones en orden de preferencia: primero la v2 y, si Meta aún no la aprueba, la v1.
import { lugarMedico, type Cita, type Medico } from "./flujo.ts";
import { fechaLarga, fechaLocal, hora12 } from "./tiempo.ts";

// Meta no acepta saltos de línea ni más de 4 espacios seguidos en los parámetros.
const limpio = (t: unknown, n = 60) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n) || "—";
const nombreMedico = (m: Medico) => [m.titulo, m.nombre].filter(Boolean).join(" ");
const primerNombre = (t?: string | null) => (t || "").split(" ")[0] || "";

function texto(valor: string) { return { type: "text", text: valor }; }
function respuesta(indice: number, payload: string) {
  return { type: "button", sub_type: "quick_reply", index: String(indice), parameters: [{ type: "payload", payload }] };
}

export function recordatorio(para: string, c: Cita, m: Medico) {
  return ["recordatorio_cita_v2", "recordatorio_cita"].map((nombre) => recordatorioCon(nombre, para, c, m));
}
function recordatorioCon(nombre: string, para: string, c: Cita, m: Medico) {
  const i = new Date(c.inicio);
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: nombre, language: { code: "es" },
      components: [
        {
          type: "body", parameters: [
            texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
            texto(limpio(nombreMedico(m))),
            texto(limpio(fechaLarga(fechaLocal(i)).toLowerCase())),
            texto(limpio(hora12(i))),
            texto(limpio(lugarMedico(m), 120)),
          ],
        },
        respuesta(0, `rec:si:${c.id}`),
        respuesta(1, `rec:cambiar:${c.id}`),
        respuesta(2, `rec:cancelar:${c.id}`),
      ],
    },
  };
}

export function canceladaPorConsultorio(para: string, c: Cita, m: Medico) {
  return [canceladaCon("cita_cancelada_v2", para, c, m), canceladaCon("cita_cancelada_consultorio", para, c, m)];
}
function canceladaCon(nombre: string, para: string, c: Cita, m: Medico) {
  const i = new Date(c.inicio);
  // v2: "Le escribimos del consultorio {{2}}" → "del Dr. Luis Espinoza" / "de la Dra. Ana Pérez"
  const medico = nombre === "cita_cancelada_v2" ? (m.titulo === "Dra." ? "de la " : m.titulo === "Dr." ? "del " : "de ") + nombreMedico(m) : nombreMedico(m);
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: nombre, language: { code: "es" },
      components: [
        {
          type: "body", parameters: [
            texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
            texto(limpio(medico)),
            texto(limpio(fechaLarga(fechaLocal(i)).toLowerCase())),
            texto(limpio(hora12(i))),
          ],
        },
        respuesta(0, `agenda:${m.id}`),
      ],
    },
  };
}

/** "el Dr. Luis Espinoza" / "la Dra. Ana Pérez" */
export function conArticulo(m: Medico): string {
  const n = nombreMedico(m);
  return m.titulo === "Dra." ? `la ${n}` : m.titulo === "Dr." ? `el ${n}` : n;
}
/** A dónde debe pasar el paciente: "Consultorio 204", o el nombre de la clínica. */
export function destino(m: Medico): string {
  return m.numero_consultorio ? `Consultorio ${m.numero_consultorio}` : m.consultorio || "el consultorio";
}

export function turnoListo(para: string, c: Cita, m: Medico) {
  return ["turno_listo_v2", "turno_listo"].map((nombre) => turnoCon(nombre, para, c, m));
}
function turnoCon(nombre: string, para: string, c: Cita, m: Medico) {
  // v2 empieza la oración con el médico: "El Dr. Luis Espinoza ya puede atenderle."
  const quien = nombre === "turno_listo_v2" ? conArticulo(m).charAt(0).toUpperCase() + conArticulo(m).slice(1) : conArticulo(m);
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: nombre, language: { code: "es" },
      components: [{
        type: "body", parameters: [
          texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
          texto(limpio(quien)),
          texto(limpio(destino(m), 80)),
        ],
      }],
    },
  };
}

/** Dentro de las 24 h se puede escribir texto libre (gratis). */
export function turnoListoTexto(c: Cita, m: Medico): string {
  const quien = conArticulo(m);
  const listo = m.titulo === "Dra." ? "lista" : "listo";
  const nombre = primerNombre(c.nombre_paciente);
  const a = m.numero_consultorio ? `al *Consultorio ${m.numero_consultorio}*` : m.consultorio ? `a *${m.consultorio}*` : "al consultorio";
  return `Hola${nombre ? `, ${nombre}` : ""}. ${quien.charAt(0).toUpperCase() + quien.slice(1)} está ${listo} para atenderle.\n\nPor favor, diríjase ${a}.\n\n¡Le esperamos!`;
}
