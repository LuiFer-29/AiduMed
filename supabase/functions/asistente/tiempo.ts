// Fechas y horas en Honduras (UTC-6, sin horario de verano).

export const OFFSET = "-06:00";
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha local (YYYY-MM-DD) de un instante. */
export function fechaLocal(d: Date): string {
  return new Date(d.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}

/** Instante a partir de fecha local y "HH:MM". */
export function instante(fecha: string, hhmm: string): Date {
  return new Date(`${fecha}T${hhmm.slice(0, 5)}:00${OFFSET}`);
}

/** Minutos desde medianoche (hora local) de un instante. */
export function minutosLocales(d: Date): number {
  const l = new Date(d.getTime() - 6 * 3600_000);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

export function nombreDia(fecha: string): string {
  return DIAS[diaSemana(fecha)];
}

/** "8:30 a. m." */
export function hora12(d: Date): string {
  const m = minutosLocales(d);
  const h = Math.floor(m / 60), min = m % 60;
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

/** "Martes 11 de noviembre" */
export function fechaLarga(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${nombreDia(fecha)} ${d} de ${MESES[m - 1]}`;
}

/** "Mar 11 nov" */
export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS_CORTOS[diaSemana(fecha)]} ${d} ${MESES_CORTOS[m - 1]}`;
}

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
export function pascua(anio: number): string {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
