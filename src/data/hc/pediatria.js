/* ============================================================================
 *  Plantilla de Pediatría — Historia Clínica estructurada (spec §10)
 *  Mismo molde que las demás:
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (datos de base, alimentación, vacunación, desarrollo, examen)
 *    - observaciones: peso, talla, imc (MISMOS nombres que el resto) +
 *      perimetro_cefalico → series para las curvas de crecimiento (C2, §23).
 *  Alcance C1: las curvas de percentilos y las alertas automáticas de vacunas
 *  (requieren calendario nacional + edad) quedan para una etapa posterior; acá se
 *  registran los datos que las alimentarán.
 *  Los datos de base (tutor, nacimiento, perinatales) se precargan desde la última
 *  consulta pediátrica del paciente (pediaBaseDesde) para no reescribirlos.
 * ========================================================================== */
import { calcularIMC } from './cardiologia'
import { EXAMEN_CM } from './clinica'

export const esPediatria = (esp) => /^\s*pediatr/i.test(esp || '')

export const TIPO_PARTO = ['Vaginal', 'Cesárea']
export const ALIMENTACION = ['Lactancia materna', 'Fórmula', 'Alimentación complementaria']
export const ESQUEMA_VACUNAS = ['Completo para la edad', 'Incompleto', 'Desconocido']

// Desarrollo (spec §10): clave → etiqueta.
export const DESARROLLO_PED = [
  ['motor', 'Desarrollo motor'],
  ['lenguaje', 'Lenguaje'],
  ['social', 'Desarrollo social'],
  ['escolaridad', 'Escolaridad'],
]

// Examen físico por aparatos: mismos aparatos que Clínica Médica.
export const EXAMEN_PED = EXAMEN_CM

// Categoría de estudio (C4) que suma Pediatría (vacunación registrable, §10).
export const CATEGORIAS_ESTUDIO_PED = ['Carnet de vacunación']

const DESARROLLO_VACIO = Object.fromEntries(DESARROLLO_PED.map(([k]) => [k, '']))
const EXAMEN_VACIO = Object.fromEntries(EXAMEN_PED.map(([k]) => [k, '']))

// Datos de base del niño (se repiten entre consultas → se precargan).
const BASE_VACIA = {
  tutorNombre: '', tutorTelefono: '',
  edadGestacional: '', tipoParto: '', pesoNacer: '', tallaNacer: '',
  perinatales: '',
}

export const PEDIA_VACIO = {
  motivo: '',
  enfermedadActual: '',
  ...BASE_VACIA,
  alimentacion: [],
  alimentacionActual: '',
  esquemaVacunas: '',
  vacunasPendientes: '',
  desarrollo: DESARROLLO_VACIO,
  vitales: { peso: '', talla: '', perimetroCefalico: '' },
  examen: EXAMEN_VACIO,
  diagnostico: '',
  tratamiento: '',
  medicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const baseDesdeDatos = (d) => {
  const b = obj(d.base)
  return {
    tutorNombre: b.tutorNombre || '',
    tutorTelefono: b.tutorTelefono || '',
    edadGestacional: b.edadGestacional ?? '',
    tipoParto: b.tipoParto || '',
    pesoNacer: b.pesoNacer ?? '',
    tallaNacer: b.tallaNacer ?? '',
    perinatales: b.perinatales || '',
  }
}

/** Formulario nuevo con los datos de base de la última consulta pediátrica (o vacío). */
export function pediaBaseDesde(evPrevia) {
  return evPrevia ? { ...PEDIA_VACIO, ...baseDesdeDatos(evPrevia.datos || {}) } : PEDIA_VACIO
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function pediaDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...PEDIA_VACIO,
    ...baseDesdeDatos(d),
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    alimentacion: arr(d.alimentacion),
    alimentacionActual: d.alimentacionActual || '',
    esquemaVacunas: obj(d.vacunacion).esquema || '',
    vacunasPendientes: obj(d.vacunacion).pendientes || '',
    desarrollo: { ...DESARROLLO_VACIO, ...obj(d.desarrollo) },
    vitales: { ...PEDIA_VACIO.vitales, ...obj(d.vitales) },
    examen: { ...EXAMEN_VACIO, ...obj(d.examen) },
    diagnostico: ev.diagnostico || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Pediatría en el payload del backend. */
export function construirPayloadPedia(s) {
  const imc = calcularIMC(s.vitales.peso, s.vitales.talla)

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('peso', num(s.vitales.peso), 'kg')
  push('talla', num(s.vitales.talla), 'cm')
  push('imc', imc, 'kg/m2')
  push('perimetro_cefalico', num(s.vitales.perimetroCefalico), 'cm')

  const examen = Object.fromEntries(EXAMEN_PED.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const desarrollo = Object.fromEntries(DESARROLLO_PED.map(([k]) => [k, (s.desarrollo[k] || '').trim()]))

  const datos = {
    plantilla: 'pediatria',
    base: {
      tutorNombre: s.tutorNombre || null,
      tutorTelefono: s.tutorTelefono || null,
      edadGestacional: num(s.edadGestacional),   // semanas
      tipoParto: s.tipoParto || null,
      pesoNacer: num(s.pesoNacer),               // gramos
      tallaNacer: num(s.tallaNacer),             // cm
      perinatales: s.perinatales || null,
    },
    alimentacion: s.alimentacion,
    alimentacionActual: s.alimentacionActual || null,
    vacunacion: { esquema: s.esquemaVacunas || null, pendientes: s.vacunasPendientes || null },
    desarrollo,
    vitales: s.vitales, // tal cual se cargaron, para reabrir el formulario
    imc,
    examen,
    proximoControl: s.proximoControl || null,
  }

  const objetivo = EXAMEN_PED.filter(([k]) => examen[k]).map(([k, label]) => `${label}: ${examen[k]}`).join(' · ')
  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.enfermedadActual || '',
    objetivo,
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
