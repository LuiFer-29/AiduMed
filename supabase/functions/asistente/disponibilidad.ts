// Cálculo de horarios libres de un médico a partir de su perfil.
import { diaSemana, fechaLocal, instante, pascua, sumarDias } from "./tiempo.ts";

export type Rango = { desde: string; hasta: string; nombre?: string; motivo?: string | null };
export type Servicio = { nombre: string; duracion: string; precio?: string | number | null };
export type Perfil = {
  dias_atencion?: string[] | null;
  hora_desde?: string | null;
  hora_hasta?: string | null;
  tiempo_entre_citas?: string | null;
  anticipacion?: string | null;
  vacaciones?: string[] | null;
  otras_vacaciones?: Rango[] | null;
  aviso_minimo_min?: number | null;
  almuerzo_desde?: string | null;
  almuerzo_hasta?: string | null;
};
export type Ocupado = { inicio: string | Date; fin: string | Date };

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const AVISO_MINIMO_MIN = 60; // si el médico no lo ha definido: no se agenda con menos de 1 hora de anticipación

export function minutos(texto?: string | null): number {
  if (!texto) return 0;
  const n = parseInt(String(texto).replace(/\D/g, ""), 10);
  if (isNaN(n)) return 0;
  return /h/i.test(texto) && !/min/i.test(texto) ? n * 60 : n;
}

export function diasDeAnticipacion(texto?: string | null): number {
  if (!texto) return 30;
  const n = parseInt(texto, 10) || 1;
  if (/semana/i.test(texto)) return n * 7;
  if (/mes/i.test(texto)) return n * 30;
  return 30;
}

/** Rangos de fechas libres del año (vacaciones fijas + feriados variables + fechas propias). */
export function rangosLibres(p: Perfil, feriados: Rango[], anio: number): Rango[] {
  const r: Rango[] = [];
  const vac = p.vacaciones || [];
  for (const a of [anio, anio + 1]) {
    if (vac.includes("Semana Santa")) {
      const domingo = pascua(a);
      r.push({ desde: sumarDias(domingo, -6), hasta: domingo, nombre: "Semana Santa" });
    }
    if (vac.includes("Navidad y Año Nuevo")) {
      r.push({ desde: `${a - 1}-12-24`, hasta: `${a}-01-01`, nombre: "Navidad y Año Nuevo" });
      r.push({ desde: `${a}-12-24`, hasta: `${a + 1}-01-01`, nombre: "Navidad y Año Nuevo" });
    }
  }
  for (const f of feriados) {
    if (vac.includes(f.nombre || "")) r.push(f);
  }
  for (const o of p.otras_vacaciones || []) r.push({ desde: o.desde, hasta: o.hasta || o.desde, nombre: o.motivo || o.nombre || "vacaciones" });
  return r;
}

export function estaLibreElDia(fecha: string, rangos: Rango[]): boolean {
  return !rangos.some((r) => fecha >= r.desde && fecha <= r.hasta);
}

/** Horarios de inicio libres de un día para un servicio de `duracion` minutos. */
export function horariosDelDia(
  p: Perfil, fecha: string, duracion: number, ocupado: Ocupado[], rangos: Rango[], ahora: Date,
): Date[] {
  if (!(p.dias_atencion || []).includes(DIAS[diaSemana(fecha)])) return [];
  if (!estaLibreElDia(fecha, rangos)) return [];
  if (!p.hora_desde || !p.hora_hasta) return [];
  const pausa = minutos(p.tiempo_entre_citas);
  const paso = duracion <= 15 ? 15 : 30;
  const abre = instante(fecha, p.hora_desde), cierra = instante(fecha, p.hora_hasta);
  const minimo = ahora.getTime() + (p.aviso_minimo_min || AVISO_MINIMO_MIN) * 60_000;
  const citas = ocupado.map((o) => ({ i: new Date(o.inicio).getTime(), f: new Date(o.fin).getTime() }));
  const almuerzo = p.almuerzo_desde && p.almuerzo_hasta
    ? { i: instante(fecha, p.almuerzo_desde).getTime(), f: instante(fecha, p.almuerzo_hasta).getTime() } : null;
  const libres: Date[] = [];
  for (let t = abre.getTime(); t + duracion * 60_000 <= cierra.getTime(); t += paso * 60_000) {
    if (t < minimo) continue;
    const fin = t + duracion * 60_000;
    // Respeta la pausa entre citas antes y después.
    const choca = citas.some((c) => c.i < fin + pausa * 60_000 && c.f + pausa * 60_000 > t);
    const comiendo = almuerzo && almuerzo.i < fin && almuerzo.f > t;
    if (!choca && !comiendo) libres.push(new Date(t));
  }
  return libres;
}

/** Próximos días con al menos un horario libre (desde hoy hasta el límite de anticipación). */
export function diasDisponibles(
  p: Perfil, duracion: number, ocupado: Ocupado[], feriados: Rango[], ahora: Date, desdeFecha?: string, maximo = 30,
): { fecha: string; libres: Date[] }[] {
  const hoy = fechaLocal(ahora);
  const limite = sumarDias(hoy, diasDeAnticipacion(p.anticipacion));
  const rangos = rangosLibres(p, feriados, Number(hoy.slice(0, 4)));
  const res: { fecha: string; libres: Date[] }[] = [];
  for (let f = desdeFecha && desdeFecha > hoy ? desdeFecha : hoy; f <= limite && res.length < maximo; f = sumarDias(f, 1)) {
    const libres = horariosDelDia(p, f, duracion, ocupado, rangos, ahora);
    if (libres.length) res.push({ fecha: f, libres });
  }
  return res;
}

/** Explica por qué un día no tiene horarios (para responder "¿atiende el sábado?"). */
export function motivoSinHorario(p: Perfil, fecha: string, feriados: Rango[], ahora: Date): string | null {
  const hoy = fechaLocal(ahora);
  if (fecha < hoy) return "esa fecha ya pasó";
  if (fecha > sumarDias(hoy, diasDeAnticipacion(p.anticipacion))) return "todavía no se abre la agenda para esa fecha";
  if (!(p.dias_atencion || []).includes(DIAS[diaSemana(fecha)])) return `no hay consulta los ${DIAS[diaSemana(fecha)].toLowerCase()}`;
  const r = rangosLibres(p, feriados, Number(hoy.slice(0, 4))).find((x) => fecha >= x.desde && fecha <= x.hasta);
  if (r) return `el consultorio está cerrado por ${r.nombre || "vacaciones"}`;
  return null;
}
