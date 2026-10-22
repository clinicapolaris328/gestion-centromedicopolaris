/* ============================================================================
 *  Plantilla de Kinesiología — Historia Clínica estructurada (spec §14)
 *  Mismo molde que las demás:
 *    - core SOAP: motivo; subjetivo = evolución de la sesión; objetivo = evaluación
 *      funcional; diagnóstico = diagnóstico médico de derivación; plan = plan de rehabilitación
 *    - datos JSONB: zonas (esquema corporal), dolor, evaluación, tratamiento, sesión
 *    - observaciones: dolor_eva (MISMA variable que Reumatología/Traumatología/Cirugía,
 *      graficable sesión a sesión, §23) + dolor_eva_post (dolor post tratamiento).
 *  Zonas: misma nomenclatura que Traumatología (ZONAS_TRAUMA) → trazable entre ambas.
 *  Aplica a "Kinesiología" (cualquier grafía).
 * ========================================================================== */
import { ZONAS_TRAUMA } from './traumatologia'

export const esKinesiologia = (esp) => /^\s*kinesiolog/i.test(esp || '')

export const ZONAS_KINE = ZONAS_TRAUMA

// Evaluación funcional (spec §14): clave → etiqueta.
export const EVAL_KINE = [
  ['movilidad', 'Movilidad'],
  ['fuerza', 'Fuerza'],
  ['marcha', 'Marcha'],
  ['equilibrio', 'Equilibrio'],
  ['rangoArticular', 'Rango articular'],
  ['flexibilidad', 'Flexibilidad'],
]

export const TRATAMIENTOS_KINE = [
  'Terapia manual', 'Ejercicios', 'Electroterapia', 'Ultrasonido', 'Magnetoterapia',
  'Rehabilitación', 'Fortalecimiento', 'Elongación', 'Reeducación postural', 'Otro',
]

// Categoría de estudio (C4): la orden médica de derivación a kinesiología.
export const CATEGORIAS_ESTUDIO_KINE = ['Orden de kinesiología']

const EVAL_VACIA = Object.fromEntries(EVAL_KINE.map(([k]) => [k, '']))

export const KINE_VACIO = {
  motivo: '',
  diagnosticoDerivacion: '',
  zonas: [],
  dolorEva: '',
  dolorInicio: '',
  dolorTipo: '',
  dolorLocalizacion: '',
  dolorIrradiacion: '',
  agravantes: '',
  atenuantes: '',
  evaluacion: EVAL_VACIA,
  tratamientos: [],
  tratamientoOtro: '',
  evolucionSesion: '',
  dolorPost: '',
  objetivos: '',
  plan: '',
  sesionNumero: '',
  sesionTotal: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function kineDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const dolor = obj(d.dolor)
  const ses = obj(d.sesion)
  return {
    ...KINE_VACIO,
    motivo: ev.motivo || '',
    diagnosticoDerivacion: ev.diagnostico || '',
    zonas: arr(d.zonas),
    dolorEva: dolor.eva ?? '',
    dolorInicio: dolor.inicio || '',
    dolorTipo: dolor.tipo || '',
    dolorLocalizacion: dolor.localizacion || '',
    dolorIrradiacion: dolor.irradiacion || '',
    agravantes: dolor.agravantes || '',
    atenuantes: dolor.atenuantes || '',
    evaluacion: { ...EVAL_VACIA, ...obj(d.evaluacion) },
    tratamientos: arr(d.tratamientos),
    tratamientoOtro: d.tratamientoOtro || '',
    evolucionSesion: ev.subjetivo || '',
    dolorPost: dolor.evaPost ?? '',
    objetivos: d.objetivos || '',
    plan: ev.plan || '',
    sesionNumero: ses.numero ?? '',
    sesionTotal: ses.total ?? '',
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Kinesiología en el payload del backend. */
export function construirPayloadKine(s) {
  const eva = num(s.dolorEva)
  const evaPost = num(s.dolorPost)
  const observaciones = []
  if (eva != null) observaciones.push({ variable: 'dolor_eva', valor: eva, unidad: '/10' })
  if (evaPost != null) observaciones.push({ variable: 'dolor_eva_post', valor: evaPost, unidad: '/10' })

  const evaluacion = Object.fromEntries(EVAL_KINE.map(([k]) => [k, (s.evaluacion[k] || '').trim()]))
  const zonas = ZONAS_KINE.filter((z) => s.zonas.includes(z)) // orden estable
  const numero = num(s.sesionNumero)
  const total = num(s.sesionTotal)

  const datos = {
    plantilla: 'kinesiologia',
    zonas,
    dolor: {
      eva, evaPost,
      inicio: s.dolorInicio || null,
      tipo: s.dolorTipo || null,
      localizacion: s.dolorLocalizacion || null,
      irradiacion: s.dolorIrradiacion || null,
      agravantes: s.agravantes || null,
      atenuantes: s.atenuantes || null,
    },
    evaluacion,
    tratamientos: s.tratamientos,
    tratamientoOtro: s.tratamientos.includes('Otro') ? (s.tratamientoOtro || null) : null,
    objetivos: s.objetivos || null,
    sesion: numero != null || total != null ? { numero, total } : null,
    proximoControl: s.proximoControl || null,
  }

  const objetivo = [
    zonas.length ? `Zonas: ${zonas.join(', ')}` : '',
    ...EVAL_KINE.filter(([k]) => evaluacion[k]).map(([k, label]) => `${label}: ${evaluacion[k]}`),
  ].filter(Boolean).join(' · ')

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.evolucionSesion || '',
    objetivo,
    diagnostico: s.diagnosticoDerivacion || '',
    plan: s.plan || '',
    medicacion: [],
    datos,
    observaciones,
  }
}
