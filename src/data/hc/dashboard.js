/* ============================================================================
 *  Dashboard médico (C3, spec §3 de la HCE y del documento HCD)
 *  - Alertas de condición sugeridas (§3.2): punto de partida; cada profesional
 *    marca las que correspondan o escribe la suya (las pautan los profesionales).
 *  - Prioridad visual por especialidad (§3.4): orden de los bloques del resumen.
 *    Definidas: Cardiología y Neumonología (spec §3.4), y Clínica Médica,
 *    Clínica Médica (obesidad) y Endocrinología (bloque metabólico, C2/C3 21/10).
 *    El resto usa el orden general hasta que sus profesionales pauten el propio.
 *  Bloques disponibles:
 *    alertas · diagnosticos · medicacion · vitales(vars) · estudios(tipos) ·
 *    tabaquismo · graficos(vars) · timeline · controles
 * ========================================================================== */
import { esCardiologia } from './cardiologia'
import { esClinica, esClinicaObesidad } from './clinica'
import { esPsicologia } from './psicologia'
import { esNeumonologia } from './neumonologia'
import { esReumatologia } from './reumatologia'
import { esInfectologia } from './infectologia'
import { esNeurologia } from './neurologia'
import { esEndocrino } from './endocrino'
import { esTraumatologia } from './traumatologia'
import { esEcografia } from './ecografia'
import { esPediatria } from './pediatria'
import { esCirugia } from './cirugia'
import { esNutricion } from './nutricion'
import { esGinecologia } from './ginecologia'
import { esKinesiologia } from './kinesiologia'
import { esPsiquiatria } from './psiquiatria'
import { esOftalmologia } from './oftalmologia'

export const ALERTAS_SUGERIDAS = [
  'Alergia', 'Anticoagulación', 'Diabetes', 'Embarazo', 'Marcapasos / CDI',
  'Insuficiencia cardíaca', 'Enfermedad renal', 'Antecedente de IAM / ACV', 'Medicación de alto riesgo',
  'Insulinoterapia', 'Cirugía bariátrica',
]

const VITALES_GENERALES = ['ta_sistolica', 'ta_diastolica', 'fc', 'saturacion', 'temperatura', 'peso', 'imc']

export const PRIORIDAD = {
  // §3.4 Cardiología: Alertas CV → diagnósticos → medicación → TA/FC →
  // ECG/estudios recientes → gráficos CV → línea de tiempo.
  cardiologia: {
    nombre: 'Cardiología',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos' },
      { tipo: 'medicacion' },
      { tipo: 'vitales', titulo: 'TA y FC', vars: ['ta_sistolica', 'ta_diastolica', 'fc'] },
      { tipo: 'estudios', titulo: 'ECG y estudios recientes', tipos: ['ECG', 'Ecocardiograma', 'Holter', 'MAPA', 'Ecoestrés', 'Ergometría', 'SPECT', 'Angiografía', 'TAC coronaria', 'RNM cardíaca', 'Doppler vascular'] },
      { tipo: 'graficos', titulo: 'Gráficos cardiovasculares', vars: ['ta_sistolica', 'fc', 'peso', 'imc', 'ldl', 'colesterol_total'] },
      { tipo: 'timeline' },
    ],
  },
  // §3.4 Neumonología: Diagnóstico respiratorio → saturación →
  // tabaquismo/paquetes-año → espirometría/FEV1 → gráficos.
  neumonologia: {
    nombre: 'Neumonología',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos', titulo: 'Diagnóstico respiratorio' },
      { tipo: 'vitales', titulo: 'Saturación', vars: ['saturacion', 'fr'] },
      { tipo: 'tabaquismo' },
      { tipo: 'vitales', titulo: 'Espirometría', vars: ['fev1', 'fev1_pct'] },
      { tipo: 'estudios', titulo: 'Estudios respiratorios', tipos: ['Espirometría', 'DLCO', 'Test de caminata', 'Oximetría', 'Polisomnografía', 'Radiografía', 'TAC de tórax'] },
      { tipo: 'graficos', titulo: 'Gráficos respiratorios', vars: ['saturacion', 'fev1', 'fev1_pct', 'fr'] },
      { tipo: 'medicacion' },
      { tipo: 'timeline' },
    ],
  },
  // Clínica Médica (§9): visión integral → problemas activos, medicación,
  // signos vitales completos y antropometría; luego estudios, controles y gráficos.
  clinica: {
    nombre: 'Clínica Médica',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos' },
      { tipo: 'medicacion' },
      { tipo: 'vitales', titulo: 'Signos vitales', vars: ['ta_sistolica', 'ta_diastolica', 'fc', 'fr', 'temperatura', 'saturacion'] },
      { tipo: 'vitales', titulo: 'Antropometría', vars: ['peso', 'imc'] },
      { tipo: 'estudios', titulo: 'Últimos estudios' },
      { tipo: 'controles' },
      { tipo: 'graficos', titulo: 'Gráficos clínicos', vars: ['ta_sistolica', 'peso', 'imc', 'fc'] },
      { tipo: 'timeline' },
    ],
  },
  // Clínica Médica (obesidad): el seguimiento es la evolución del peso y el
  // riesgo cardiometabólico → antropometría y metabólico primero.
  obesidad: {
    nombre: 'Clínica Médica (obesidad)',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos' },
      { tipo: 'vitales', titulo: 'Antropometría', vars: ['peso', 'imc', 'cintura'] },
      { tipo: 'vitales', titulo: 'Perfil metabólico', vars: ['glucemia', 'hba1c', 'colesterol_total', 'hdl', 'ldl', 'trigliceridos'] },
      { tipo: 'vitales', titulo: 'Presión arterial', vars: ['ta_sistolica', 'ta_diastolica'] },
      { tipo: 'graficos', titulo: 'Evolución del peso y metabólica', vars: ['peso', 'imc', 'cintura', 'glucemia', 'hba1c'] },
      { tipo: 'medicacion' },
      { tipo: 'controles' },
      { tipo: 'timeline' },
    ],
  },
  // Endocrinología / Diabetología / Ginecoendocrinología: control glucémico,
  // lípidos y tiroides; después antropometría, estudios y gráficos.
  endocrino: {
    nombre: 'Endocrinología',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos' },
      { tipo: 'medicacion' },
      { tipo: 'vitales', titulo: 'Control glucémico', vars: ['glucemia', 'hba1c'] },
      { tipo: 'vitales', titulo: 'Perfil lipídico', vars: ['colesterol_total', 'hdl', 'ldl', 'trigliceridos'] },
      { tipo: 'vitales', titulo: 'Tiroides', vars: ['tsh', 't4_libre'] },
      { tipo: 'vitales', titulo: 'Antropometría y presión arterial', vars: ['peso', 'imc', 'cintura', 'ta_sistolica', 'ta_diastolica'] },
      { tipo: 'estudios', titulo: 'Estudios endocrinológicos', tipos: ['Laboratorio', 'Perfil tiroideo', 'Densitometría ósea', 'Monitoreo glucémico', 'Ecografía'] },
      { tipo: 'graficos', titulo: 'Gráficos metabólicos', vars: ['hba1c', 'glucemia', 'peso', 'ldl', 'tsh', 'imc'] },
      { tipo: 'controles' },
      { tipo: 'timeline' },
    ],
  },
  // Orden general (§3.3): alertas → problemas/diagnósticos → medicación →
  // últimos signos vitales → últimos estudios → controles → gráficos.
  general: {
    nombre: 'General',
    bloques: [
      { tipo: 'alertas' },
      { tipo: 'diagnosticos' },
      { tipo: 'medicacion' },
      { tipo: 'vitales', titulo: 'Últimos signos vitales', vars: VITALES_GENERALES },
      { tipo: 'estudios', titulo: 'Últimos estudios' },
      { tipo: 'controles' },
      { tipo: 'graficos', titulo: 'Gráficos', vars: null },
    ],
  },
}

/** Clave de prioridad para una especialidad (por nombre, cualquier grafía). */
export const prioridadDe = (especialidad, familia) => {
  const f = familiaDe(especialidad, familia)
  return f && PRIORIDAD[f] ? f : 'general'
}

/* Familias de especialidad: agrupan las variantes del catálogo con los MISMOS
 * reconocedores que eligen la plantilla de C1 (ej. "Cardiología", "Cardiología
 * Clínica" y "Cardiología (imágenes…)" → Cardiología). El Resumen se arma por
 * familia: un neumonólogo ve lo de Neumonología del paciente, y así. */
export const FAMILIAS = [
  ['cardiologia', 'Cardiología', esCardiologia],
  // La variante obesidad va ANTES que Clínica: es su propia familia (otro
  // profesional, otro foco de seguimiento), aunque comparta la plantilla de C1.
  ['obesidad', 'Clínica Médica (obesidad)', esClinicaObesidad],
  ['clinica', 'Clínica Médica', esClinica],
  ['psicologia', 'Psicología', esPsicologia],
  ['neumonologia', 'Neumonología', esNeumonologia],
  ['reumatologia', 'Reumatología', esReumatologia],
  ['infectologia', 'Infectología', esInfectologia],
  ['neurologia', 'Neurología', esNeurologia],
  ['endocrino', 'Endocrinología', esEndocrino],
  ['traumatologia', 'Traumatología', esTraumatologia],
  ['ecografia', 'Ecografía', esEcografia],
  ['pediatria', 'Pediatría', esPediatria],
  ['cirugia', 'Cirugía', esCirugia],
  ['nutricion', 'Nutrición', esNutricion],
  ['ginecologia', 'Ginecología', esGinecologia],
  ['kinesiologia', 'Kinesiología', esKinesiologia],
  ['psiquiatria', 'Psiquiatría', esPsiquiatria],
  ['oftalmologia', 'Oftalmología', esOftalmologia],
]

/** Familia de HC de una especialidad.
 *  `familia` = el DATO que manda el servidor (columna especialidad.familia, se
 *  administra en Configuración → Especialidades): es la fuente de verdad.
 *   - string → esa familia;  null → sin plantilla propia (formulario general):
 *     agrupa por su propio nombre ("otra:hemodinamia").
 *   - undefined → el servidor aún no la envía (antes del deploy): RESPALDO por
 *     nombre con los reconocedores de las plantillas, para no romper la transición. */
export function familiaDe(especialidad, familia) {
  const n = String(especialidad || '').trim()
  if (familia !== undefined) return familia || (n ? `otra:${n.toLowerCase()}` : null)
  if (!n) return null
  const f = FAMILIAS.find(([, , es]) => es(n))
  return f ? f[0] : `otra:${n.toLowerCase()}`
}

/** Nombre legible de una familia (para "otra:…", el nombre original). */
export const nombreFamilia = (familia, especialidadOriginal) =>
  FAMILIAS.find(([k]) => k === familia)?.[1] || especialidadOriginal || familia

/** ¿Este rol pauta alertas sobre variables? Secretaría (asistente) solo las ve (spec §26). */
export const puedePautarAlertas = (rol) => rol === 'profesional' || rol === 'dios' || rol === 'administrador'
