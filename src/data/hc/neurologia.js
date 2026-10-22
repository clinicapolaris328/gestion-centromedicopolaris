/* ============================================================================
 *  Plantilla de Neurología — Historia Clínica estructurada
 *  Mismo molde que las demás (data/hc/cardiologia.js):
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (síntomas, antecedentes, examen por dominio, escalas)
 *    - observaciones (variables numéricas → gráficos automáticos)
 *  Las variables compartidas usan los MISMOS nombres que las demás plantillas
 *  (ta_sistolica, fc, saturacion, peso, talla, imc) → una sola serie por paciente.
 * ========================================================================== */
import { calcularIMC } from './cardiologia'

export const esNeurologia = (esp) => /^\s*neurolog/i.test(esp || '')

export const SINTOMAS_NEURO = [
  'Cefalea', 'Mareo / vértigo', 'Déficit de fuerza', 'Alteración sensitiva',
  'Convulsiones', 'Pérdida de conocimiento', 'Trastorno de la marcha', 'Temblor',
  'Alteración del habla', 'Trastorno de memoria', 'Trastorno visual', 'Asintomático',
]

export const ANTECEDENTES_NEURO = [
  'HTA', 'Diabetes', 'Dislipemia', 'Tabaquismo', 'ACV / AIT previo', 'Epilepsia',
  'Migraña', 'Enfermedad de Parkinson', 'Deterioro cognitivo / demencia',
  'TEC previo', 'Tumor del SNC', 'Esclerosis múltiple',
]

// Examen neurológico por dominio (clave → etiqueta).
export const EXAMEN_NEURO = [
  ['estadoMental', 'Estado mental'],
  ['paresCraneales', 'Pares craneales'],
  ['motor', 'Motor / fuerza'],
  ['sensitivo', 'Sensibilidad'],
  ['reflejos', 'Reflejos'],
  ['coordinacion', 'Coordinación'],
  ['marcha', 'Marcha'],
]

export const ESTUDIOS_NEURO = [
  'TAC de cerebro', 'RMN de cerebro', 'EEG', 'EMG', 'Doppler de vasos de cuello',
  'Punción lumbar', 'Potenciales evocados', 'Polisomnografía',
]

// Categorías de estudio (C4) que suma Neurología al repositorio.
export const CATEGORIAS_ESTUDIO_NEURO = ['EEG', 'EMG', 'Potenciales evocados', 'Polisomnografía']

const EXAMEN_VACIO = Object.fromEntries(EXAMEN_NEURO.map(([k]) => [k, '']))

export const NEURO_VACIO = {
  motivo: '',
  enfermedadActual: '',
  sintomas: [],
  antecedentes: [],
  antecedentesDesc: '',
  vitales: { taSist: '', taDiast: '', fc: '', sat: '', peso: '', talla: '' },
  glasgow: '',
  nihss: '',
  examen: EXAMEN_VACIO,
  diagnostico: '',
  diferenciales: '',
  estudiosSolicitados: [],
  tratamiento: '',
  medicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function neuroDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...NEURO_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    sintomas: d.sintomas || [],
    antecedentes: d.antecedentes || [],
    antecedentesDesc: d.antecedentesDesc || '',
    vitales: { ...NEURO_VACIO.vitales, ...(d.vitales || {}) },
    glasgow: d.glasgow ?? '',
    nihss: d.nihss ?? '',
    examen: { ...EXAMEN_VACIO, ...(typeof d.examen === 'object' ? d.examen : {}) },
    diagnostico: ev.diagnostico || '',
    diferenciales: d.diferenciales || '',
    estudiosSolicitados: d.estudiosSolicitados || [],
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Neurología en el payload del backend. */
export function construirPayloadNeuro(s) {
  const imc = calcularIMC(s.vitales.peso, s.vitales.talla)

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('ta_sistolica', num(s.vitales.taSist), 'mmHg')
  push('ta_diastolica', num(s.vitales.taDiast), 'mmHg')
  push('fc', num(s.vitales.fc), 'lpm')
  push('saturacion', num(s.vitales.sat), '%')
  push('peso', num(s.vitales.peso), 'kg')
  push('talla', num(s.vitales.talla), 'cm')
  push('imc', imc, 'kg/m2')
  push('glasgow', num(s.glasgow), 'pts')
  push('nihss', num(s.nihss), 'pts')

  // Examen: se guarda por dominio (datos) y como texto legible en "objetivo" (SOAP).
  const examen = Object.fromEntries(EXAMEN_NEURO.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const objetivo = EXAMEN_NEURO.filter(([k]) => examen[k]).map(([k, label]) => `${label}: ${examen[k]}`).join(' · ')

  const datos = {
    plantilla: 'neurologia',
    sintomas: s.sintomas,
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    examen,
    glasgow: num(s.glasgow),
    nihss: num(s.nihss),
    diferenciales: s.diferenciales || null,
    estudiosSolicitados: s.estudiosSolicitados,
    proximoControl: s.proximoControl || null,
    vitales: s.vitales, // tal cual se cargaron, para reabrir el formulario
    imc,
  }

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
