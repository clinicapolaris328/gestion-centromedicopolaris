/* ============================================================================
 *  Plantilla de Endocrinología, Diabetología y Ginecoendocrinología — HC
 *  estructurada. Es UNA sola plantilla combinada (un mismo profesional cubre las
 *  tres sub-áreas, tal como figura en la base); se etiqueta la sub-área en `datos`
 *  para la trazabilidad y la analítica, sin fragmentar el registro.
 *  Mismo molde que las demás: SOAP + datos JSONB + observaciones numéricas con
 *  nombres compartidos (peso, talla, imc, cintura) + metabólicas (glucemia, hba1c…).
 * ========================================================================== */
import { calcularIMC } from './cardiologia'

export const esEndocrino = (esp) => /^\s*endocrinolog/i.test(esp || '')

export const SUBAREAS_ENDO = ['Endocrinología', 'Diabetología', 'Ginecoendocrinología']

export const ANTECEDENTES_ENDO = [
  'Diabetes tipo 1', 'Diabetes tipo 2', 'Prediabetes', 'HTA', 'Dislipemia', 'Obesidad',
  'Hipotiroidismo', 'Hipertiroidismo', 'Nódulo / bocio tiroideo', 'Síndrome de ovario poliquístico',
  'Osteoporosis', 'Tabaquismo', 'Antecedente familiar de diabetes', 'Antecedente familiar de tiroidopatía',
]

export const ESTUDIOS_ENDO = [
  'Laboratorio hormonal', 'Perfil tiroideo', 'Glucemia / HbA1c',
  'Curva de tolerancia a la glucosa', 'Ecografía tiroidea', 'Densitometría ósea',
  'Monitoreo glucémico continuo',
]

// Categorías de estudio (C4) que suma Endocrino al repositorio.
export const CATEGORIAS_ESTUDIO_ENDO = ['Perfil tiroideo', 'Densitometría ósea', 'Monitoreo glucémico']

// Laboratorio metabólico: clave → [etiqueta, unidad].
export const LAB_ENDO = [
  ['glucemia', 'Glucemia', 'mg/dL'],
  ['hba1c', 'HbA1c', '%'],
  ['colesterolTotal', 'Colesterol total', 'mg/dL'],
  ['hdl', 'HDL', 'mg/dL'],
  ['ldl', 'LDL', 'mg/dL'],
  ['trigliceridos', 'Triglicéridos', 'mg/dL'],
  ['tsh', 'TSH', 'µUI/mL'],
  ['t4l', 'T4 libre', 'ng/dL'],
]

// Nombre de variable (serie longitudinal) para cada campo de laboratorio.
// Compartido con Clínica Médica (obesidad): mismo nombre → misma serie del paciente.
export const VAR_LAB = {
  glucemia: 'glucemia', hba1c: 'hba1c', colesterolTotal: 'colesterol_total',
  hdl: 'hdl', ldl: 'ldl', trigliceridos: 'trigliceridos', tsh: 'tsh', t4l: 't4_libre',
}

// Subconjunto metabólico (sin tiroides): lo usa también Clínica Médica (obesidad).
export const LAB_METABOLICO = LAB_ENDO.filter(([k]) => k !== 'tsh' && k !== 't4l')

const LAB_VACIO = Object.fromEntries(LAB_ENDO.map(([k]) => [k, '']))

export const ENDO_VACIO = {
  subarea: 'Endocrinología',
  motivo: '',
  enfermedadActual: '',
  antecedentes: [],
  antecedentesDesc: '',
  vitales: { taSist: '', taDiast: '', fc: '', peso: '', talla: '', cintura: '' },
  laboratorio: LAB_VACIO,
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
export function endoDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...ENDO_VACIO,
    subarea: d.subarea || 'Endocrinología',
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    antecedentes: d.antecedentes || [],
    antecedentesDesc: d.antecedentesDesc || '',
    vitales: { ...ENDO_VACIO.vitales, ...(d.vitales || {}) },
    laboratorio: { ...LAB_VACIO, ...(d.laboratorio || {}) },
    diagnostico: ev.diagnostico || '',
    diferenciales: d.diferenciales || '',
    estudiosSolicitados: d.estudiosSolicitados || [],
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Endocrino en el payload del backend. */
export function construirPayloadEndo(s) {
  const imc = calcularIMC(s.vitales.peso, s.vitales.talla)

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('ta_sistolica', num(s.vitales.taSist), 'mmHg')
  push('ta_diastolica', num(s.vitales.taDiast), 'mmHg')
  push('fc', num(s.vitales.fc), 'lpm')
  push('peso', num(s.vitales.peso), 'kg')
  push('talla', num(s.vitales.talla), 'cm')
  push('imc', imc, 'kg/m2')
  push('cintura', num(s.vitales.cintura), 'cm')
  for (const [k, , unidad] of LAB_ENDO) push(VAR_LAB[k], num(s.laboratorio[k]), unidad)

  // Laboratorio: se guarda tal cual (datos) y como texto legible en "objetivo" (SOAP).
  const lab = Object.fromEntries(LAB_ENDO.map(([k]) => [k, s.laboratorio[k] || null]))
  const objetivo = LAB_ENDO
    .filter(([k]) => s.laboratorio[k])
    .map(([k, label, unidad]) => `${label}: ${s.laboratorio[k]} ${unidad}`)
    .join(' · ')

  const datos = {
    plantilla: 'endocrino',
    subarea: s.subarea || null,
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    laboratorio: lab,
    diferenciales: s.diferenciales || null,
    estudiosSolicitados: s.estudiosSolicitados,
    proximoControl: s.proximoControl || null,
    vitales: s.vitales, // tal cual se cargaron, para reabrir el formulario
    imc,
  }

  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []

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
