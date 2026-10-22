/* ============================================================================
 *  Plantilla de Neumonología — Historia Clínica estructurada (spec §15)
 *  Mismo molde que Cardiología / Clínica:
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (síntomas, antecedentes, tabaquismo, escalas)
 *    - observaciones (variables numéricas → gráficos automáticos, §23)
 *  Variables compartidas con los mismos nombres que las demás plantillas
 *  (fr, saturacion) → una sola serie por paciente. Nuevas: fev1, fev1_pct.
 *  Aplica a "Neumonología" con cualquier grafía (ej. "NEUMONOLOGIA", "Neumología").
 * ========================================================================== */

export const esNeumonologia = (esp) => /^\s*neumo(no)?log/i.test(esp || '')

export const SINTOMAS_NEUMO = [
  'Disnea', 'Tos', 'Expectoración', 'Sibilancias', 'Hemoptisis',
  'Dolor torácico', 'Ronquidos', 'Apneas',
]

export const ANTECEDENTES_NEUMO = ['Asma', 'EPOC', 'Neumonía', 'Tuberculosis', 'COVID', 'Oxigenoterapia']

export const TABAQUISMO = ['No fumador', 'Fumador', 'Ex fumador']

export const ESTUDIOS_NEUMO = [
  'Espirometría', 'DLCO', 'Test de caminata', 'Oximetría', 'Polisomnografía', 'Radiografía', 'TAC de tórax',
]

// Categorías de estudio (C4) que suma Neumonología al repositorio (Espirometría y
// Radiografía ya existen).
export const CATEGORIAS_ESTUDIO_NEUMO = ['DLCO', 'Test de caminata', 'Oximetría', 'Polisomnografía', 'TAC de tórax']

export const MMRC = ['0', '1', '2', '3', '4']

export const NEUMO_VACIO = {
  motivo: '',
  sintomas: [],
  sintomasDesc: '',
  tabaquismo: '',
  cigarrillosDia: '',
  aniosFumando: '',
  antecedentes: [],
  exposicionLaboral: '',
  alergias: '',
  vitales: { fr: '', sat: '', fev1: '', fev1Pct: '' },
  auscultacion: '',
  estudiosSolicitados: [],
  mmrc: '',
  cat: '',
  stopBang: '',
  diagnostico: '',
  tratamiento: '',
  medicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Paquetes/año = (cigarrillos por día / 20) × años fumando (spec §15). */
export const calcularPaquetesAnio = (cigDia, anios) => {
  const c = num(cigDia)
  const a = num(anios)
  if (!c || !a || c < 0 || a < 0) return null
  return Math.round((c / 20) * a * 10) / 10
}

const fumo = (t) => t === 'Fumador' || t === 'Ex fumador'

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function neumoDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const t = typeof d.tabaquismo === 'object' && d.tabaquismo ? d.tabaquismo : {}
  return {
    ...NEUMO_VACIO,
    motivo: ev.motivo || '',
    sintomas: Array.isArray(d.sintomas) ? d.sintomas : [],
    sintomasDesc: ev.subjetivo || '',
    tabaquismo: t.estado || '',
    cigarrillosDia: t.cigarrillosDia ?? '',
    aniosFumando: t.anios ?? '',
    antecedentes: Array.isArray(d.antecedentes) ? d.antecedentes : [],
    exposicionLaboral: d.exposicionLaboral || '',
    alergias: d.alergias || '',
    vitales: { ...NEUMO_VACIO.vitales, ...(typeof d.vitales === 'object' && d.vitales ? d.vitales : {}) },
    auscultacion: d.auscultacion || '',
    estudiosSolicitados: Array.isArray(d.estudiosSolicitados) ? d.estudiosSolicitados : [],
    mmrc: d.mmrc ?? '',
    cat: d.cat ?? '',
    stopBang: d.stopBang ?? '',
    diagnostico: ev.diagnostico || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Neumonología en el payload del backend. */
export function construirPayloadNeumo(s) {
  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('fr', num(s.vitales.fr), 'rpm')
  push('saturacion', num(s.vitales.sat), '%')
  push('fev1', num(s.vitales.fev1), 'L')
  push('fev1_pct', num(s.vitales.fev1Pct), '%')

  const conHabito = fumo(s.tabaquismo)
  const paquetesAnio = conHabito ? calcularPaquetesAnio(s.cigarrillosDia, s.aniosFumando) : null

  const datos = {
    plantilla: 'neumonologia',
    sintomas: s.sintomas,
    antecedentes: s.antecedentes,
    tabaquismo: s.tabaquismo
      ? {
          estado: s.tabaquismo,
          cigarrillosDia: conHabito ? num(s.cigarrillosDia) : null,
          anios: conHabito ? num(s.aniosFumando) : null,
          paquetesAnio,
        }
      : null,
    exposicionLaboral: s.exposicionLaboral || null,
    alergias: s.alergias || null,
    vitales: s.vitales, // tal cual se cargaron, para reabrir el formulario
    auscultacion: s.auscultacion || null,
    estudiosSolicitados: s.estudiosSolicitados,
    mmrc: s.mmrc || null,
    cat: num(s.cat),
    stopBang: num(s.stopBang),
    proximoControl: s.proximoControl || null,
  }

  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.sintomasDesc || '',  // S ≈ síntomas narrados
    objetivo: s.auscultacion || '',   // O ≈ examen (auscultación pulmonar)
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
