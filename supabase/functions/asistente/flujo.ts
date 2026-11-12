// Aidú Med · Lógica de la conversación con el paciente (independiente de WhatsApp y de la base de datos).
import {
  diasDeAnticipacion, diasDisponibles, horariosDelDia, minutos, motivoSinHorario, rangosLibres,
  type Perfil, type Rango, type Servicio,
} from "./disponibilidad.ts";
import { fechaCorta, fechaLarga, fechaLocal, hora12, minutosLocales, sumarDias } from "./tiempo.ts";
import { ESPECIALIDADES, esDeEspecialidad, especialidadEnTexto } from "./especialidades.ts";

// ---------- Tipos ----------
export type Boton = { id: string; titulo: string };
export type Fila = { id: string; titulo: string; descripcion?: string };
export type Salida =
  | { tipo: "texto"; texto: string }
  | { tipo: "botones"; texto: string; botones: Boton[] }
  | { tipo: "lista"; texto: string; boton: string; secciones: { titulo: string; filas: Fila[] }[] };

export type Entrada = { telefono: string; nombrePerfil?: string; texto?: string; id?: string };

export type Medico = Perfil & {
  id: string; codigo?: string | null; estado: string; correo?: string | null;
  titulo?: string | null; nombre?: string | null; especialidad?: string | null; especialidad_otra?: string | null;
  consultorio?: string | null; numero_consultorio?: string | null; direccion?: string | null; ubicacion_gps?: string | null;
  whatsapp_consultorio?: string | null; whatsapp_secretaria?: string | null; derivar_a?: string | null;
  telefono_consultorio?: string | null; servicios?: Servicio[] | null; descripcion?: string | null;
};
export type Conversacion = { telefono: string; medico_id: string | null; paso: string; datos: Record<string, any>; ultimo_mensaje_at?: string };
export type Paciente = { id: string; telefono: string; nombre: string | null };
export type Cita = {
  id: string; medico_id: string; paciente_id: string; nombre_paciente?: string | null; servicio: string;
  duracion_min: number; precio?: number | null; inicio: string; fin: string; estado: string;
};
export type NuevaCita = Omit<Cita, "id" | "estado"> & { reagendada_de?: string | null };

export interface Almacen {
  conversacion(telefono: string): Promise<Conversacion | null>;
  guardarConversacion(c: Conversacion): Promise<void>;
  medicoPorId(id: string): Promise<Medico | null>;
  medicoPorCodigo(codigo: string): Promise<Medico | null>;
  buscarMedicos(texto: string): Promise<Medico[]>;
  paciente(telefono: string): Promise<Paciente | null>;
  guardarPaciente(telefono: string, nombre: string | null): Promise<Paciente>;
  citasOcupadas(medicoId: string, desde: Date, hasta: Date): Promise<{ id: string; inicio: string; fin: string }[]>;
  citasFuturas(pacienteId: string, medicoId: string, ahora: Date): Promise<Cita[]>;
  cita(id: string): Promise<Cita | null>;
  historial(pacienteId: string): Promise<{ medico_id: string; inicio: string; estado: string }[]>;
  citasFuturasTodas(pacienteId: string, ahora: Date): Promise<Cita[]>;
  medicosDisponibles(): Promise<Medico[]>;
  guardarSolicitud(telefono: string, especialidad: string): Promise<void>;
  crearCita(c: NuevaCita): Promise<Cita | "ocupado">;
  cancelarCita(id: string, por: "paciente" | "consultorio"): Promise<void>;
  confirmarAsistencia(id: string): Promise<void>;
  feriados(): Promise<Rango[]>;
  guardarProspecto(telefono: string, nombre: string | null, mensaje: string): Promise<void>;
}
export interface Avisos {
  citaNueva(m: Medico, c: Cita, telefono: string): Promise<void>;
  citaCancelada(m: Medico, c: Cita, telefono: string): Promise<void>;
  citaReagendada(m: Medico, nueva: Cita, anterior: Cita, telefono: string): Promise<void>;
  prospecto(telefono: string, nombrePerfil: string | undefined, mensaje: string): Promise<void>;
}
export type Intencion = "agendar" | "ver_citas" | "reagendar" | "cancelar" | "pregunta" | "saludo" | "soy_medico" | "otro";
export type Interpretacion = {
  intencion: Intencion; servicio?: string | null; fecha?: string | null; parte_dia?: "manana" | "tarde" | null;
  hora?: string | null; nombre?: string | null; respuesta?: string | null; puede_responder?: boolean | null;
};
export type ContextoIA = { medico: Medico | null; paso: string; hoy: string; ahora: Date; opciones: string[] };
export interface Cerebro { interpretar(texto: string, ctx: ContextoIA): Promise<Interpretacion | null> }

export type Dependencias = {
  almacen: Almacen; avisos: Avisos; cerebro: Cerebro; ahora: Date;
  /** En el simulador del panel también se puede probar con médicos "aprobados" (aún no activos). */
  permitirAprobados?: boolean;
};

// ---------- Utilidades de texto ----------
export const corto = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const nombreMedico = (m: Medico) => [m.titulo, m.nombre].filter(Boolean).join(" ");
/** "Consultorio 204 · Clínica Sonrisa, Barrio El Centro" */
export const lugarMedico = (m: Medico) =>
  [[m.numero_consultorio ? `Consultorio ${m.numero_consultorio}` : "", m.consultorio].filter(Boolean).join(" · "), m.direccion].filter(Boolean).join(", ");
/** "el Dr. Luis Espinoza" / "la Dra. Ana Pérez" */
const articulo = (m: Medico) => (m.titulo === "Dra." ? "la " : m.titulo === "Dr." ? "el " : "");
const conArticulo = (m: Medico) => articulo(m) + nombreMedico(m);
/** "el *Dr. Luis Espinoza*" (artículo fuera de las negritas) */
const conArticuloNegrita = (m: Medico) => `${articulo(m)}*${nombreMedico(m)}*`;
const especialidad = (m: Medico) => (m.especialidad === "Otra" ? m.especialidad_otra : m.especialidad) || "";
const lempiras = (p?: string | number | null) => {
  const n = Number(String(p ?? "").replace(/\D/g, ""));
  return n ? `L ${n.toLocaleString("en-US")}` : "";
};
const limpiarNombre = (t: string) =>
  t.replace(/[^\p{L}\s'.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60)
    .split(" ").map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p)).join(" ");

/** "Hola, quiero agendar una cita con el Dr. Luis Espinoza" → "Luis Espinoza" (mensaje del enlace del médico). */
export function medicoEnTexto(texto: string): string | null {
  const m = texto.match(/cita con (?:el |la )?(?:dra?|doctora?)\.?\s+([\p{L}][\p{L}\d .'-]{1,60}?)[\s.!¡?]*$/iu);
  return m ? m[1].trim() : null;
}

// El enlace del médico lleva su código escondido con caracteres invisibles (no se ven en WhatsApp).
const INVISIBLES = ["\u200B", "\u200C", "\u200D", "\u2060"];
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function codigoInvisible(texto: string): string | null {
  const marcas = [...texto].filter((c) => INVISIBLES.includes(c)).map((c) => INVISIBLES.indexOf(c));
  if (marcas.length < 12 || marcas.length % 3) return null;
  let codigo = "";
  for (let i = 0; i < marcas.length; i += 3) {
    const n = marcas[i] * 16 + marcas[i + 1] * 4 + marcas[i + 2];
    if (n >= ALFABETO.length) return null;
    codigo += ALFABETO[n];
  }
  return /^[A-Z]{2}\d{2}$/.test(codigo) ? codigo : null;
}
const quitarInvisibles = (t: string) => [...t].filter((c) => !INVISIBLES.includes(c)).join("");

export function codigoEnTexto(texto: string): string | null {
  const oculto = codigoInvisible(texto);
  if (oculto) return oculto;
  texto = quitarInvisibles(texto);
  const m = texto.match(/c[oó]digo[:\s#]*([a-z]{2}\d{2})\b/i) || texto.match(/^\s*([a-z]{2}\d{2})\s*$/i);
  return m ? m[1].toUpperCase() : null;
}

/** Interpretación mínima sin IA (si la IA no está configurada o falla). */
export function interpretarSinIA(texto: string): Interpretacion {
  const t = sinAcentos(texto.toLowerCase());
  if (/\b(soy (medico|doctor|doctora|dr|dra)|para mi consultorio|mi clinica)\b/.test(t)) return { intencion: "soy_medico" };
  if (/cancel/.test(t)) return { intencion: "cancelar" };
  if (/(reagend|cambiar (la|mi) cita|mover (la|mi) cita)/.test(t)) return { intencion: "reagendar" };
  if (/(mis citas|tengo cita|mi cita)/.test(t)) return { intencion: "ver_citas" };
  if (/(cita|agendar|turno|consulta para|reservar)/.test(t)) return { intencion: "agendar" };
  if (/^(hola|buen[oa]s|saludos|hey|que tal)/.test(t)) return { intencion: "saludo" };
  if (/\?|cuanto|donde|horario|atiende|precio/.test(t)) return { intencion: "pregunta" };
  return { intencion: "otro" };
}

const BOTONES_MENU: Boton[] = [
  { id: "menu:agendar", titulo: "Agendar cita" },
  { id: "menu:citas", titulo: "Mis citas" },
  { id: "menu:pregunta", titulo: "Tengo una pregunta" },
];

// ---------- Punto de entrada ----------
export async function atender(e: Entrada, d: Dependencias): Promise<Salida[]> {
  const { almacen } = d;
  const conv: Conversacion = (await almacen.conversacion(e.telefono)) ||
    { telefono: e.telefono, medico_id: null, paso: "inicio", datos: {} };
  const anterior = conv.ultimo_mensaje_at ? Date.parse(conv.ultimo_mensaje_at) : 0;
  conv.ultimo_mensaje_at = d.ahora.toISOString();

  let medico = conv.medico_id ? await almacen.medicoPorId(conv.medico_id) : null;
  if (medico && !disponible(medico, d)) medico = null;

  const s = new Sesion(e, d, conv, medico);
  let salidas: Salida[];

  const codigo = e.texto ? codigoEnTexto(e.texto) : null;
  const porCodigo = codigo ? await almacen.medicoPorCodigo(codigo) : null;
  const nombre = !porCodigo && e.texto ? medicoEnTexto(quitarInvisibles(e.texto)) : null;
  const porNombre = nombre ? (await almacen.buscarMedicos(nombre)).filter((m) => disponible(m, d)) : [];
  const exactos = porNombre.filter((m) => sinAcentos((m.nombre || "").toLowerCase()) === sinAcentos(nombre!.toLowerCase()));
  if (porCodigo && disponible(porCodigo, d)) {
    s.medico = porCodigo;
    s.conv.medico_id = porCodigo.id;
    salidas = await s.saludo();
  } else if (exactos.length === 1 || porNombre.length === 1) {
    s.medico = exactos.length === 1 ? exactos[0] : porNombre[0];
    salidas = await s.saludo();
  } else if (porNombre.length > 1 || (nombre && !porNombre.length)) {
    // Pidió un médico por nombre: varios coinciden (se elige) o ninguno (se avisa), sin seguir con el anterior.
    salidas = await s.buscarMedico(nombre!);
  } else if (e.id) {
    salidas = await s.porBoton(e.id);
  } else if (esRegreso(conv, anterior, d.ahora)) {
    salidas = await s.regreso();
  } else {
    salidas = await s.porTexto(quitarInvisibles(e.texto || "").trim());
  }
  if (s.sinGuardar) return salidas;
  conv.medico_id = s.medico?.id ?? null;
  await almacen.guardarConversacion(conv);
  return salidas;
}

// Volver a preguntar con quién es la cita cuando el paciente regresa: 30 min después de terminar una gestión,
// o 3 horas después aunque haya quedado a medias (por ejemplo, eligiendo hora).
const PASOS_EN_REPOSO = ["inicio", "menu", "consulta", "mis_citas", "cita", "regreso"];
function esRegreso(conv: Conversacion, anterior: number, ahora: Date): boolean {
  if (!anterior) return false;
  const min = (ahora.getTime() - anterior) / 60000;
  return (min >= 30 && PASOS_EN_REPOSO.includes(conv.paso)) || min >= 180;
}

function disponible(m: Medico, d: Dependencias) {
  return m.estado === "activo" || (d.permitirAprobados && m.estado === "aprobado");
}

// ---------- Conversación ----------
class Sesion {
  /** Acciones que no deben tocar el estado guardado de la conversación (p. ej. "Confirmo"). */
  sinGuardar = false;
  constructor(public e: Entrada, public d: Dependencias, public conv: Conversacion, public medico: Medico | null) {}

  get datos() { return this.conv.datos; }
  ir(paso: string, datos?: Record<string, any>) {
    this.conv.paso = paso;
    if (datos) this.conv.datos = datos;
  }

  // ----- Inicio, sin médico elegido -----
  inicio(texto = "¡Hola! 👋 Soy el asistente de citas de *Aidú Med*. ¿Es usted paciente o médico?"): Salida[] {
    this.ir("inicio", {});
    return [{ tipo: "botones", texto, botones: [{ id: "ini:paciente", titulo: "Soy paciente" }, { id: "ini:medico", titulo: "Soy médico" }] }];
  }

  async saludo(): Promise<Salida[]> {
    const m = this.medico!;
    this.ir("menu", {});
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const nombre = (pac?.nombre || (this.e.nombrePerfil ? limpiarNombre(this.e.nombrePerfil) : "")).split(" ")[0];
    const esp = especialidad(m);
    return [{
      tipo: "botones",
      texto: `¡Hola${nombre ? `, ${nombre}` : ""}! 👋 Soy el asistente de citas ${m.titulo === "Dra." ? "de la" : m.titulo === "Dr." ? "del" : "de"} *${nombreMedico(m)}*${esp ? ` (${esp})` : ""}.\n\n¿En qué le puedo ayudar?`,
      botones: BOTONES_MENU,
    }];
  }

  menu(texto = "¿En qué más le puedo ayudar?"): Salida[] {
    this.ir("menu", {});
    return [{ tipo: "botones", texto, botones: BOTONES_MENU }];
  }

  // ----- Regreso: ¿con el mismo médico, con otro o gestionar citas? -----
  async regreso(): Promise<Salida[]> {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const historial = pac ? await this.d.almacen.historial(pac.id) : [];
    const ultimoId = this.conv.medico_id || historial[0]?.medico_id || null;
    let ultimo = ultimoId ? await this.d.almacen.medicoPorId(ultimoId) : null;
    if (ultimo && !disponible(ultimo, this.d)) ultimo = null;
    if (!ultimo) return this.inicio(`¡Hola de nuevo! 👋 Soy el asistente de citas de *Aidú Med*. ¿Es usted paciente o médico?`);
    this.medico = ultimo;
    this.ir("regreso", {});
    const nombre = (pac?.nombre || (this.e.nombrePerfil ? limpiarNombre(this.e.nombrePerfil) : "")).split(" ")[0];
    const proximas = pac ? await this.d.almacen.citasFuturasTodas(pac.id, this.d.ahora) : [];
    const esp = especialidad(ultimo);
    let contexto: string;
    const tuvoCita = historial.some((h) => h.medico_id === ultimo!.id);
    const ultimoTexto = tuvoCita
      ? `su última cita médica fue con ${conArticuloNegrita(ultimo)}${esp ? ` (${esp})` : ""}.`
      : `la última vez nos consultó por ${conArticuloNegrita(ultimo)}${esp ? ` (${esp})` : ""}.`;
    if (proximas.length) {
      const c = proximas[0], i = new Date(c.inicio);
      const mc = c.medico_id === ultimo.id ? ultimo : await this.d.almacen.medicoPorId(c.medico_id);
      contexto = `Observamos que tiene una cita con ${mc ? conArticuloNegrita(mc) : "su médico"} el *${fechaLarga(fechaLocal(i)).toLowerCase()}* a las *${hora12(i)}* 📅`;
      if (!mc || mc.id !== ultimo.id) contexto += `\n\nTambién vemos que ${ultimoTexto}`;
    } else {
      contexto = `Vemos que ${ultimoTexto}`;
    }
    return [{
      tipo: "botones",
      texto: `¡Hola de nuevo${nombre ? `, ${nombre}` : ""}! 👋\n\n${contexto}\n\n¿Con qué le podemos ayudar?`,
      botones: [
        { id: `reg:mismo:${ultimo.id}`, titulo: "Cita último médico" },
        { id: "reg:otro", titulo: "Cita con otro médico" },
        { id: "reg:citas", titulo: "Gestionar mis citas" },
      ],
    }];
  }

  pedirEspecialidad(prefijo = ""): Salida[] {
    this.ir("buscar_especialidad", {});
    return [{ tipo: "texto", texto: `${prefijo}¿Qué especialidad o médico busca? Escríbalo como guste, por ejemplo: *pediatra*, *dentista*, *ginecóloga* o el *nombre del doctor*.` }];
  }

  /** El paciente escribió una especialidad o un nombre. */
  async buscarEspecialidad(texto: string): Promise<Salida[]> {
    const e = especialidadEnTexto(texto);
    if (!e) {
      const porNombre = (await this.d.almacen.buscarMedicos(texto)).filter((m) => disponible(m, this.d));
      if (porNombre.length) return this.buscarMedico(texto);
      return [{ tipo: "texto", texto: "No logré identificar la especialidad 🙏 Pruebe con otra palabra, por ejemplo: *pediatra*, *dentista*, *dermatólogo* o el nombre del doctor." }];
    }
    // Médico de cabecera: si ya tuvo cita con alguien de esa especialidad, se le ofrece primero.
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
          texto: `${m.titulo === "Dra." ? "La" : m.titulo === "Dr." ? "El" : ""} *${nombreMedico(m)}* (${e.nombre}) ya le atendió antes. ¿Agendamos con ${m.titulo === "Dra." ? "ella" : "él"}?`,
          botones: [{ id: `esp:si:${m.id}`, titulo: `Sí, con ${m.titulo === "Dra." ? "ella" : "él"}` }, { id: `esp:otros:${ESPECIALIDADES.indexOf(e)}`, titulo: "Ver otros" }],
        }];
      }
    }
    return this.medicosDeEspecialidad(ESPECIALIDADES.indexOf(e));
  }

  async medicosDeEspecialidad(indice: number): Promise<Salida[]> {
    const e = ESPECIALIDADES[indice];
    if (!e) return this.pedirEspecialidad();
    const lista = (await this.d.almacen.medicosDisponibles()).filter((m) => disponible(m, this.d) && esDeEspecialidad(m, e));
    if (!lista.length) {
      this.ir("sin_especialidad", { especialidad: e.nombre });
      return [{
        tipo: "botones",
        texto: `Todavía no tenemos ${e.plural} en *Aidú Med*, pero estamos sumando médicos cada semana 💚\n\n¿Desea que le avisemos por aquí cuando se sume uno?`,
        botones: [{ id: `avisar:${indice}`, titulo: "Sí, avíseme" }, { id: "reg:otro", titulo: "Buscar otra" }],
      }];
    }
    if (lista.length === 1) {
      const m = lista[0];
      this.medico = m;
      this.ir("cabecera", { especialidad: e.nombre });
      return [{
        tipo: "botones",
        texto: `En *Aidú Med* tenemos ${m.titulo === "Dra." ? "a la" : m.titulo === "Dr." ? "al" : "a"} *${nombreMedico(m)}* (${e.nombre})${m.consultorio ? `, en ${m.consultorio}` : ""}. ¿Agendamos una cita?`,
        botones: [{ id: `esp:si:${m.id}`, titulo: "Sí, agendar" }, { id: "reg:otro", titulo: "Buscar otra" }],
      }];
    }
    this.ir("elegir_medico", {});
    return [{
      tipo: "lista", texto: `Estos son los ${e.plural} de *Aidú Med*. Elija con quién desea su cita:`, boton: "Ver médicos",
      secciones: [{
        titulo: corto(e.nombre, 24), filas: lista.slice(0, 10).map((m) => ({
          id: `med:${m.id}`, titulo: corto(nombreMedico(m), 24), descripcion: corto([m.consultorio, m.direccion].filter(Boolean).join(" · "), 72),
        })),
      }],
    }];
  }

  /** Citas próximas con todos sus médicos. */
  async misCitasTodas(): Promise<Salida[]> {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const citas = pac ? await this.d.almacen.citasFuturasTodas(pac.id, this.d.ahora) : [];
    if (!citas.length) {
      return [{
        tipo: "botones", texto: "No tiene citas próximas. ¿Desea agendar una?",
        botones: [...(this.medico ? [{ id: `reg:mismo:${this.medico.id}`, titulo: "Cita último médico" }] : []), { id: "reg:otro", titulo: "Cita con otro médico" }],
      }];
    }
    const medicos = new Map<string, Medico | null>();
    for (const c of citas) if (!medicos.has(c.medico_id)) medicos.set(c.medico_id, await this.d.almacen.medicoPorId(c.medico_id));
    this.ir("mis_citas", {});
    return [{
      tipo: "lista", texto: citas.length === 1 ? "Esta es su próxima cita. Tóquela para cambiarla o cancelarla:" : "Estas son sus próximas citas. Toque una para cambiarla o cancelarla:", boton: "Ver citas",
      secciones: [{
        titulo: "Próximas citas", filas: citas.map((c) => {
          const m = medicos.get(c.medico_id);
          return {
            id: `cita:${c.id}`, titulo: corto(`${fechaCorta(fechaLocal(new Date(c.inicio)))} · ${hora12(new Date(c.inicio))}`, 24),
            descripcion: corto([m ? nombreMedico(m) : "", c.servicio, c.nombre_paciente].filter(Boolean).join(" · "), 72),
          };
        }),
      }],
    }];
  }

  // ----- Respuestas a botones y listas -----
  async porBoton(id: string): Promise<Salida[]> {
    const [k, v, w] = id.split(":");
    if (k === "ini" && v === "paciente") return this.pedirEspecialidad();
    if (k === "ini" && v === "medico") return this.prospecto();
    if (k === "med") {
      const m = await this.d.almacen.medicoPorId(v);
      if (!m || !disponible(m, this.d)) return this.inicio("Ese médico ya no está disponible. ¿Eres paciente o médico?");
      this.medico = m;
      return this.saludo();
    }
    // Botones de las plantillas (recordatorio, cancelación del consultorio): traen la cita o el médico.
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
        if (!m || !disponible(m, this.d)) return this.pedirEspecialidad("Ese médico ya no está disponible en Aidú Med. ");
        this.medico = m;
        return this.iniciarAgenda();
      }
    }
    if (k === "esp") {
      if (v === "otros") return this.medicosDeEspecialidad(Number(w));
      if (v === "si") {
        const m = await this.d.almacen.medicoPorId(w);
        if (!m || !disponible(m, this.d)) return this.pedirEspecialidad("Ese médico ya no está disponible. ");
        this.medico = m;
        return this.iniciarAgenda();
      }
    }
    if (k === "avisar") {
      const e = ESPECIALIDADES[Number(v)];
      if (e) await this.d.almacen.guardarSolicitud(this.e.telefono, e.nombre);
      this.ir("inicio", {});
      return [{ tipo: "texto", texto: `¡Listo! Le escribiremos por aquí en cuanto ${e ? `tengamos ${e.plural}` : "tengamos esa especialidad"} en Aidú Med. 🙌\n\nMientras tanto, si necesita otra especialidad, escríbala cuando guste.` }];
    }
    if (k === "cita") return this.accionesCita(v);
    if (!this.medico) return this.inicio();

    switch (k) {
      case "menu":
        if (v === "agendar") return this.iniciarAgenda();
        if (v === "citas") return this.misCitas();
        if (v === "pregunta") {
          this.ir("consulta", {});
          return [{ tipo: "texto", texto: "Claro, escríbame su pregunta: horarios, precios, ubicación o lo que necesite saber del consultorio." }];
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
          return [{ tipo: "texto", texto: "Escriba el *nombre completo* de la persona que irá a la cita." }];
        }
        this.datos.nombre = this.datos.nombreSugerido;
        return this.confirmar();
      case "conf":
        if (v === "si") return this.crear();
        if (v === "hora") return this.mostrarDias();
        return this.menu("Listo, no agendé nada. ¿Le ayudo con algo más?");
      case "cita":
        return this.accionesCita(v);
      case "acc":
        if (v === "reagendar") return this.reagendar();
        if (v === "cancelar") return this.preguntarCancelar();
        return this.menu();
      case "canc":
        if (v === "si") return this.cancelar();
        return this.menu("Perfecto, su cita sigue en pie. ¿Le ayudo con algo más?");
      case "cons":
        if (v === "consultorio") return this.contacto();
        if (v === "agendar") return this.iniciarAgenda();
        return this.menu();
    }
    return this.menu();
  }

  // ----- Texto libre -----
  async porTexto(texto: string): Promise<Salida[]> {
    const paso = this.conv.paso;
    if (!texto) return this.medico ? this.repetir() : this.inicio();

    if (/\b(otro (medico|médico|doctor|doctora)|cambiar de (medico|médico|doctor|doctora))\b/i.test(texto)) return this.pedirEspecialidad();
    if (/^(menu|menú|inicio|volver|empezar)\W*$/i.test(texto)) return this.medico ? this.menu("¿En qué le puedo ayudar?") : this.inicio();
    if (paso === "buscar_especialidad" || paso === "sin_especialidad") return this.buscarEspecialidad(texto);
    if (paso === "elegir_medico") return especialidadEnTexto(texto) ? this.buscarEspecialidad(texto) : this.buscarMedico(texto);
    if (paso === "prospecto") return this.guardarProspecto(texto);
    if (paso === "nombre" && this.medico) {
      const n = limpiarNombre(texto);
      if (n.length < 3) return [{ tipo: "texto", texto: "¿Me escribe el nombre completo, por favor? (nombre y apellido)" }];
      this.datos.nombre = n;
      return this.confirmar();
    }

    const afirma = /^(s[ií]|si,|claro|confirm|ok|dale|listo|correcto|de acuerdo)/i.test(sinAcentos(texto.toLowerCase()));
    const niega = /^(no\b|nel|mejor no)/i.test(sinAcentos(texto.toLowerCase()));
    if (this.medico && paso === "quien") {
      if (afirma) { this.datos.nombre = this.datos.nombreSugerido; return this.confirmar(); }
      if (!niega && limpiarNombre(texto).split(" ").length >= 2 && !/\d/.test(texto)) {
        this.datos.nombre = limpiarNombre(texto);
        return this.confirmar();
      }
      if (niega) { this.ir("nombre"); return [{ tipo: "texto", texto: "Escriba el *nombre completo* de la persona que irá a la cita." }]; }
    }
    if (this.medico && paso === "confirmar" && afirma) return this.crear();
    if (this.medico && paso === "cabecera" && afirma) return this.iniciarAgenda();
    if (paso === "cabecera" && niega) return this.medicosDeEspecialidad(ESPECIALIDADES.findIndex((x) => x.nombre === this.datos.especialidad));
    if (paso === "cabecera" && especialidadEnTexto(texto)) return this.buscarEspecialidad(texto);
    if (this.medico && paso === "cancelar" && afirma) return this.cancelar();
    if (this.medico && paso === "cancelar" && niega) return this.menu("Perfecto, su cita sigue en pie. ¿Le ayudo con algo más?");

    const ip = await this.interpretar(texto);

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
    // Texto suelto mientras se elige servicio, día u hora: aprovechar lo que entendió la IA.
    if (["servicio", "dia", "hora"].includes(paso) && (ip.fecha || ip.hora || ip.servicio || ip.parte_dia)) {
      return this.iniciarAgenda(ip, true);
    }
    if (paso === "consulta") return this.responder(ip);
    return this.repetir("Disculpe, no le entendí bien 🙏");
  }

  async interpretar(texto: string): Promise<Interpretacion> {
    const opciones = this.opcionesVisibles();
    let ip: Interpretacion | null = null;
    try {
      ip = await this.d.cerebro.interpretar(texto, {
        medico: this.medico, paso: this.conv.paso, hoy: fechaLocal(this.d.ahora), ahora: this.d.ahora, opciones,
      });
    } catch (_) { ip = null; }
    return ip || interpretarSinIA(texto);
  }

  opcionesVisibles(): string[] {
    const m = this.medico;
    if (!m) return [];
    return (m.servicios || []).map((s) => s.nombre);
  }

  /** Vuelve a mostrar lo que se esperaba en el paso actual. */
  async repetir(prefijo?: string): Promise<Salida[]> {
    const p = this.conv.paso;
    const pre: Salida[] = prefijo ? [{ tipo: "texto", texto: `${prefijo} Puede usar las opciones o escribir *menú* para empezar de nuevo.` }] : [];
    if (p === "servicio") return [...pre, ...(await this.iniciarAgenda())];
    if (p === "dia") return [...pre, ...(await this.mostrarDias())];
    if (p === "hora") return [...pre, ...(await this.mostrarHoras())];
    if (p === "confirmar") return [...pre, ...this.confirmar()];
    return [...pre, ...this.menu("¿En qué le puedo ayudar?")];
  }

  // ----- Agendar -----
  servicios(): Servicio[] {
    return (this.medico?.servicios || []).filter((s) => s && s.nombre);
  }
  servicioElegido(): Servicio | null {
    const i = this.datos.servicio;
    return typeof i === "number" ? this.servicios()[i] || null : null;
  }

  async iniciarAgenda(ip?: Interpretacion, mantener = false): Promise<Salida[]> {
    const servicios = this.servicios();
    if (!servicios.length) {
      return [{ tipo: "texto", texto: "Este consultorio todavía no tiene servicios para agendar por aquí." }, ...this.contacto()];
    }
    if (!mantener || this.datos.servicio == null) {
      const citaId = this.datos.citaId;
      this.conv.datos = citaId ? { citaId, servicio: this.datos.servicio } : {};
    }
    if (ip?.servicio) {
      const buscado = sinAcentos(ip.servicio.toLowerCase());
      const i = servicios.findIndex((s) => sinAcentos(s.nombre.toLowerCase()) === buscado) >= 0
        ? servicios.findIndex((s) => sinAcentos(s.nombre.toLowerCase()) === buscado)
        : servicios.findIndex((s) => sinAcentos(s.nombre.toLowerCase()).includes(buscado) || buscado.includes(sinAcentos(s.nombre.toLowerCase())));
      if (i >= 0) this.datos.servicio = i;
    }
    if (servicios.length === 1) this.datos.servicio = 0;
    if (ip?.parte_dia) this.datos.parte = ip.parte_dia;
    if (ip?.hora) this.datos.horaPreferida = ip.hora;
    if (this.datos.servicio == null) {
      this.ir("servicio");
      return [{
        tipo: "lista", texto: "¿Qué servicio necesita?", boton: "Ver servicios",
        secciones: [{
          titulo: "Servicios", filas: servicios.slice(0, 10).map((s, i) => ({
            id: `srv:${i}`, titulo: corto(s.nombre, 24),
            descripcion: corto([s.duracion, lempiras(s.precio)].filter(Boolean).join(" · "), 72),
          })),
        }],
      }];
    }
    if (ip?.fecha) return this.mostrarDias(undefined, ip.fecha);
    return this.mostrarDias();
  }

  async ocupado(): Promise<{ id: string; inicio: string; fin: string }[]> {
    const dias = diasDeAnticipacion(this.medico!.anticipacion) + 2;
    const lista = await this.d.almacen.citasOcupadas(this.medico!.id, this.d.ahora, new Date(this.d.ahora.getTime() + dias * 86400_000));
    return lista.filter((c) => c.id !== this.datos.citaId);
  }

  async mostrarDias(desde?: string, fechaPedida?: string): Promise<Salida[]> {
    const m = this.medico!, serv = this.servicioElegido();
    if (!serv) return this.iniciarAgenda();
    const dur = minutos(serv.duracion) || 30;
    const [ocupado, feriados] = [await this.ocupado(), await this.d.almacen.feriados()];
    const pre: Salida[] = [];

    if (fechaPedida) {
      const rangos = rangosLibres(m, feriados, Number(fechaPedida.slice(0, 4)));
      const libres = horariosDelDia(m, fechaPedida, dur, ocupado, rangos, this.d.ahora);
      if (libres.length) {
        this.datos.dia = fechaPedida;
        return this.mostrarHoras();
      }
      const motivo = motivoSinHorario(m, fechaPedida, feriados, this.d.ahora) || "ya no quedan espacios libres";
      pre.push({ tipo: "texto", texto: `El ${fechaLarga(fechaPedida).toLowerCase()} ${motivo}. Estos son los próximos días con espacio:` });
      desde = fechaPedida > fechaLocal(this.d.ahora) ? fechaPedida : undefined;
    }

    const dias = diasDisponibles(m, dur, ocupado, feriados, this.d.ahora, desde, 8);
    if (!dias.length) {
      this.ir("menu");
      return [...pre, { tipo: "texto", texto: "Por ahora no hay horarios disponibles en las próximas semanas. 😕" }, ...this.contacto()];
    }
    const filas: Fila[] = dias.slice(0, 7).map((x) => ({
      id: `dia:${x.fecha}`,
      titulo: corto(fechaLarga(x.fecha).replace(/ de (\w{3})\w*$/, " de $1"), 24),
      descripcion: `${x.libres.length} ${x.libres.length === 1 ? "horario" : "horarios"} · desde ${hora12(x.libres[0])}`,
    }));
    if (dias.length > 7) filas.push({ id: `dia:mas:${sumarDias(dias[6].fecha, 1)}`, titulo: "Ver más fechas", descripcion: "Siguientes días con espacio" });
    this.ir("dia");
    return [...pre, {
      tipo: "lista", texto: `*${serv.nombre}*${serv.duracion ? ` (${serv.duracion})` : ""}\n¿Qué día le queda mejor?`,
      boton: "Ver días", secciones: [{ titulo: "Días disponibles", filas }],
    }];
  }

  async mostrarHoras(op: { desde?: number } = {}): Promise<Salida[]> {
    const m = this.medico!, serv = this.servicioElegido(), fecha = this.datos.dia;
    if (!serv || !fecha) return this.mostrarDias();
    const dur = minutos(serv.duracion) || 30;
    const [ocupado, feriados] = [await this.ocupado(), await this.d.almacen.feriados()];
    let libres = horariosDelDia(m, fecha, dur, ocupado, rangosLibres(m, feriados, Number(fecha.slice(0, 4))), this.d.ahora);
    if (!libres.length) {
      return [{ tipo: "texto", texto: "Ese día ya se llenó. Elija otro, por favor:" }, ...(await this.mostrarDias())];
    }
    const pre: Salida[] = [];
    // Preferencias que entendió la IA ("a las 10", "en la tarde").
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
      const filtrados = libres.filter((t) => (minutosLocales(t) >= 12 * 60) === tarde);
      delete this.datos.parte;
      if (filtrados.length) libres = filtrados;
      else pre.push({ tipo: "texto", texto: `En la ${tarde ? "tarde" : "mañana"} ya no hay espacio ese día. Estos son los horarios libres:` });
    }
    const desde = op.desde || 0;
    const pagina = libres.slice(desde, desde + 8);
    const filasM = pagina.filter((t) => minutosLocales(t) < 720).map((t) => ({ id: `hora:${t.getTime()}`, titulo: hora12(t) }));
    const filasT = pagina.filter((t) => minutosLocales(t) >= 720).map((t) => ({ id: `hora:${t.getTime()}`, titulo: hora12(t) }));
    const otras: Fila[] = [];
    if (libres.length > desde + 8) otras.push({ id: `hora:mas:${desde + 8}`, titulo: "Ver más horarios" });
    otras.push({ id: "dia:otro", titulo: "Elegir otro día" });
    const secciones = [
      ...(filasM.length ? [{ titulo: "Mañana", filas: filasM }] : []),
      ...(filasT.length ? [{ titulo: "Tarde", filas: filasT }] : []),
      { titulo: "Otras opciones", filas: otras },
    ];
    this.ir("hora");
    return [...pre, { tipo: "lista", texto: `*${fechaLarga(fecha)}*\n¿A qué hora?`, boton: "Ver horarios", secciones }];
  }

  async pedirNombre(): Promise<Salida[]> {
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
        tipo: "botones", texto: `¿La cita es para *${sugerido}*?`,
        botones: [{ id: "nom:si", titulo: corto(`Sí, para ${sugerido.split(" ")[0]}`, 20) }, { id: "nom:otro", titulo: "Otra persona" }],
      }];
    }
    this.ir("nombre");
    return [{ tipo: "texto", texto: "¿A nombre de quién agendo la cita? Escriba *nombre y apellido*." }];
  }

  resumen(): string {
    const m = this.medico!, serv = this.servicioElegido()!, inicio = new Date(this.datos.hora);
    return [
      `📅 ${fechaLarga(fechaLocal(inicio))}, ${hora12(inicio)}`,
      `🩺 ${serv.nombre}${serv.duracion ? ` (${serv.duracion})` : ""}${lempiras(serv.precio) ? ` · ${lempiras(serv.precio)}` : ""}`,
      `👤 ${this.datos.nombre}`,
      `👨‍⚕️ ${nombreMedico(m)}`,
      m.direccion || m.consultorio ? `📍 ${lugarMedico(m)}` : "",
    ].filter(Boolean).join("\n");
  }

  confirmar(): Salida[] {
    if (!this.servicioElegido() || !this.datos.hora || !this.datos.nombre) return this.menu();
    this.ir("confirmar");
    const titulo = this.datos.citaId ? "Así quedaría su cita *reagendada*:" : "Revise su cita:";
    return [{
      tipo: "botones", texto: `${titulo}\n\n${this.resumen()}`,
      botones: [{ id: "conf:si", titulo: "Confirmar" }, { id: "conf:hora", titulo: "Cambiar horario" }, { id: "conf:no", titulo: "Cancelar" }],
    }];
  }

  async crear(): Promise<Salida[]> {
    const m = this.medico!, serv = this.servicioElegido(), a = this.d.almacen;
    if (!serv || !this.datos.hora || !this.datos.nombre) return this.menu();
    const inicio = new Date(this.datos.hora), dur = minutos(serv.duracion) || 30;
    const fecha = fechaLocal(inicio);
    const libres = horariosDelDia(m, fecha, dur, await this.ocupado(), rangosLibres(m, await a.feriados(), Number(fecha.slice(0, 4))), this.d.ahora);
    if (!libres.some((t) => t.getTime() === inicio.getTime())) {
      this.datos.dia = fecha;
      return [{ tipo: "texto", texto: "Disculpe, ese horario se acaba de ocupar. Elija otro, por favor:" }, ...(await this.mostrarHoras())];
    }
    let pac = await a.paciente(this.e.telefono);
    if (!pac) pac = await a.guardarPaciente(this.e.telefono, this.datos.nombre);
    else if (!pac.nombre) pac = await a.guardarPaciente(this.e.telefono, this.datos.nombre);

    const precio = Number(String(serv.precio ?? "").replace(/\D/g, "")) || null;
    const res = await a.crearCita({
      medico_id: m.id, paciente_id: pac.id, nombre_paciente: this.datos.nombre, servicio: serv.nombre,
      duracion_min: dur, precio, inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + dur * 60_000).toISOString(),
      reagendada_de: this.datos.citaId || null,
    });
    if (res === "ocupado") {
      this.datos.dia = fecha;
      return [{ tipo: "texto", texto: "Disculpe, ese horario se acaba de ocupar. Elija otro, por favor:" }, ...(await this.mostrarHoras())];
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
    const mapa = m.ubicacion_gps ? `\n🗺️ ${m.ubicacion_gps}` : "";
    return [{
      tipo: "texto",
      texto: `✅ ¡Listo! Su cita quedó ${reagendada ? "reagendada" : "agendada"}:\n\n${resumen}${mapa}\n\nLe enviaré un recordatorio el día anterior por la tarde. Si necesita cambiarla o cancelarla, escriba *mis citas*.`,
    }];
  }

  // ----- Mis citas -----
  async misCitas(intencion?: Intencion): Promise<Salida[]> {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const citas = pac ? await this.d.almacen.citasFuturas(pac.id, this.medico!.id, this.d.ahora) : [];
    if (!citas.length) {
      return this.menu(`No tiene citas próximas con ${nombreMedico(this.medico!)}. ¿Desea agendar una?`);
    }
    if (citas.length === 1 && (intencion === "reagendar" || intencion === "cancelar")) {
      this.datos.citaId = citas[0].id;
      return intencion === "reagendar" ? this.reagendar() : this.preguntarCancelar();
    }
    this.ir("mis_citas", {});
    return [{
      tipo: "lista", texto: citas.length === 1 ? "Esta es su próxima cita:" : "Estas son sus próximas citas:", boton: "Ver citas",
      secciones: [{
        titulo: "Próximas citas", filas: citas.slice(0, 10).map((c) => ({
          id: `cita:${c.id}`, titulo: corto(`${fechaCorta(fechaLocal(new Date(c.inicio)))} · ${hora12(new Date(c.inicio))}`, 24),
          descripcion: corto([c.servicio, c.nombre_paciente].filter(Boolean).join(" · "), 72),
        })),
      }],
    }];
  }

  async citaPropia(id: string): Promise<Cita | null> {
    const pac = await this.d.almacen.paciente(this.e.telefono);
    const c = await this.d.almacen.cita(id);
    if (!c || !pac || c.paciente_id !== pac.id || c.estado !== "confirmada" || new Date(c.inicio) < this.d.ahora) return null;
    return c;
  }

  async accionesCita(id: string): Promise<Salida[]> {
    const c = await this.citaPropia(id);
    if (!c) return this.medico ? this.menu("Esa cita ya no está disponible. ¿En qué le puedo ayudar?") : this.inicio();
    if (!this.medico || this.medico.id !== c.medico_id) this.medico = await this.d.almacen.medicoPorId(c.medico_id);
    if (!this.medico) return this.inicio();
    this.ir("cita", { citaId: c.id });
    const i = new Date(c.inicio);
    return [{
      tipo: "botones",
      texto: `Su cita con ${conArticuloNegrita(this.medico)}:\n\n📅 ${fechaLarga(fechaLocal(i))}, ${hora12(i)}\n🩺 ${c.servicio}${c.nombre_paciente ? `\n👤 ${c.nombre_paciente}` : ""}\n\n¿Qué desea hacer?`,
      botones: [{ id: "acc:reagendar", titulo: "Reagendar" }, { id: "acc:cancelar", titulo: "Cancelar cita" }, { id: "acc:volver", titulo: "Volver" }],
    }];
  }

  async reagendar(): Promise<Salida[]> {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.misCitas();
    const i = this.servicios().findIndex((s) => s.nombre === c.servicio);
    this.conv.datos = { citaId: c.id, servicio: i >= 0 ? i : undefined };
    const ini = new Date(c.inicio);
    const aviso: Salida = { tipo: "texto", texto: `Vamos a reagendar la cita${c.nombre_paciente ? ` de *${c.nombre_paciente}*` : ""} del *${fechaLarga(fechaLocal(ini)).toLowerCase()}, ${hora12(ini)}* 📅` };
    if (i < 0) return [aviso, ...(await this.iniciarAgenda(undefined, true))];
    return [aviso, ...(await this.mostrarDias())];
  }

  async preguntarCancelar(): Promise<Salida[]> {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.misCitas();
    this.ir("cancelar", { citaId: c.id });
    const i = new Date(c.inicio);
    return [{
      tipo: "botones", texto: `¿Está seguro de cancelar su cita del *${fechaLarga(fechaLocal(i)).toLowerCase()}, ${hora12(i)}*?`,
      botones: [{ id: "canc:si", titulo: "Sí, cancelar" }, { id: "canc:no", titulo: "No, mantenerla" }],
    }];
  }

  async cancelar(): Promise<Salida[]> {
    const c = this.datos.citaId ? await this.citaPropia(this.datos.citaId) : null;
    if (!c) return this.menu("Esa cita ya no está disponible. ¿En qué le puedo ayudar?");
    await this.d.almacen.cancelarCita(c.id, "paciente");
    await this.d.avisos.citaCancelada(this.medico!, c, this.e.telefono);
    return this.menu("Su cita quedó *cancelada*. Ya le avisé al consultorio. ¿Desea agendar otra?");
  }

  // ----- Respuesta al recordatorio -----
  async respuestaRecordatorio(accion: string, citaId: string): Promise<Salida[]> {
    const c = await this.d.almacen.cita(citaId);
    const pac = await this.d.almacen.paciente(this.e.telefono);
    if (!c || !pac || c.paciente_id !== pac.id) return this.medico ? this.menu("No encontré esa cita. ¿En qué le puedo ayudar?") : this.inicio();
    const m = await this.d.almacen.medicoPorId(c.medico_id);
    if (!m) return this.inicio();
    this.medico = m;
    if (c.estado !== "confirmada" || new Date(c.inicio) < this.d.ahora) {
      if (accion === "si") { this.sinGuardar = true; return [{ tipo: "texto", texto: "Esa cita ya no está activa." }]; }
      return this.menu("Esa cita ya no está activa. ¿En qué le puedo ayudar?");
    }
    if (accion === "cambiar") { this.conv.datos = { citaId: c.id }; return this.reagendar(); }
    if (accion === "cancelar") { this.conv.datos = { citaId: c.id }; return this.preguntarCancelar(); }
    await this.d.almacen.confirmarAsistencia(c.id);
    // Confirmar no cambia la conversación: si el paciente está a mitad de otra gestión
    // (por ejemplo, reagendando otra cita), la deja intacta.
    this.sinGuardar = true;
    const i = new Date(c.inicio);
    const lugar = [m.consultorio, m.direccion].filter(Boolean).join(", ");
    return [{
      tipo: "texto",
      texto: `¡Gracias por confirmar! 🙌 Le esperamos el *${fechaLarga(fechaLocal(i)).toLowerCase()} a las ${hora12(i)}*${lugar ? `

📍 ${lugar}` : ""}${m.ubicacion_gps ? `
🗺️ ${m.ubicacion_gps}` : ""}`,
    }];
  }

  // ----- Preguntas -----
  async responder(ip: Interpretacion): Promise<Salida[]> {
    this.ir("consulta", {});
    const botones: Boton[] = [{ id: "cons:agendar", titulo: "Agendar cita" }, { id: "cons:consultorio", titulo: "Escribir al consultorio" }, { id: "cons:menu", titulo: "Menú" }];
    if (ip.respuesta && ip.puede_responder !== false) {
      return [{ tipo: "botones", texto: ip.respuesta, botones }];
    }
    return [{ tipo: "texto", texto: "Esa pregunta es mejor que se la responda el consultorio directamente." }, ...this.contacto()];
  }

  contacto(): Salida[] {
    const m = this.medico;
    if (!m) return this.inicio();
    const num = (m.derivar_a === "Otro número" ? m.whatsapp_secretaria : m.whatsapp_consultorio) || m.whatsapp_consultorio || "";
    const digitos = num.replace(/\D/g, "");
    const wa = digitos ? `https://wa.me/${digitos.length === 8 ? "504" + digitos : digitos}` : "";
    const lineas = [
      wa ? `💬 WhatsApp del consultorio: ${wa}` : "",
      m.telefono_consultorio ? `📞 Teléfono: ${m.telefono_consultorio}` : "",
    ].filter(Boolean);
    this.ir("menu", {});
    return [{ tipo: "botones", texto: lineas.length ? `Puede comunicarse con el consultorio aquí:\n\n${lineas.join("\n")}` : "Por ahora no tengo otro contacto del consultorio.", botones: BOTONES_MENU }];
  }

  // ----- Buscar médico -----
  async buscarMedico(texto: string): Promise<Salida[]> {
    const lista = (await this.d.almacen.buscarMedicos(texto)).filter((m) => disponible(m, this.d));
    if (!lista.length) {
      this.ir("buscar_especialidad", {});
      return [{
        tipo: "botones",
        texto: `No encontré a ese médico en *Aidú Med* 🙏 Revise el nombre o escriba la *especialidad* que busca (por ejemplo: *pediatra* o *dentista*).${this.medico ? `\n\nSi prefiere, puede seguir con ${conArticuloNegrita(this.medico)}.` : ""}`,
        botones: [
          ...(this.medico ? [{ id: `reg:mismo:${this.medico.id}`, titulo: "Seguir con el mismo" }] : []),
          { id: "ini:medico", titulo: "Soy médico" },
        ],
      }];
    }
    if (lista.length === 1) {
      this.medico = lista[0];
      return this.saludo();
    }
    return [{
      tipo: "lista", texto: "Encontré estos médicos. ¿Cuál es el suyo?", boton: "Ver médicos",
      secciones: [{
        titulo: "Médicos", filas: lista.slice(0, 10).map((m) => ({
          id: `med:${m.id}`, titulo: corto(nombreMedico(m), 24), descripcion: corto([especialidad(m), m.consultorio].filter(Boolean).join(" · "), 72),
        })),
      }],
    }];
  }

  // ----- Médicos interesados -----
  prospecto(): Salida[] {
    this.medico = null;
    this.ir("prospecto", {});
    return [{
      tipo: "texto",
      texto: "¡Qué gusto! 😊 *Aidú Med* atiende el WhatsApp de su consultorio 24/7: muestra sus horarios libres, agenda las citas y envía recordatorios.\n\nPuede ver los planes y registrarse aquí: https://aidumed.app\n\nSi prefiere que le contactemos, escríbame su *nombre, especialidad y ciudad*.",
    }];
  }

  async guardarProspecto(texto: string): Promise<Salida[]> {
    await this.d.almacen.guardarProspecto(this.e.telefono, this.e.nombrePerfil || null, texto);
    await this.d.avisos.prospecto(this.e.telefono, this.e.nombrePerfil, texto);
    this.ir("inicio", {});
    return [{ tipo: "texto", texto: "¡Gracias! El equipo de Aidú Med le escribirá muy pronto por este medio. 🙌" }];
  }
}
