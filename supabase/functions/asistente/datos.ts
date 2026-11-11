// Aidú Med · Acceso a la base de datos (Supabase) para el asistente.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Almacen, Cita, Medico } from "./flujo.ts";

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function crearAlmacen(sb: SupabaseClient): Almacen & {
  registrar(telefono: string, direccion: "entrante" | "saliente", contenido: unknown, metaId?: string | null, medicoId?: string | null): Promise<void>;
  medicoDeConversacion(telefono: string): Promise<string | null>;
  yaProcesado(metaId: string): Promise<boolean>;
} {
  const falla = (r: { error: any }) => { if (r.error) throw r.error; };
  return {
    async conversacion(telefono) {
      const r = await sb.from("conversaciones").select("*").eq("telefono", telefono).maybeSingle();
      falla(r);
      return r.data;
    },
    async guardarConversacion(c) {
      falla(await sb.from("conversaciones").upsert({ ...c, actualizada_at: new Date().toISOString() }));
    },
    async medicoPorId(id) {
      const r = await sb.from("medicos").select("*").eq("id", id).maybeSingle();
      falla(r);
      return r.data as Medico | null;
    },
    async medicoPorCodigo(codigo) {
      const r = await sb.from("medicos").select("*").ilike("codigo", codigo).maybeSingle();
      falla(r);
      return r.data as Medico | null;
    },
    async buscarMedicos(texto) {
      const r = await sb.from("medicos").select("*").in("estado", ["activo", "aprobado"]);
      falla(r);
      const palabras = sinAcentos(texto).replace(/\b(dr|dra|doctor|doctora|el|la|de|del|con)\b\.?/g, " ").split(/\s+/).filter((p) => p.length >= 3);
      if (!palabras.length) return [];
      return (r.data as Medico[]).filter((m) => {
        const t = sinAcentos(`${m.nombre || ""} ${m.consultorio || ""}`);
        return palabras.every((p) => t.includes(p));
      });
    },
    async paciente(telefono) {
      const r = await sb.from("pacientes").select("*").eq("telefono", telefono).maybeSingle();
      falla(r);
      return r.data;
    },
    async guardarPaciente(telefono, nombre) {
      const r = await sb.from("pacientes").upsert({ telefono, nombre }, { onConflict: "telefono" }).select().single();
      falla(r);
      return r.data;
    },
    async citasOcupadas(medicoId, desde, hasta) {
      const r = await sb.from("citas").select("id, inicio, fin").eq("medico_id", medicoId).eq("estado", "confirmada")
        .lt("inicio", hasta.toISOString()).gt("fin", desde.toISOString());
      falla(r);
      return r.data || [];
    },
    async citasFuturas(pacienteId, medicoId, ahora) {
      const r = await sb.from("citas").select("*").eq("paciente_id", pacienteId).eq("medico_id", medicoId)
        .eq("estado", "confirmada").gt("inicio", ahora.toISOString()).order("inicio");
      falla(r);
      return (r.data || []) as Cita[];
    },
    async historial(pacienteId) {
      const r = await sb.from("citas").select("medico_id, inicio, estado").eq("paciente_id", pacienteId).order("inicio", { ascending: false }).limit(50);
      falla(r);
      return r.data || [];
    },
    async citasFuturasTodas(pacienteId, ahora) {
      const r = await sb.from("citas").select("*").eq("paciente_id", pacienteId)
        .eq("estado", "confirmada").gt("inicio", ahora.toISOString()).order("inicio").limit(10);
      falla(r);
      return (r.data || []) as Cita[];
    },
    async medicosDisponibles() {
      const r = await sb.from("medicos").select("*").in("estado", ["activo", "aprobado"]);
      falla(r);
      return (r.data || []) as Medico[];
    },
    async guardarSolicitud(telefono, especialidad) {
      await sb.from("solicitudes_pacientes").insert({ telefono, especialidad });
    },
    async cita(id) {
      const r = await sb.from("citas").select("*").eq("id", id).maybeSingle();
      falla(r);
      return r.data as Cita | null;
    },
    async crearCita(c) {
      const r = await sb.from("citas").insert(c).select().single();
      if (r.error?.code === "23P01") return "ocupado"; // otra cita en el mismo horario
      falla(r);
      return r.data as Cita;
    },
    async cancelarCita(id, por) {
      falla(await sb.from("citas").update({ estado: "cancelada", cancelada_por: por, actualizada_at: new Date().toISOString() }).eq("id", id));
    },
    async confirmarAsistencia(id) {
      falla(await sb.from("citas").update({ paciente_confirmo_at: new Date().toISOString(), actualizada_at: new Date().toISOString() }).eq("id", id));
    },
    async feriados() {
      const r = await sb.from("feriados").select("nombre, desde, hasta");
      falla(r);
      return r.data || [];
    },
    async guardarProspecto(telefono, nombre, mensaje) {
      falla(await sb.from("prospectos").insert({ telefono, nombre, mensaje }));
    },
    async registrar(telefono, direccion, contenido, metaId, medicoId) {
      const fila: Record<string, unknown> = { telefono, direccion, contenido, meta_id: metaId || null };
      if (medicoId !== undefined) fila.medico_id = medicoId;
      // Los mensajes que enviamos llevan el tipo, para estimar el costo (plantilla o mensaje de servicio).
      if (direccion === "saliente") fila.tipo = (contenido as any)?.type === "template" ? "plantilla" : "servicio";
      await sb.from("mensajes").insert(fila);
    },
    async medicoDeConversacion(telefono) {
      const r = await sb.from("conversaciones").select("medico_id").eq("telefono", telefono).maybeSingle();
      return (r.data?.medico_id as string) || null;
    },
    async yaProcesado(metaId) {
      const r = await sb.from("mensajes").select("id").eq("meta_id", metaId).limit(1);
      return !!r.data?.length;
    },
  };
}
