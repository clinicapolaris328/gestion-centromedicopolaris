/* ============================================================================
 *  Plantilla de Psiquiatría — Historia Clínica estructurada (spec §13)
 *  Mismo molde que las demás:
 *    - core SOAP: motivo; subjetivo = enfermedad actual; objetivo = examen mental;
 *      diagnóstico; plan = plan terapéutico; medicación = medicación psiquiátrica
 *    - datos JSONB: antecedentes, medicación (filas), examen mental, riesgo
 *    - sin observaciones numéricas
 *  Confidencialidad (§26/27): `datos.confidencial` (por defecto true, como
 *  Psicología). El backend ya la admite para Psiquiatría (lib/confidencial.ts) y
 *  oculta TODO el contenido —incluida la medicación— a quien no sea el
 *  profesional tratante o quien la cargó.
 *  Aplica a "Psiquiatría" (cualquier grafía).
 * ========================================================================== */

export const esPsiquiatria = (esp) => /^\s*psiquiatr/i.test(esp || '')

// Examen mental (campos estructurados, spec §13): clave → etiqueta.
export const EXAMEN_MENTAL = [
  ['apariencia', 'Apariencia'],
  ['actitud', 'Actitud'],
  ['conciencia', 'Conciencia'],
  ['orientacion', 'Orientación'],
  ['atencion', 'Atención'],
  ['memoria', 'Memoria'],
  ['lenguaje', 'Lenguaje'],
  ['pensamiento', 'Pensamiento'],
  ['contenidoPensamiento', 'Contenido del pensamiento'],
  ['percepcion', 'Percepción'],
  ['animo', 'Ánimo'],
  ['afectividad', 'Afectividad'],
  ['psicomotricidad', 'Psicomotricidad'],
  ['juicio', 'Juicio'],
  ['insight', 'Insight'],
]

// Evaluación de riesgo (spec §13): clave → etiqueta.
export const RIESGOS = [
  ['suicida', 'Riesgo suicida'],
  ['autoagresion', 'Riesgo de autoagresión'],
  ['heteroagresion', 'Riesgo de heteroagresión'],
]
export const NIVEL_RIESGO = ['Sin riesgo aparente', 'Bajo', 'Moderado', 'Alto']

// Categoría de estudio (C4). Los estudios NO son confidenciales (la spec limita la
// confidencialidad a las notas de evolución).
export const CATEGORIAS_ESTUDIO_PSQ = ['Informe psiquiátrico']

export const MED_VACIA = { medicamento: '', dosis: '', horario: '' }

const EXAMEN_VACIO = Object.fromEntries(EXAMEN_MENTAL.map(([k]) => [k, '']))
const RIESGO_VACIO = Object.fromEntries(RIESGOS.map(([k]) => [k, '']))

export const PSQ_VACIO = {
  motivo: '',
  enfermedadActual: '',
  diagnosticosPrevios: '',
  internaciones: '',
  intentosAutolesivos: false,
  intentosDetalle: '',
  tratamientosAnteriores: '',
  medicacion: [],
  respuestaEfectos: '',
  examen: EXAMEN_VACIO,
  riesgo: RIESGO_VACIO,
  diagnostico: '',
  plan: '',
  indicaciones: '',
  seguimiento: '',
  confidencial: true,     // privacidad por defecto (§26): el profesional puede destildarla
}

const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const limpiarMeds = (filas) => arr(filas)
  .map((m) => ({
    medicamento: String(m?.medicamento ?? '').trim(),
    dosis: String(m?.dosis ?? '').trim(),
    horario: String(m?.horario ?? '').trim(),
  }))
  .filter((m) => m.medicamento)

/** Texto de un medicamento para la medicación (tabla indicacion). */
export const textoMed = (m) => [m.medicamento, m.dosis, m.horario].filter(Boolean).join(' ')

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function psqDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const a = obj(d.antecedentes)
  return {
    ...PSQ_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    diagnosticosPrevios: a.diagnosticosPrevios || '',
    internaciones: a.internaciones || '',
    intentosAutolesivos: a.intentosAutolesivos === true,
    intentosDetalle: a.intentosDetalle || '',
    tratamientosAnteriores: a.tratamientosAnteriores || '',
    medicacion: limpiarMeds(d.medicacion),
    respuestaEfectos: d.respuestaEfectos || '',
    examen: { ...EXAMEN_VACIO, ...obj(d.examenMental) },
    riesgo: { ...RIESGO_VACIO, ...obj(d.riesgo) },
    diagnostico: ev.diagnostico || '',
    plan: ev.plan || '',
    indicaciones: d.indicaciones || '',
    seguimiento: d.proximoControl || '',
    confidencial: d.confidencial === true,
  }
}

/** Transforma el estado del formulario de Psiquiatría en el payload del backend. */
export function construirPayloadPsq(s) {
  const examenMental = Object.fromEntries(EXAMEN_MENTAL.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const riesgo = Object.fromEntries(RIESGOS.map(([k]) => [k, s.riesgo[k] || '']))
  const medicacion = limpiarMeds(s.medicacion)

  const datos = {
    plantilla: 'psiquiatria',
    confidencial: s.confidencial === true,
    antecedentes: {
      diagnosticosPrevios: s.diagnosticosPrevios || null,
      internaciones: s.internaciones || null,
      intentosAutolesivos: s.intentosAutolesivos === true,
      intentosDetalle: s.intentosAutolesivos ? (s.intentosDetalle || null) : null,
      tratamientosAnteriores: s.tratamientosAnteriores || null,
    },
    medicacion,
    respuestaEfectos: s.respuestaEfectos || null,
    examenMental,
    riesgo,
    indicaciones: s.indicaciones || null,
    proximoControl: s.seguimiento || null, // misma clave que las demás plantillas
  }

  const objetivo = EXAMEN_MENTAL.filter(([k]) => examenMental[k]).map(([k, label]) => `${label}: ${examenMental[k]}`).join(' · ')

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.enfermedadActual || '',
    objetivo,
    diagnostico: s.diagnostico || '',
    plan: s.plan || '',
    medicacion: medicacion.map(textoMed),
    datos,
    observaciones: [],
  }
}
