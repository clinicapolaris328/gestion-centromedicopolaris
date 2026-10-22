/* ============================================================================
 *  Plantilla de Cardiología — Historia Clínica estructurada
 *  Define (de forma declarativa) el formulario de la consulta cardiológica y
 *  cómo se transforma en el payload del backend:
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (síntomas, antecedentes, escalas — el form cualitativo)
 *    - observaciones (variables numéricas → gráficos automáticos)
 *  Esta estructura es el molde que reusarán las demás especialidades.
 * ========================================================================== */

// La plantilla de Cardiología aplica a toda la familia "Cardiología*"
// (Cardiología Clínica, Cardiología (imágenes cardiovasculares), etc.).
export const esCardiologia = (esp) => /^\s*cardiolog/i.test(esp || '')

export const SINTOMAS_CV = [
  'Dolor torácico', 'Disnea', 'Palpitaciones', 'Síncope', 'Presíncope',
  'Edemas', 'Claudicación', 'Fatiga', 'Ortopnea', 'Disnea paroxística nocturna', 'Asintomático',
]

export const ANTECEDENTES_CV = [
  'HTA', 'Diabetes', 'Dislipemia', 'Tabaquismo', 'Obesidad', 'Sedentarismo',
  'Enfermedad coronaria', 'IAM previo', 'Angioplastia/stent', 'CRM/bypass',
  'Insuficiencia cardíaca', 'Arritmias', 'Fibrilación auricular', 'ACV/AIT',
  'Enfermedad vascular periférica', 'Valvulopatía', 'Miocardiopatía',
  'Marcapasos/CDI', 'Cirugía cardiovascular',
]

export const ESTUDIOS_CV = [
  'ECG', 'Ecocardiograma', 'Holter', 'MAPA', 'Ecoestrés',
  'Ergometría', 'SPECT', 'Angiografía', 'TAC coronaria', 'RNM cardíaca',
]

export const NYHA = ['I', 'II', 'III', 'IV']
export const RIESGO_CV = ['Bajo', 'Moderado', 'Alto', 'Muy alto']

// Marcador que dispara el campo condicional CHA2DS2-VASc (spec §30).
export const FA_MARCADOR = 'Fibrilación auricular'

export const CARDIO_VACIO = {
  motivo: '',
  sintomas: [],
  sintomasDesc: '',
  antecedentes: [],
  vitales: { taSist: '', taDiast: '', fc: '', sat: '', peso: '', talla: '' },
  examen: '',
  diagnostico: '',
  riesgoCV: '',
  nyha: '',
  cha2ds2: '',
  estudiosSolicitados: [],
  tratamiento: '',
  medicacion: '',
  proximoControl: '',
}

// IMC (kg/m²) a partir de peso (kg) y talla (cm).
export const calcularIMC = (peso, talla) => {
  const p = parseFloat(peso)
  const t = parseFloat(talla) / 100
  if (!p || !t) return null
  return Math.round((p / (t * t)) * 10) / 10
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Reconstruye el estado del formulario a partir de una evolución ya guardada
 *  (para seguir editando un borrador o rectificar una firmada). */
export function cardioDesdeEvolucion(ev) {
  const d = ev.datos || {}
  return {
    ...CARDIO_VACIO,
    motivo: ev.motivo || '',
    sintomas: d.sintomas || [],
    sintomasDesc: ev.subjetivo || '',
    antecedentes: d.antecedentes || [],
    vitales: { ...CARDIO_VACIO.vitales, ...(d.vitales || {}) },
    examen: d.examen || ev.objetivo || '',
    diagnostico: ev.diagnostico || '',
    riesgoCV: d.riesgoCV || '',
    nyha: d.nyha || '',
    cha2ds2: d.cha2ds2 || '',
    estudiosSolicitados: d.estudiosSolicitados || [],
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Cardiología en el payload del backend. */
export function construirPayloadCardio(s) {
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

  const fa = s.antecedentes.includes(FA_MARCADOR)
  const datos = {
    sintomas: s.sintomas,
    antecedentes: s.antecedentes,
    examen: s.examen || null,
    riesgoCV: s.riesgoCV || null,
    nyha: s.nyha || null,
    cha2ds2: fa ? (s.cha2ds2 || null) : null,
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
    subjetivo: s.sintomasDesc || '', // S ≈ síntomas narrados
    objetivo: s.examen || '',        // O ≈ examen físico
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
