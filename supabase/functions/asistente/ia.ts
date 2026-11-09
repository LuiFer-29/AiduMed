// Aidú Med · Comprensión de texto libre con Claude (Haiku).
import type { Cerebro, ContextoIA, Interpretacion } from "./flujo.ts";
import { fechaLarga, hora12, sumarDias } from "./tiempo.ts";

const MODELO = "claude-haiku-5-5";

const HERRAMIENTA = {
  name: "interpretar",
  description: "Registra qué quiere el paciente y, si es una pregunta, la respuesta.",
  input_schema: {
    type: "object",
    properties: {
      intencion: {
        type: "string",
        enum: ["agendar", "ver_citas", "reagendar", "cancelar", "pregunta", "saludo", "soy_medico", "otro"],
        description: "agendar: quiere una cita nueva o dice día/hora/servicio. ver_citas: quiere ver sus citas. reagendar: cambiar una cita. cancelar: cancelar una cita. pregunta: pregunta información. saludo: solo saluda. soy_medico: es un médico interesado en contratar Aidú Med. otro: nada de lo anterior.",
      },
      servicio: { type: "string", description: "Nombre EXACTO de uno de los servicios del consultorio, si lo menciona." },
      fecha: { type: "string", description: "Fecha que pide, en formato YYYY-MM-DD (siempre hoy o en el futuro)." },
      parte_dia: { type: "string", enum: ["manana", "tarde"], description: "Si prefiere mañana (antes de 12:00) o tarde." },
      hora: { type: "string", description: "Hora exacta que pide, formato 24 h HH:MM." },
      nombre: { type: "string", description: "Nombre de la persona para la cita, si lo dice." },
      puede_responder: { type: "boolean", description: "true si la pregunta se responde con los datos del consultorio o es médica/emergencia (respuesta prudente)." },
      respuesta: { type: "string", description: "Solo si intencion es pregunta: respuesta breve (máximo 3 oraciones), tuteando, sin inventar datos." },
    },
    required: ["intencion"],
  },
};

function contexto(ctx: ContextoIA): string {
  const m = ctx.medico;
  const manana = sumarDias(ctx.hoy, 1);
  const base = [
    `Hoy es ${fechaLarga(ctx.hoy).toLowerCase()} (${ctx.hoy}), son las ${hora12(ctx.ahora)} en Honduras. Mañana es ${manana}.`,
  ];
  if (!m) return base.join("\n") + "\nTodavía no se sabe con qué médico quiere la cita.";
  const servicios = (m.servicios || []).map((s) => `- ${s.nombre}: ${s.duracion || ""}${s.precio ? `, L ${Number(String(s.precio).replace(/\D/g, "")).toLocaleString("en-US")}` : ", precio no publicado"}`).join("\n");
  const otras = (m.otras_vacaciones || []).map((r) => `${r.desde} a ${r.hasta}${r.motivo ? ` (${r.motivo})` : ""}`).join("; ");
  return [
    ...base,
    `Consultorio de ${[m.titulo, m.nombre].filter(Boolean).join(" ")}, ${m.especialidad === "Otra" ? m.especialidad_otra : m.especialidad}.`,
    `Nombre del consultorio: ${m.consultorio || "—"}. Dirección: ${m.direccion || "—"}.${m.ubicacion_gps ? ` Mapa: ${m.ubicacion_gps}.` : ""}`,
    `Días de consulta: ${(m.dias_atencion || []).join(", ") || "—"}. Horario: ${m.hora_desde?.slice(0, 5) || "?"} a ${m.hora_hasta?.slice(0, 5) || "?"}.`,
    `Servicios:\n${servicios || "- (sin servicios)"}`,
    `Cierra por: ${(m.vacaciones || []).join(", ") || "—"}${otras ? `; además ${otras}` : ""}.`,
    m.descripcion ? `Sobre el médico: ${m.descripcion}` : "",
  ].filter(Boolean).join("\n");
}

export function crearCerebro(apiKey: string | undefined): Cerebro {
  return {
    async interpretar(texto, ctx): Promise<Interpretacion | null> {
      if (!apiKey) return null;
      const sistema = [
        "Eres el asistente de citas por WhatsApp de un consultorio médico en Honduras (servicio Aidú Med).",
        "Tu única tarea es entender el último mensaje del paciente y llamar a la herramienta 'interpretar'.",
        "Reglas:",
        "- Usa solo los datos del consultorio de abajo. Nunca inventes precios, horarios, direcciones ni servicios.",
        "- Si pregunta algo que esos datos responden, intencion 'pregunta', puede_responder true y una respuesta breve y amable, tuteando.",
        "- Si pregunta por disponibilidad de un día concreto, intencion 'agendar' con la fecha (el sistema revisa los horarios); no respondas tú si hay espacio.",
        "- Preguntas médicas (síntomas, medicamentos, diagnósticos): no des consejo; responde que lo mejor es agendar una consulta. Si describe una emergencia, indica llamar al 911 o ir a la emergencia más cercana. En ambos casos puede_responder true.",
        "- Si no se puede responder con los datos, intencion 'pregunta' y puede_responder false.",
        "- Convierte fechas relativas (mañana, el jueves, la otra semana) a YYYY-MM-DD futuras.",
        "- 'servicio' debe ser exactamente uno de los nombres de la lista, o vacío.",
        "",
        "Datos del consultorio:",
        contexto(ctx),
        "",
        `Paso actual de la conversación: ${ctx.paso}.`,
      ].join("\n");
      const ctrl = new AbortController();
      const reloj = setTimeout(() => ctrl.abort(), 9000);
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
            messages: [{ role: "user", content: texto.slice(0, 1000) }],
          }),
        });
        if (!r.ok) {
          console.error("IA", r.status, await r.text());
          return null;
        }
        const j = await r.json();
        const uso = j.content?.find((c: any) => c.type === "tool_use");
        return (uso?.input as Interpretacion) || null;
      } catch (e) {
        console.error("IA", e);
        return null;
      } finally {
        clearTimeout(reloj);
      }
    },
  };
}
