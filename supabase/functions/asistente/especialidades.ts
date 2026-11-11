// Aidú Med · Reconoce la especialidad que escribe el paciente ("dentista", "pediatra", "ginecóloga"…), sin IA.
// Cada especialidad: nombre oficial, cómo nombrar a sus médicos (para "Todavía no tenemos pediatras") y raíces de palabras.

export type Especialidad = { nombre: string; plural: string; raices: string[] };

export const ESPECIALIDADES: Especialidad[] = [
  { nombre: "Medicina general", plural: "médicos generales", raices: ["medicina general", "medico general", "doctor general", "general", "chequeo", "consulta general", "medico familiar", "medicina familiar"] },
  { nombre: "Odontología", plural: "dentistas", raices: ["odonto", "dentist", "dental", "muela", "diente", "ortodon", "brackets", "frenos"] },
  { nombre: "Pediatría", plural: "pediatras", raices: ["pediatr", "niño", "nino", "niña", "nina", "bebe", "bebé", "infantil", "hijo", "hija"] },
  { nombre: "Ortopedia", plural: "ortopedistas", raices: ["ortoped", "traumatolog", "hueso", "fractura", "rodilla", "columna"] },
  { nombre: "Nefrología", plural: "nefrólogos", raices: ["nefrolog", "riñon", "rinon", "renal"] },
  { nombre: "Ginecología", plural: "ginecólogos", raices: ["ginecolog", "gineco", "obstetr", "embaraz", "prenatal"] },
  { nombre: "Dermatología", plural: "dermatólogos", raices: ["dermatolog", "piel", "acne", "acné", "manchas"] },
  { nombre: "Cardiología", plural: "cardiólogos", raices: ["cardiolog", "corazon", "corazón", "presion alta", "hipertens"] },
  { nombre: "Oftalmología", plural: "oftalmólogos", raices: ["oftalmolog", "ojo", "vista", "lentes", "optometr"] },
  { nombre: "Otorrinolaringología", plural: "otorrinos", raices: ["otorrin", "oido", "oído", "garganta", "nariz"] },
  { nombre: "Psicología", plural: "psicólogos", raices: ["psicolog", "sicolog", "terapia", "ansiedad", "depresion", "depresión"] },
  { nombre: "Psiquiatría", plural: "psiquiatras", raices: ["psiquiatr", "siquiatr"] },
  { nombre: "Nutrición", plural: "nutricionistas", raices: ["nutri", "dieta", "bajar de peso"] },
  { nombre: "Medicina interna", plural: "internistas", raices: ["internist", "medicina interna"] },
  { nombre: "Endocrinología", plural: "endocrinólogos", raices: ["endocrin", "tiroides", "diabet"] },
  { nombre: "Gastroenterología", plural: "gastroenterólogos", raices: ["gastro", "estomago", "estómago", "colitis", "gastritis"] },
  { nombre: "Neurología", plural: "neurólogos", raices: ["neurolog", "migraña", "migrana", "convulsion"] },
  { nombre: "Urología", plural: "urólogos", raices: ["urolog", "prostata", "próstata"] },
  { nombre: "Neumología", plural: "neumólogos", raices: ["neumolog", "pulmon", "pulmón", "asma"] },
  { nombre: "Fisioterapia", plural: "fisioterapeutas", raices: ["fisioter", "terapia fisica", "rehabilitacion", "rehabilitación"] },
  { nombre: "Cirugía general", plural: "cirujanos", raices: ["cirujan", "cirugia", "cirugía"] },
  { nombre: "Oncología", plural: "oncólogos", raices: ["oncolog", "cancer", "cáncer"] },
  { nombre: "Reumatología", plural: "reumatólogos", raices: ["reumatolog", "artritis"] },
  { nombre: "Alergología", plural: "alergólogos", raices: ["alergolog", "alergia"] },
];

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** La especialidad que menciona el texto, o null. Las raíces más largas ganan ("medicina general" antes que "general"). */
export function especialidadEnTexto(texto: string): Especialidad | null {
  const t = ` ${normal(texto).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ")} `;
  let mejor: { e: Especialidad; largo: number } | null = null;
  for (const e of ESPECIALIDADES) {
    for (const r of [normal(e.nombre), ...e.raices.map(normal)]) {
      if (t.includes(` ${r}`)) { // la raíz debe empezar una palabra ("ojo" no coincide con "rojo")
        if (!mejor || r.length > mejor.largo) mejor = { e, largo: r.length };
      }
    }
  }
  return mejor ? mejor.e : null;
}

/** ¿El médico es de esa especialidad? (también si la escribió en "Otra"). */
export function esDeEspecialidad(m: { especialidad?: string | null; especialidad_otra?: string | null }, e: Especialidad): boolean {
  const suya = m.especialidad === "Otra" ? m.especialidad_otra || "" : m.especialidad || "";
  if (!suya) return false;
  if (normal(suya) === normal(e.nombre)) return true;
  const reconocida = especialidadEnTexto(suya);
  return !!reconocida && reconocida.nombre === e.nombre;
}
