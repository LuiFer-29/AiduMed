// Aidú Med · Aviso por correo cuando cambia el estado de un médico.
// Remitente: suscripciones@aidu.pro (los correos de cuenta salen de hola@aidu.pro).
// Lo llama el trigger "medicos_avisar" (pg_net) con el encabezado x-aviso-secreto.
import nodemailer from "npm:nodemailer@6.9.16";

const transporte = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: "luis_espinoza@aidu.pro", pass: Deno.env.get("GMAIL_APP_PASSWORD") },
});

const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Medico = { correo?: string; titulo?: string; nombre?: string; estado?: string; nota_admin?: string };
type Mensaje = { asunto: string; titulo: string; parrafos: string[]; nota?: string; despues?: string; boton: string };

function saludo(m: Medico) {
  const t = m.titulo || "";
  const estimado = t.startsWith("Dra") ? "Estimada" : t.startsWith("Dr") ? "Estimado" : "Estimado(a)";
  return `${estimado} ${t} ${m.nombre || ""}`.replace(/\s+/g, " ").trim() + ":";
}

const mensajes: Record<string, (m: Medico) => Mensaje> = {
  rechazado: (m) => ({
    asunto: "Su registro necesita un ajuste · Aidú Med",
    titulo: "Necesitamos un pequeño ajuste",
    parrafos: [saludo(m), "Revisamos su registro y, antes de aprobarlo, necesitamos que ajuste lo siguiente:"],
    nota: m.nota_admin || "",
    despues: "Entre a su perfil, toque «Editar mis datos» y vuelva a enviarlo. Lo revisaremos de nuevo apenas lo recibamos.",
    boton: "Revisar mis datos",
  }),
  aprobado: (m) => ({
    asunto: "¡Su registro fue aprobado! · Aidú Med",
    titulo: "¡Su registro fue aprobado!",
    parrafos: [
      saludo(m),
      "Verificamos sus datos y su carné. Ya forma parte de Aidú Med.",
      "El siguiente paso es configurar su asistente de citas por WhatsApp. Le escribiremos para coordinarlo.",
    ],
    boton: "Ver mi perfil",
  }),
  activo: (m) => ({
    asunto: "Su asistente de citas ya está activo · Aidú Med",
    titulo: "Su asistente ya está activo",
    parrafos: [
      saludo(m),
      "Desde ahora sus pacientes pueden agendar citas por WhatsApp a cualquier hora, incluso fuera de su horario de consulta.",
      "Si necesita cambiar horarios, servicios o precios, puede hacerlo desde su perfil.",
    ],
    boton: "Ver mi perfil",
  }),
  pausado: (m) => ({
    asunto: "Su asistente está en pausa · Aidú Med",
    titulo: "Su asistente está en pausa",
    parrafos: [
      saludo(m),
      "Pausamos temporalmente su asistente de citas, así que por ahora no está recibiendo citas nuevas." + (m.nota_admin ? " El motivo:" : ""),
    ],
    nota: m.nota_admin || "",
    despues: "Si tiene dudas o desea reactivarlo, responda este correo o escríbanos a info@aidu.pro.",
    boton: "Ver mi perfil",
  }),
};

function html(m: Mensaje) {
  const ps = m.parrafos
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4A5A57;">${esc(p)}</p>`)
    .join("");
  const nota = m.nota
    ? `<div style="margin:4px 0 22px;padding:14px 16px;background:#E3F1EE;border-left:4px solid #0B6E5F;border-radius:8px;font-size:15px;line-height:1.6;color:#10211F;white-space:pre-line;">${esc(m.nota)}</div>
`
    : "";
  const despues = m.despues
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4A5A57;">${esc(m.despues)}</p>`
    : "";
  return `<div style="margin:0;padding:24px 12px;background:#F6F7F4;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;color:#10211F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE3E0;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#0B6E5F;padding:22px 28px;"><img src="https://aidumed.app/assets/img/logo-aidu-med-blanco.png" alt="Aidú Med" height="34" style="display:block;height:34px;border:0;"></td></tr>
    <tr><td style="padding:30px 28px 8px;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#10211F;">${esc(m.titulo)}</h1>
      ${ps}${nota}${despues}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td style="background:#0B6E5F;border-radius:10px;">
        <a href="https://aidumed.app/mi-perfil" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">${esc(m.boton)}</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;">
      <p style="margin:0;padding-top:16px;border-top:1px solid #DCE3E0;font-size:12px;line-height:1.6;color:#4A5A57;">Aidú Med · Aidú S. de R.L. · San Pedro Sula, Honduras<br><a href="https://aidumed.app" style="color:#0B6E5F;">aidumed.app</a></p>
    </td></tr>
  </table>
</div>`;
}

function texto(m: Mensaje) {
  return [m.titulo, "", ...m.parrafos, m.nota ? `\n${m.nota}\n` : "", m.despues || "", "", "https://aidumed.app/mi-perfil", "", "Aidú Med · San Pedro Sula, Honduras"].join("\n");
}

Deno.serve(async (req) => {
  if (req.headers.get("x-aviso-secreto") !== Deno.env.get("AVISO_SECRETO")) {
    return new Response("No autorizado", { status: 401 });
  }
  const { record, old_record } = await req.json();
  const medico = record as Medico;
  if (!medico?.correo || medico.estado === old_record?.estado) return new Response("Sin cambios");
  const crear = mensajes[medico.estado || ""];
  if (!crear) return new Response("Este estado no lleva aviso");
  const m = crear(medico);
  await transporte.sendMail({
    from: '"Aidú Med" <suscripciones@aidu.pro>',
    replyTo: "suscripciones@aidu.pro",
    to: medico.correo,
    subject: m.asunto,
    html: html(m),
    text: texto(m),
  });
  console.log(`Aviso '${medico.estado}' enviado a ${medico.correo}`);
  return new Response(`Enviado: ${medico.estado}`);
});
