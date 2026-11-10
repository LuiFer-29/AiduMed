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
  const i = new Date(c.inicio);
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: "recordatorio_cita", language: { code: "es" },
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
  const i = new Date(c.inicio);
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: "cita_cancelada_consultorio", language: { code: "es" },
      components: [
        {
          type: "body", parameters: [
            texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
            texto(limpio(nombreMedico(m))),
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
  return {
    messaging_product: "whatsapp", to: para, type: "template",
    template: {
      name: "turno_listo", language: { code: "es" },
      components: [{
        type: "body", parameters: [
          texto(limpio(primerNombre(c.nombre_paciente) || "hola", 40)),
          texto(limpio(conArticulo(m))),
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
  return `Hola${nombre ? ` ${nombre}` : ""} 👋\n\n${quien.charAt(0).toUpperCase() + quien.slice(1)} está ${listo} para atenderte. Por favor, dirígete ${a}.`;
}
