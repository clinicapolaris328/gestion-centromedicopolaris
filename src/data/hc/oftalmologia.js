/* ============================================================================
 *  Plantilla de Oftalmología — Historia Clínica estructurada (spec §19)
 *  Mismo molde que las demás:
 *    - core SOAP: motivo; objetivo = agudeza/PIO + examen; diagnóstico; plan
 *    - datos JSONB: antecedentes, agudeza visual, refracción, PIO, examen, estudios
 *    - observaciones (§23, graficables): agudeza visual en DECIMAL por ojo, sin y
 *      con corrección (av_od_sc, av_oi_sc, av_od_cc, av_oi_cc) y presión
 *      intraocular (pio_od, pio_oi, mmHg).
 *  La agudeza se puede cargar en decimal ("0.8") o Snellen ("20/25" → 0.8).
 *  Aplica a "Oftalmología" (cualquier grafía).
 * ========================================================================== */

export const esOftalmologia = (esp) => /^\s*oftalmolog/i.test(esp || '')

export const CORRECCION = ['Ninguna', 'Anteojos', 'Lentes de contacto', 'Anteojos y lentes de contacto']
export const ANTECEDENTES_OFT = ['Cirugías oculares', 'Cataratas', 'Glaucoma', 'Retinopatía', 'Trauma ocular', 'Diabetes']
export const ESTUDIOS_OFT = ['Fondo de ojo', 'OCT', 'Campimetría', 'Retinografía', 'Paquimetría', 'Topografía corneal']

// Examen (spec §19): clave → etiqueta.
export const EXAMEN_OFT = [
  ['parpados', 'Párpados'],
  ['conjuntiva', 'Conjuntiva'],
  ['cornea', 'Córnea'],
  ['camaraAnterior', 'Cámara anterior'],
  ['iris', 'Iris'],
  ['pupila', 'Pupila'],
  ['cristalino', 'Cristalino'],
  ['fondoOjo', 'Fondo de ojo'],
]

// Categoría de estudio (C4) de la spec §5.
export const CATEGORIAS_ESTUDIO_OFT = ['Estudios oftalmológicos']

const OJO = { sc: '', cc: '' }
const REFR = { esfera: '', cilindro: '', eje: '' }
const EXAMEN_VACIO = Object.fromEntries(EXAMEN_OFT.map(([k]) => [k, '']))

export const OFT_VACIO = {
  motivo: '',
  enfermedadActual: '',
  correccion: '',
  antecedentes: [],
  antecedentesDesc: '',
  av: { od: { ...OJO }, oi: { ...OJO } },          // agudeza visual (texto tal cual se cargó)
  refraccion: { od: { ...REFR }, oi: { ...REFR } },
  pio: { od: '', oi: '' },                          // mmHg
  examen: EXAMEN_VACIO,
  estudios: [],
  diagnostico: '',
  tratamiento: '',
  medicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Agudeza visual a decimal: "0.8" → 0.8; "20/25" → 0.8; "6/6" → 1. null si no es válida. */
export const avDecimal = (v) => {
  const t = String(v ?? '').trim()
  const snellen = t.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/)
  if (snellen) {
    const a = num(snellen[1]); const b = num(snellen[2])
    return a && b ? Math.round((a / b) * 100) / 100 : null
  }
  const n = num(t)
  return n != null && n >= 0 && n <= 2 ? n : null
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function oftDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const av = obj(d.agudezaVisual)
  const rf = obj(d.refraccion)
  const pio = obj(d.pio)
  const ojo = (o, molde) => ({ ...molde, ...obj(o) })
  return {
    ...OFT_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    correccion: d.correccion || '',
    antecedentes: arr(d.antecedentes),
    antecedentesDesc: d.antecedentesDesc || '',
    av: { od: ojo(av.od, OJO), oi: ojo(av.oi, OJO) },
    refraccion: { od: ojo(rf.od, REFR), oi: ojo(rf.oi, REFR) },
    pio: { od: pio.od ?? '', oi: pio.oi ?? '' },
    examen: { ...EXAMEN_VACIO, ...obj(d.examen) },
    estudios: arr(d.estudios),
    diagnostico: ev.diagnostico || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Oftalmología en el payload del backend. */
export function construirPayloadOft(s) {
  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('av_od_sc', avDecimal(s.av.od.sc), 'decimal')
  push('av_oi_sc', avDecimal(s.av.oi.sc), 'decimal')
  push('av_od_cc', avDecimal(s.av.od.cc), 'decimal')
  push('av_oi_cc', avDecimal(s.av.oi.cc), 'decimal')
  push('pio_od', num(s.pio.od), 'mmHg')
  push('pio_oi', num(s.pio.oi), 'mmHg')

  const examen = Object.fromEntries(EXAMEN_OFT.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const datos = {
    plantilla: 'oftalmologia',
    correccion: s.correccion || null,
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    agudezaVisual: s.av,          // tal cual se cargó (decimal o Snellen), para reabrir
    refraccion: s.refraccion,
    pio: { od: num(s.pio.od), oi: num(s.pio.oi) },
    examen,
    estudios: s.estudios,
    proximoControl: s.proximoControl || null,
  }

  const av = (o) => [o.sc && `sc ${o.sc}`, o.cc && `cc ${o.cc}`].filter(Boolean).join(' / ')
  const objetivo = [
    av(s.av.od) && `AV OD ${av(s.av.od)}`,
    av(s.av.oi) && `AV OI ${av(s.av.oi)}`,
    (num(s.pio.od) != null || num(s.pio.oi) != null) && `PIO ${num(s.pio.od) ?? '—'}/${num(s.pio.oi) ?? '—'} mmHg`,
    ...EXAMEN_OFT.filter(([k]) => examen[k]).map(([k, label]) => `${label}: ${examen[k]}`),
  ].filter(Boolean).join(' · ')

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
