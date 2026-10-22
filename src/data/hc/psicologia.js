/* ============================================================================
 *  Plantilla de Psicología — Historia Clínica estructurada (spec §12)
 *  Mismo molde que Cardiología y Clínica:
 *    - core SOAP (motivo/subjetivo/objetivo/plan)
 *    - datos JSONB (contexto, antecedentes, evaluación, seguimiento)
 *  Sin variables numéricas (no genera observaciones) ni medicación.
 *  Notas confidenciales (§26/27): `datos.confidencial`; la API oculta el contenido
 *  a quien no sea el profesional tratante o quien la cargó.
 *  Aplica a "Psicología" y "Psicología (orientación psicoanalítica)".
 * ========================================================================== */

export const esPsicologia = (esp) => /^\s*psicolog/i.test(esp || '')

// Evaluación (spec §12): clave → etiqueta.
export const EVALUACION_PSI = [
  ['estadoEmocional', 'Estado emocional'],
  ['animo', 'Ánimo'],
  ['ansiedad', 'Ansiedad'],
  ['conducta', 'Conducta'],
  ['sueno', 'Sueño'],
  ['relaciones', 'Relaciones interpersonales'],
]

// Categorías de estudio (C4) que suma Psicología al repositorio.
export const CATEGORIAS_ESTUDIO_PSI = ['Informe psicológico', 'Evaluación psicológica (tests)']

const EVALUACION_VACIA = Object.fromEntries(EVALUACION_PSI.map(([k]) => [k, '']))

export const PSICO_VACIO = {
  motivo: '',               // demanda principal
  contextoFamiliar: '',
  contextoLaboral: '',      // laboral / escolar
  tratamientosPrevios: '',
  situacionesRelevantes: '',
  evaluacion: EVALUACION_VACIA,
  objetivos: '',
  evolucionSesion: '',
  intervenciones: '',
  plan: '',
  proximaSesion: '',
  confidencial: true,       // privacidad por defecto (§26): el profesional puede destildarla
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function psicoDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...PSICO_VACIO,
    motivo: ev.motivo || '',
    contextoFamiliar: d.contextoFamiliar || '',
    contextoLaboral: d.contextoLaboral || '',
    tratamientosPrevios: d.tratamientosPrevios || '',
    situacionesRelevantes: d.situacionesRelevantes || '',
    evaluacion: { ...EVALUACION_VACIA, ...(typeof d.evaluacion === 'object' ? d.evaluacion : {}) },
    objetivos: d.objetivos || '',
    evolucionSesion: ev.subjetivo || '',
    intervenciones: d.intervenciones || '',
    plan: ev.plan || '',
    proximaSesion: d.proximoControl || '',
    confidencial: d.confidencial === true,
  }
}

/** Transforma el estado del formulario de Psicología en el payload del backend. */
export function construirPayloadPsico(s) {
  const evaluacion = Object.fromEntries(EVALUACION_PSI.map(([k]) => [k, (s.evaluacion[k] || '').trim()]))
  const objetivo = EVALUACION_PSI.filter(([k]) => evaluacion[k]).map(([k, label]) => `${label}: ${evaluacion[k]}`).join(' · ')

  const datos = {
    plantilla: 'psicologia',
    confidencial: s.confidencial === true,
    contextoFamiliar: s.contextoFamiliar || null,
    contextoLaboral: s.contextoLaboral || null,
    tratamientosPrevios: s.tratamientosPrevios || null,
    situacionesRelevantes: s.situacionesRelevantes || null,
    evaluacion,
    objetivos: s.objetivos || null,
    intervenciones: s.intervenciones || null,
    proximoControl: s.proximaSesion || null, // misma clave que las demás plantillas
  }

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.evolucionSesion || '', // S ≈ evolución de la sesión
    objetivo,                           // O ≈ evaluación
    diagnostico: '',
    plan: s.plan || '',
    medicacion: [],
    datos,
    observaciones: [],
  }
}
