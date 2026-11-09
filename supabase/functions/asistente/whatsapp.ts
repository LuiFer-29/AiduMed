// Aidú Med · Envío y recepción de mensajes con la API de WhatsApp Cloud (Meta).
import { corto, type Entrada, type Salida } from "./flujo.ts";

const VERSION = Deno.env.get("WA_API_VERSION") || "v25.0";

export function cargaUtil(para: string, s: Salida): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to: para };
  if (s.tipo === "texto") return { ...base, type: "text", text: { body: corto(s.texto, 4096), preview_url: true } };
  if (s.tipo === "botones") {
    return {
      ...base, type: "interactive",
      interactive: {
        type: "button", body: { text: corto(s.texto, 1024) },
        action: { buttons: s.botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: corto(b.titulo, 20) } })) },
      },
    };
  }
  let restantes = 10;
  const secciones = s.secciones.map((se) => {
    const filas = se.filas.slice(0, restantes);
    restantes -= filas.length;
    return {
      title: corto(se.titulo, 24),
      rows: filas.map((f) => ({ id: f.id.slice(0, 200), title: corto(f.titulo, 24), ...(f.descripcion ? { description: corto(f.descripcion, 72) } : {}) })),
    };
  }).filter((se) => se.rows.length);
  return {
    ...base, type: "interactive",
    interactive: { type: "list", body: { text: corto(s.texto, 1024) }, action: { button: corto(s.boton, 20), sections: secciones } },
  };
}

export async function enviar(para: string, carga: Record<string, unknown>): Promise<string | null> {
  const r = await fetch(`https://graph.facebook.com/${VERSION}/${Deno.env.get("WA_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` },
    body: JSON.stringify(carga),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("WhatsApp error", r.status, JSON.stringify(j));
    return null;
  }
  return j.messages?.[0]?.id || null;
}

/** Marca como leído y muestra "escribiendo…" mientras se prepara la respuesta. */
export async function marcarLeido(metaId: string): Promise<void> {
  await fetch(`https://graph.facebook.com/${VERSION}/${Deno.env.get("WA_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("WA_TOKEN")}` },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: metaId, typing_indicator: { type: "text" } }),
  }).catch(() => {});
}

export type Recibido = Entrada & { metaId: string; crudo: unknown };

/** Mensajes de pacientes dentro de una notificación de Meta (ignora estados de entrega). */
export function leerNotificacion(cuerpo: any): Recibido[] {
  const res: Recibido[] = [];
  for (const entry of cuerpo?.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      const nombres: Record<string, string> = {};
      for (const c of v.contacts || []) nombres[c.wa_id] = c.profile?.name;
      for (const m of v.messages || []) {
        const e: Recibido = { telefono: m.from, nombrePerfil: nombres[m.from], metaId: m.id, crudo: m };
        if (m.type === "text") e.texto = m.text?.body;
        else if (m.type === "interactive") {
          const r = m.interactive?.button_reply || m.interactive?.list_reply;
          e.id = r?.id;
          e.texto = r?.title;
        } else if (m.type === "button") {
          // Botones de plantillas (recordatorios): el "payload" trae nuestro identificador.
          e.id = m.button?.payload;
          e.texto = m.button?.text;
        } else {
          e.texto = ""; // audio, foto, etc.: se responde con el menú
        }
        res.push(e);
      }
    }
  }
  return res;
}

/** Verifica que la notificación venga de Meta (firma HMAC-SHA256 con el secreto de la app). */
export async function firmaValida(cuerpo: string, firma: string | null, secreto: string | undefined): Promise<boolean> {
  if (!firma || !secreto) return false;
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo)));
  const esperado = "sha256=" + Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (esperado.length !== firma.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0;
}
