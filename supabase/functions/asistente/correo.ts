// Aidú Med · Correos al médico cuando el asistente agenda, reagenda o cancela una cita.
import nodemailer from "npm:nodemailer@6.9.16";
import type { Avisos, Cita, Medico } from "./flujo.ts";
import { fechaLarga, fechaLocal, hora12 } from "./tiempo.ts";

const transporte = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 465, secure: true,
  auth: { user: "luis_espinoza@aidu.pro", pass: Deno.env.get("GMAIL_APP_PASSWORD") },
});

const esc = (t: unknown) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const cuando = (c: Cita) => { const i = new Date(c.inicio); return `${fechaLarga(fechaLocal(i))}, ${hora12(i)}`; };
const telefonoBonito = (t: string) => t.startsWith("504") && t.length === 11 ? `+504 ${t.slice(3, 7)}-${t.slice(7)}` : `+${t}`;

function html(titulo: string, filas: [string, string][], nota?: string, boton: [string, string] = ["Ver mis citas", "https://aidumed.app/mi-perfil"], pie = "Aviso automático de su asistente de citas · Aidú Med"): string {
  const tabla = filas.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;font-size:14px;color:#4A5A57;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:15px;font-weight:bold;color:#10211F;">${v}</td></tr>`).join("");
  return `<div style="margin:0;padding:24px 12px;background:#F6F7F4;font-family:Arial,Helvetica,sans-serif;color:#10211F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE3E0;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#0B6E5F;padding:22px 28px;"><img src="https://aidumed.app/assets/img/logo-aidu-med-blanco.png" alt="Aidú Med" height="34" style="display:block;height:34px;border:0;"></td></tr>
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

/** Al administrador: un médico subió una foto de perfil nueva. */
export async function avisarFotoPendiente(m: Medico, urlFoto: string) {
  const nombre = [m.titulo, m.nombre].filter(Boolean).join(" ") || m.correo || "Un médico";
  try {
    const r = await transporte.sendMail({
      from: '"Aidú Med" <hola@aidu.pro>', to: "suscripciones@aidu.pro",
      subject: `Foto nueva por aprobar: ${nombre}`,
      html: html("Foto de perfil por aprobar", [["Médico", esc(nombre)], ["Correo", esc(m.correo || "—")],
        ["Foto nueva", `<img src="${esc(urlFoto)}" alt="" width="160" style="display:block;width:160px;height:160px;object-fit:cover;border-radius:999px;border:1px solid #DCE3E0;">`]],
        "La foto no se muestra hasta que usted la apruebe en el panel de administración.", ["Revisar en el panel", "https://aidumed.app/admin?fotos=1"], "Aviso interno · Aidú Med"),
      text: `Foto nueva por aprobar: ${nombre}. Revísela en https://aidumed.app/admin?fotos=1`,
    });
    console.log(`Correo enviado: foto por aprobar → suscripciones@aidu.pro (${r.response || r.messageId})`);
  } catch (e) {
    console.error("Correo", e);
  }
}

/** Al médico que no ha terminado su registro: recordatorio con enlace para continuar. */
export async function recordarRegistro(para: string, nombre: string | null): Promise<boolean> {
  const saludo = nombre ? `Hola, ${nombre}` : "Hola";
  try {
    const r = await transporte.sendMail({
      from: '"Aidú Med" <hola@aidu.pro>', to: para,
      subject: "Su registro en Aidú Med está a medio camino",
      html: html(`${saludo}: le falta poco para activar su asistente`, [
        ["¿Qué falta?", "Terminar el formulario de registro: sus datos profesionales, consultorio, servicios y horario. Toma unos 10 minutos y lo que ya guardó sigue ahí."],
        ["¿Qué sigue?", "Revisamos su colegiación en menos de 24 horas y configuramos con usted su asistente de citas por WhatsApp."],
      ], "Si tiene alguna duda, responda a este correo o escríbanos a info@aidu.pro.", ["Continuar mi registro", "https://aidumed.app/cuenta?modo=entrar&siguiente=%2Fregistro"], "Aidú Med · Su asistente de citas por WhatsApp"),
      text: `${saludo}. Le falta poco para terminar su registro en Aidú Med. Continúe aquí: https://aidumed.app/cuenta?modo=entrar&siguiente=%2Fregistro`,
    });
    console.log(`Correo enviado: recordatorio de registro → ${para} (${r.response || r.messageId})`);
    return true;
  } catch (e) {
    console.error("Correo", e);
    return false;
  }
}

export function crearAvisos(prueba: boolean): Avisos {
  const prefijo = prueba ? "[Prueba] " : "";
  async function enviar(para: string | null | undefined, asunto: string, cuerpo: string, texto: string) {
    if (!para) return;
    try {
      const r = await transporte.sendMail({ from: '"Aidú Med" <hola@aidu.pro>', to: para, subject: prefijo + asunto, html: cuerpo, text: texto });
      console.log(`Correo enviado: "${prefijo + asunto}" → ${para} (${r.response || r.messageId})`);
    } catch (e) {
      console.error("Correo", e);
    }
  }
  const datos = (c: Cita, tel: string): [string, string][] => [
    ["Paciente", esc(c.nombre_paciente || "—")],
    ["Servicio", esc(c.servicio)],
    ["WhatsApp", `<a href="https://wa.me/${esc(tel)}" style="color:#0B6E5F;">${esc(telefonoBonito(tel))}</a>`],
  ];
  return {
    async citaNueva(m: Medico, c: Cita, tel: string) {
      await enviar(m.correo, `Nueva cita: ${c.nombre_paciente || "paciente"} · ${cuando(c)}`,
        html("Tiene una cita nueva", [["Fecha", esc(cuando(c))], ...datos(c, tel)]),
        `Nueva cita: ${c.nombre_paciente} · ${cuando(c)} · ${c.servicio} · WhatsApp ${telefonoBonito(tel)}`);
    },
    async citaCancelada(m: Medico, c: Cita, tel: string) {
      await enviar(m.correo, `Cita cancelada: ${c.nombre_paciente || "paciente"} · ${cuando(c)}`,
        html("El paciente canceló su cita", [["Era el", esc(cuando(c))], ...datos(c, tel)], "Ese horario ya quedó libre para otros pacientes."),
        `Cita cancelada: ${c.nombre_paciente} · ${cuando(c)} · ${c.servicio}`);
    },
    async citaReagendada(m: Medico, nueva: Cita, anterior: Cita, tel: string) {
      await enviar(m.correo, `Cita reagendada: ${nueva.nombre_paciente || "paciente"} · ${cuando(nueva)}`,
        html("El paciente cambió su cita", [["Nueva fecha", esc(cuando(nueva))], ["Antes", `<span style="text-decoration:line-through;font-weight:normal;">${esc(cuando(anterior))}</span>`], ...datos(nueva, tel)]),
        `Cita reagendada: ${nueva.nombre_paciente} · de ${cuando(anterior)} a ${cuando(nueva)}`);
    },
    async prospecto(tel: string, nombre: string | undefined, mensaje: string) {
      await enviar("suscripciones@aidu.pro", `Médico interesado por WhatsApp: ${nombre || telefonoBonito(tel)}`,
        html("Un médico escribió al asistente", [["Nombre en WhatsApp", esc(nombre || "—")], ["WhatsApp", `<a href="https://wa.me/${esc(tel)}" style="color:#0B6E5F;">${esc(telefonoBonito(tel))}</a>`], ["Mensaje", esc(mensaje)]]),
        `Médico interesado: ${nombre || ""} ${telefonoBonito(tel)} — ${mensaje}`);
    },
  };
}
