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

function html(titulo: string, filas: [string, string][], nota?: string): string {
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
        <a href="https://aidumed.app/mi-perfil" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Ver mis citas</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;"><p style="margin:0;padding-top:16px;border-top:1px solid #DCE3E0;font-size:12px;line-height:1.6;color:#4A5A57;">Aviso automático de su asistente de citas · Aidú Med</p></td></tr>
  </table>
</div>`;
}

export function crearAvisos(prueba: boolean): Avisos {
  const prefijo = prueba ? "[Prueba] " : "";
  async function enviar(para: string | null | undefined, asunto: string, cuerpo: string, texto: string) {
    if (!para) return;
    try {
      await transporte.sendMail({ from: '"Aidú Med" <hola@aidu.pro>', to: para, subject: prefijo + asunto, html: cuerpo, text: texto });
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
