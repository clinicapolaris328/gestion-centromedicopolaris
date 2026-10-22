/* ============================================================================
 *  Plantilla de Clínica Médica — Historia Clínica estructurada (spec §9 + §22)
 *  Mismo molde que Cardiología (data/hc/cardiologia.js):
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (antecedentes por sistema, examen por aparato, plan)
 *    - observaciones (variables numéricas → gráficos automáticos)
 *  Las variables compartidas usan los MISMOS nombres que Cardiología
 *  (ta_sistolica, fc, saturacion, peso, talla, imc) → una sola serie por paciente.
 *  Variante "Clínica Médica (obesidad)": misma plantilla + circunferencia de cintura
 *  + laboratorio metabólico opcional (glucemia, HbA1c, lípidos) con los MISMOS
 *  nombres de variable que Endocrinología → una sola serie metabólica por paciente.
 * ========================================================================== */
import { calcularIMC } from './cardiologia'
import { LAB_METABOLICO, VAR_LAB } from './endocrino'

// Aplica a "Clínica Médica" y "Clínica Médica (obesidad)". No a "Cardiología Clínica"
// (esa empieza por Cardiología y usa su propia plantilla).
export const esClinica = (esp) => /^\s*cl[ií]nica\s+m[eé]dica/i.test(esp || '')
export const esClinicaObesidad = (esp) => esClinica(esp) && /obesidad/i.test(esp || '')

// Antecedentes por sistema (spec §9).
export const ANTECEDENTES_CM = [
  'Cardiovasculares', 'Respiratorios', 'Digestivos', 'Neurológicos', 'Renales',
  'Endocrinológicos', 'Reumatológicos', 'Oncológicos', 'Infecciosos',
]

// Examen físico por aparato (spec §9): clave → etiqueta.
export const EXAMEN_CM = [
  ['general', 'General'],
  ['cardiovascular', 'Cardiovascular'],
  ['respiratorio', 'Respiratorio'],
  ['abdominal', 'Abdominal'],
  ['neurologico', 'Neurológico'],
  ['osteoarticular', 'Osteoarticular'],
  ['piel', 'Piel'],
]

export const ESTUDIOS_CM = [
  'Laboratorio', 'ECG', 'Radiografía', 'Ecografía', 'Tomografía', 'Resonancia',
  'Espirometría', 'Endoscopia', 'Anatomía patológica',
]

// Categorías de estudio (C4) que suma Clínica al repositorio (spec §5).
export const CATEGORIAS_ESTUDIO_CM = ['Espirometría', 'Endoscopia', 'Anatomía patológica', 'Informes externos']

const EXAMEN_VACIO = Object.fromEntries(EXAMEN_CM.map(([k]) => [k, '']))
const LAB_VACIO = Object.fromEntries(LAB_METABOLICO.map(([k]) => [k, '']))

export const CLINICA_VACIO = {
  motivo: '',
  enfermedadActual: '',
  antecedentes: [],
  antecedentesDesc: '',
  vitales: { taSist: '', taDiast: '', fc: '', fr: '', temp: '', sat: '', peso: '', talla: '', cintura: '' },
  examen: EXAMEN_VACIO,
  laboratorio: LAB_VACIO, // solo variante obesidad
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
export function clinicaDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...CLINICA_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    antecedentes: d.antecedentes || [],
    antecedentesDesc: d.antecedentesDesc || '',
    vitales: { ...CLINICA_VACIO.vitales, ...(d.vitales || {}) },
    // En Cardiología `examen` es texto; solo se reabre si viene por aparato (objeto).
    examen: { ...EXAMEN_VACIO, ...(typeof d.examen === 'object' ? d.examen : {}) },
    laboratorio: { ...LAB_VACIO, ...(d.laboratorio || {}) },
    diagnostico: ev.diagnostico || '',
    diferenciales: d.diferenciales || '',
    estudiosSolicitados: d.estudiosSolicitados || [],
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Clínica en el payload del backend.
 *  `obesidad`: variante Clínica Médica (obesidad) → registra además la cintura. */
export function construirPayloadClinica(s, { obesidad = false } = {}) {
  const imc = calcularIMC(s.vitales.peso, s.vitales.talla)
  const vitales = { ...s.vitales }
  if (!obesidad) delete vitales.cintura

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('ta_sistolica', num(vitales.taSist), 'mmHg')
  push('ta_diastolica', num(vitales.taDiast), 'mmHg')
  push('fc', num(vitales.fc), 'lpm')
  push('fr', num(vitales.fr), 'rpm')
  push('temperatura', num(vitales.temp), '°C')
  push('saturacion', num(vitales.sat), '%')
  push('peso', num(vitales.peso), 'kg')
  push('talla', num(vitales.talla), 'cm')
  push('imc', imc, 'kg/m2')
  if (obesidad) push('cintura', num(vitales.cintura), 'cm')

  // Laboratorio metabólico (solo variante obesidad): mismas series que Endocrino.
  const lab = s.laboratorio || {}
  if (obesidad) for (const [k, , unidad] of LAB_METABOLICO) push(VAR_LAB[k], num(lab[k]), unidad)
  const labTexto = obesidad
    ? LAB_METABOLICO.filter(([k]) => lab[k]).map(([k, label, unidad]) => `${label}: ${lab[k]} ${unidad}`).join(' · ')
    : ''

  // Examen: se guarda por aparato (datos) y como texto legible en "objetivo" (SOAP).
  const examen = Object.fromEntries(EXAMEN_CM.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const objetivo = [
    ...EXAMEN_CM.filter(([k]) => examen[k]).map(([k, label]) => `${label}: ${examen[k]}`),
    ...(labTexto ? [`Laboratorio: ${labTexto}`] : []),
  ].join(' · ')

  const datos = {
    plantilla: obesidad ? 'clinica-obesidad' : 'clinica',
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    examen,
    ...(obesidad ? { laboratorio: Object.fromEntries(LAB_METABOLICO.map(([k]) => [k, lab[k] || null])) } : {}),
    diferenciales: s.diferenciales || null,
    estudiosSolicitados: s.estudiosSolicitados,
    proximoControl: s.proximoControl || null,
    vitales, // tal cual se cargaron, para reabrir el formulario
    imc,
  }

  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.enfermedadActual || '', // S ≈ enfermedad actual
    objetivo,                            // O ≈ examen físico por aparato
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
