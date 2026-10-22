/* ============================================================================
 *  Plantilla de Reumatología — Historia Clínica estructurada (spec §16)
 *  Mismo molde que las demás plantillas:
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (dolor, síntomas, articulaciones, laboratorio, actividad)
 *    - observaciones (variables numéricas → gráficos automáticos, §23)
 *  Variables: dolor_eva (compartible con Kinesiología), pcr, vsg.
 *  Examen articular: lista de articulaciones por lado (el esquema corporal gráfico
 *  de la spec queda como pieza común futura, compartida con Kinesiología).
 *  Aplica a "Reumatología" con cualquier grafía (ej. "REUMATOLOGIA").
 * ========================================================================== */

export const esReumatologia = (esp) => /^\s*reumatolog/i.test(esp || '')

export const SINTOMAS_REUMA = [
  'Artritis', 'Artralgias', 'Raynaud', 'Fotosensibilidad', 'Rash', 'Úlceras',
  'Sequedad ocular', 'Sequedad bucal', 'Fiebre', 'Pérdida de peso',
]

// Articulaciones por lado (der./izq.) + axiales.
const PARES = ['Hombro', 'Codo', 'Muñeca', 'MCF', 'IFP', 'Cadera', 'Rodilla', 'Tobillo', 'MTF']
export const ARTICULACIONES = [
  ...PARES.flatMap((a) => [`${a} der.`, `${a} izq.`]),
  'Columna cervical', 'Columna lumbar', 'Sacroilíacas',
]

// Laboratorio relevante (§16): numéricos graficables + resultados en texto.
export const LAB_TEXTO = [
  ['factorReumatoide', 'FR (factor reumatoide)'],
  ['antiCcp', 'Anti-CCP'],
  ['fan', 'FAN'],
  ['antiDna', 'Anti-DNA'],
  ['complemento', 'Complemento'],
  ['cpk', 'CPK'],
  ['otros', 'Otros'],
]

export const ACTIVIDAD = ['Remisión', 'Baja', 'Moderada', 'Alta']

const LAB_VACIO = Object.fromEntries(LAB_TEXTO.map(([k]) => [k, '']))

export const REUMA_VACIO = {
  motivo: '',
  dolorLocalizacion: '',
  dolorEva: '',
  dolorDuracion: '',
  rigidezMatinal: '',          // minutos
  sintomas: [],
  sintomasDesc: '',
  articulaciones: [],
  examen: '',
  pcr: '',
  vsg: '',
  lab: LAB_VACIO,
  diagnostico: '',
  actividad: '',
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

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function reumaDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const dolor = obj(d.dolor)
  return {
    ...REUMA_VACIO,
    motivo: ev.motivo || '',
    dolorLocalizacion: dolor.localizacion || '',
    dolorEva: dolor.eva ?? '',
    dolorDuracion: dolor.duracion || '',
    rigidezMatinal: d.rigidezMatinal ?? '',
    sintomas: arr(d.sintomas),
    sintomasDesc: ev.subjetivo || '',
    articulaciones: arr(d.articulaciones),
    examen: typeof d.examen === 'string' ? d.examen : '',
    pcr: obj(d.laboratorio).pcr ?? '',
    vsg: obj(d.laboratorio).vsg ?? '',
    lab: { ...LAB_VACIO, ...obj(obj(d.laboratorio).resultados) },
    diagnostico: ev.diagnostico || '',
    actividad: d.actividad || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Reumatología en el payload del backend. */
export function construirPayloadReuma(s) {
  const eva = num(s.dolorEva)
  const pcr = num(s.pcr)
  const vsg = num(s.vsg)

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('dolor_eva', eva, '/10')
  push('pcr', pcr, 'mg/L')
  push('vsg', vsg, 'mm/h')

  const resultados = Object.fromEntries(LAB_TEXTO.map(([k]) => [k, (s.lab[k] || '').trim()]).filter(([, v]) => v))
  const articulaciones = ARTICULACIONES.filter((a) => s.articulaciones.includes(a)) // orden estable

  const datos = {
    plantilla: 'reumatologia',
    dolor: { localizacion: s.dolorLocalizacion || null, eva, duracion: s.dolorDuracion || null },
    rigidezMatinal: num(s.rigidezMatinal),
    sintomas: s.sintomas,
    articulaciones,
    examen: s.examen || null,
    laboratorio: { pcr, vsg, resultados },
    actividad: s.actividad || null,
    proximoControl: s.proximoControl || null,
  }

  // Objetivo legible (SOAP): articulaciones afectadas + examen.
  const objetivo = [
    articulaciones.length ? `Articulaciones: ${articulaciones.join(', ')}` : '',
    s.examen || '',
  ].filter(Boolean).join(' · ')

  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.sintomasDesc || '',
    objetivo,
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
