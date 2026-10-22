/* ============================================================================
 *  Plantilla de Infectología — Historia Clínica estructurada (spec §18)
 *  Mismo molde que las demás plantillas:
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (fiebre, foco, microbiología, antibióticos, epidemiología)
 *    - observaciones: `temperatura` (MISMA variable que Clínica → una sola curva, §23)
 *  Microbiología y antibióticos son listas repetibles (filas).
 *  Los antibióticos también viajan como medicación (tabla `indicacion`), para que
 *  la prescripción quede registrada igual que en el resto de las especialidades.
 *  Aplica a "Infectología" con cualquier grafía.
 * ========================================================================== */

export const esInfectologia = (esp) => /^\s*infectolog/i.test(esp || '')

export const PATRON_FIEBRE = ['Continua', 'Intermitente', 'Remitente', 'Recurrente']

export const FOCOS = [
  'Respiratorio', 'Urinario', 'Gastrointestinal', 'Piel', 'Osteoarticular', 'SNC', 'Cardiovascular', 'Otro',
]

export const EPIDEMIOLOGIA = [
  'Viajes', 'Contactos', 'Animales', 'Exposición laboral', 'Internación reciente', 'Antibióticos recientes',
]

export const VIAS = ['VO', 'IV', 'IM', 'SC', 'Tópica', 'Inhalatoria']

// Categoría de estudio (C4) que suma Infectología (microbiología, §18).
export const CATEGORIAS_ESTUDIO_INFECTO = ['Cultivo / antibiograma']

export const MICRO_VACIA = { muestra: '', fecha: '', microorganismo: '', sensibilidad: '', resistencia: '' }
export const ATB_VACIO = { antibiotico: '', dosis: '', via: '', inicio: '', fin: '', motivo: '' }

export const INFECTO_VACIO = {
  motivo: '',
  sindromeDesc: '',
  fiebre: false,
  fiebreInicio: '',
  tempMax: '',
  patron: '',
  temperatura: '',      // temperatura actual (signo vital → observación)
  focos: [],
  microbiologia: [],
  antibioticos: [],
  epidemiologia: [],
  epidemiologiaDesc: '',
  diagnostico: '',
  tratamiento: '',
  duracionPrevista: '',
  otraMedicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

// Una fila cuenta solo si tiene algún dato (las vacías no se guardan).
const conDatos = (fila) => Object.values(fila).some((v) => String(v ?? '').trim())
const limpiar = (filas, molde) => arr(filas)
  .map((f) => Object.fromEntries(Object.keys(molde).map((k) => [k, String(f?.[k] ?? '').trim()])))
  .filter(conDatos)

/** Texto de un antibiótico para la medicación (tabla indicacion). */
export const textoAtb = (a) => [a.antibiotico, a.dosis, a.via].filter(Boolean).join(' ')

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function infectoDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const f = obj(d.fiebre)
  const antibioticos = limpiar(d.antibioticos, ATB_VACIO)
  // La medicación guardada = antibióticos + otra medicación: se separa de nuevo.
  const deAtb = new Set(antibioticos.filter((a) => a.antibiotico).map(textoAtb))
  const otras = (ev.medicacion || []).filter((m) => !deAtb.has(m))
  return {
    ...INFECTO_VACIO,
    motivo: ev.motivo || '',
    sindromeDesc: ev.subjetivo || '',
    fiebre: f.presente === true,
    fiebreInicio: f.inicio || '',
    tempMax: f.tempMax ?? '',
    patron: f.patron || '',
    temperatura: d.temperatura ?? '',
    focos: arr(d.focos),
    microbiologia: limpiar(d.microbiologia, MICRO_VACIA),
    antibioticos,
    epidemiologia: arr(d.epidemiologia),
    epidemiologiaDesc: d.epidemiologiaDesc || '',
    diagnostico: ev.diagnostico || '',
    tratamiento: ev.plan || '',
    duracionPrevista: d.duracionPrevista || '',
    otraMedicacion: otras.join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Infectología en el payload del backend. */
export function construirPayloadInfecto(s) {
  const temperatura = num(s.temperatura)
  const observaciones = temperatura != null ? [{ variable: 'temperatura', valor: temperatura, unidad: '°C' }] : []

  const microbiologia = limpiar(s.microbiologia, MICRO_VACIA)
  const antibioticos = limpiar(s.antibioticos, ATB_VACIO)

  const datos = {
    plantilla: 'infectologia',
    fiebre: s.fiebre
      ? { presente: true, inicio: s.fiebreInicio || null, tempMax: num(s.tempMax), patron: s.patron || null }
      : { presente: false },
    temperatura,
    focos: s.focos,
    microbiologia,
    antibioticos,
    epidemiologia: s.epidemiologia,
    epidemiologiaDesc: s.epidemiologiaDesc || null,
    duracionPrevista: s.duracionPrevista || null,
    proximoControl: s.proximoControl || null,
  }

  const otras = s.otraMedicacion
    ? s.otraMedicacion.split(',').map((m) => m.trim()).filter(Boolean)
    : []
  const medicacion = [...antibioticos.filter((a) => a.antibiotico).map(textoAtb), ...otras]

  // Objetivo legible (SOAP): foco probable + temperatura.
  const objetivo = [
    s.focos.length ? `Foco probable: ${s.focos.join(', ')}` : '',
    temperatura != null ? `T ${temperatura} °C` : '',
  ].filter(Boolean).join(' · ')

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.sindromeDesc || '',
    objetivo,
    diagnostico: s.diagnostico || '',
    plan: s.tratamiento || '',
    medicacion,
    datos,
    observaciones,
  }
}
