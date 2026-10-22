/* ============================================================================
 *  Plantilla de Cirugía — Historia Clínica estructurada (spec §17)
 *  Una sola plantilla para todo el circuito, con `etapa`
 *  (prequirúrgica / cirugía / postoperatorio) para la trazabilidad.
 *    - core SOAP: motivo; diagnóstico = diagnóstico quirúrgico; plan = indicaciones.
 *    - datos JSONB: antecedentes, evaluación preoperatoria, consentimiento,
 *      cirugía, evolución postoperatoria, curaciones y alta.
 *    - observaciones: dolor_eva y temperatura (MISMAS variables que
 *      Reumatología/Traumatología y Clínica/Infectología → una sola serie, §23).
 *  Aplica a "Cirugía" (cualquier grafía).
 * ========================================================================== */

export const esCirugia = (esp) => /^\s*cirug/i.test(esp || '')

export const ETAPAS = ['Consulta prequirúrgica', 'Cirugía', 'Control postoperatorio']
export const RIESGO_ASA = ['ASA I', 'ASA II', 'ASA III', 'ASA IV', 'ASA V']
export const ESTUDIOS_PREQX = [
  'Laboratorio prequirúrgico', 'ECG', 'Riesgo cardiovascular', 'Radiografía de tórax',
  'Ecografía', 'Tomografía', 'Resonancia',
]
export const CONSENTIMIENTO = ['Pendiente', 'Explicado', 'Firmado']
export const ANESTESIA = ['General', 'Raquídea', 'Peridural', 'Regional', 'Local', 'Sedación']
export const HERIDA = ['Buena evolución', 'Eritema', 'Secreción', 'Dehiscencia', 'Infección']

// Categorías de estudio (C4) que suma Cirugía (consentimiento y protocolo, §17).
export const CATEGORIAS_ESTUDIO_CX = ['Consentimiento informado', 'Protocolo quirúrgico']

export const CX_VACIO = {
  etapa: '',
  motivo: '',
  enfermedadActual: '',
  antecedentesQx: '',
  riesgo: '',
  estudiosPreqx: [],
  estudiosDesc: '',
  procedimientoPropuesto: '',
  consentimiento: '',
  fechaCirugia: '',
  procedimientoRealizado: '',
  cirujano: '',
  ayudantes: '',
  anestesia: '',
  herida: '',
  drenajes: '',
  dolorEva: '',
  fiebre: false,
  temperatura: '',
  complicaciones: '',
  curaciones: '',
  retiroPuntos: '',
  alta: false,
  diagnostico: '',
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
export function cxDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const pre = obj(d.preoperatorio)
  const qx = obj(d.cirugia)
  const post = obj(d.postoperatorio)
  return {
    ...CX_VACIO,
    etapa: d.etapa || '',
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    antecedentesQx: d.antecedentesQx || '',
    riesgo: pre.riesgo || '',
    estudiosPreqx: arr(pre.estudios),
    estudiosDesc: pre.estudiosDesc || '',
    procedimientoPropuesto: pre.procedimientoPropuesto || '',
    consentimiento: d.consentimiento || '',
    fechaCirugia: qx.fecha || '',
    procedimientoRealizado: qx.procedimiento || '',
    cirujano: qx.cirujano || '',
    ayudantes: qx.ayudantes || '',
    anestesia: qx.anestesia || '',
    herida: post.herida || '',
    drenajes: post.drenajes || '',
    dolorEva: post.dolorEva ?? '',
    fiebre: post.fiebre === true,
    temperatura: post.temperatura ?? '',
    complicaciones: post.complicaciones || '',
    curaciones: post.curaciones || '',
    retiroPuntos: post.retiroPuntos || '',
    alta: post.alta === true,
    diagnostico: ev.diagnostico || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Cirugía en el payload del backend. */
export function construirPayloadCx(s) {
  const eva = num(s.dolorEva)
  const temperatura = num(s.temperatura)
  const observaciones = []
  if (eva != null) observaciones.push({ variable: 'dolor_eva', valor: eva, unidad: '/10' })
  if (temperatura != null) observaciones.push({ variable: 'temperatura', valor: temperatura, unidad: '°C' })

  const datos = {
    plantilla: 'cirugia',
    etapa: s.etapa || null,
    antecedentesQx: s.antecedentesQx || null,
    preoperatorio: {
      riesgo: s.riesgo || null,
      estudios: s.estudiosPreqx,
      estudiosDesc: s.estudiosDesc || null,
      procedimientoPropuesto: s.procedimientoPropuesto || null,
    },
    consentimiento: s.consentimiento || null,
    cirugia: {
      fecha: s.fechaCirugia || null,
      procedimiento: s.procedimientoRealizado || null,
      cirujano: s.cirujano || null,
      ayudantes: s.ayudantes || null,
      anestesia: s.anestesia || null,
    },
    postoperatorio: {
      herida: s.herida || null,
      drenajes: s.drenajes || null,
      dolorEva: eva,
      fiebre: s.fiebre === true,
      temperatura,
      complicaciones: s.complicaciones || null,
      curaciones: s.curaciones || null,
      retiroPuntos: s.retiroPuntos || null,
      alta: s.alta === true,
    },
    proximoControl: s.proximoControl || null,
  }

  // Objetivo legible (SOAP): lo relevante de la etapa.
  const objetivo = [
    s.etapa,
    s.procedimientoRealizado && `Procedimiento: ${s.procedimientoRealizado}`,
    s.herida && `Herida: ${s.herida}`,
    eva != null && `Dolor EVA ${eva}/10`,
    s.complicaciones && `Complicaciones: ${s.complicaciones}`,
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
