/* ============================================================================
 *  Plantilla de Traumatología — Historia Clínica estructurada
 *  (no definida en la spec HCE: se sigue la práctica estándar y el mismo molde).
 *    - core SOAP (motivo/subjetivo/objetivo/diagnóstico/plan/medicación)
 *    - datos JSONB (mecanismo, zonas, síntomas, examen por ítem, conducta)
 *    - observaciones: dolor_eva (MISMA variable que Reumatología → una sola serie)
 *  Aplica a "Traumatología" y "Ortopedia y Traumatología …" (cualquier grafía).
 * ========================================================================== */

export const esTraumatologia = (esp) => /^\s*(ortopedia\s+y\s+)?traumatolog/i.test(esp || '')

export const MECANISMO = ['Traumático', 'No traumático', 'Sobreuso / deportivo']

// Zonas por lado (der./izq.) + columna.
const PARES = ['Hombro', 'Brazo', 'Codo', 'Antebrazo', 'Muñeca', 'Mano', 'Cadera', 'Muslo', 'Rodilla', 'Pierna', 'Tobillo', 'Pie']
export const ZONAS_TRAUMA = [
  ...PARES.flatMap((z) => [`${z} der.`, `${z} izq.`]),
  'Columna cervical', 'Columna dorsal', 'Columna lumbar', 'Pelvis',
]

export const SINTOMAS_TRAUMA = [
  'Dolor', 'Tumefacción', 'Hematoma', 'Deformidad', 'Impotencia funcional',
  'Bloqueo articular', 'Inestabilidad', 'Parestesias', 'Rigidez',
]

export const ANTECEDENTES_TRAUMA = [
  'Fracturas previas', 'Cirugías ortopédicas', 'Prótesis', 'Osteoporosis',
  'Artrosis', 'Lesiones deportivas', 'Anticoagulación',
]

// Examen por ítem (clave → etiqueta).
export const EXAMEN_TRAUMA = [
  ['inspeccion', 'Inspección'],
  ['palpacion', 'Palpación'],
  ['movilidad', 'Movilidad / rango articular'],
  ['fuerza', 'Fuerza'],
  ['maniobras', 'Maniobras / pruebas especiales'],
  ['neurovascular', 'Estado neurovascular distal'],
]

export const ESTUDIOS_TRAUMA = ['Radiografía', 'Ecografía', 'Resonancia', 'Tomografía', 'Densitometría ósea', 'EMG']

export const CONDUCTA = ['Conservador', 'Quirúrgico', 'Rehabilitación / kinesiología', 'Infiltración']
export const INMOVILIZACION = ['Ninguna', 'Yeso', 'Férula', 'Ortesis', 'Vendaje', 'Cabestrillo']

const EXAMEN_VACIO = Object.fromEntries(EXAMEN_TRAUMA.map(([k]) => [k, '']))

export const TRAUMA_VACIO = {
  motivo: '',
  enfermedadActual: '',
  mecanismo: '',
  mecanismoDesc: '',
  fechaEvento: '',
  zonas: [],
  dolorEva: '',
  sintomas: [],
  antecedentes: [],
  antecedentesDesc: '',
  examen: EXAMEN_VACIO,
  estudiosSolicitados: [],
  diagnostico: '',
  conducta: [],
  inmovilizacion: '',
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
export function traumaDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const m = obj(d.mecanismo)
  return {
    ...TRAUMA_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    mecanismo: m.tipo || '',
    mecanismoDesc: m.descripcion || '',
    fechaEvento: m.fecha || '',
    zonas: arr(d.zonas),
    dolorEva: d.dolorEva ?? '',
    sintomas: arr(d.sintomas),
    antecedentes: arr(d.antecedentes),
    antecedentesDesc: d.antecedentesDesc || '',
    examen: { ...EXAMEN_VACIO, ...obj(d.examen) },
    estudiosSolicitados: arr(d.estudiosSolicitados),
    diagnostico: ev.diagnostico || '',
    conducta: arr(d.conducta),
    inmovilizacion: d.inmovilizacion || '',
    tratamiento: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Traumatología en el payload del backend. */
export function construirPayloadTrauma(s) {
  const eva = num(s.dolorEva)
  const observaciones = eva != null ? [{ variable: 'dolor_eva', valor: eva, unidad: '/10' }] : []

  const examen = Object.fromEntries(EXAMEN_TRAUMA.map(([k]) => [k, (s.examen[k] || '').trim()]))
  const zonas = ZONAS_TRAUMA.filter((z) => s.zonas.includes(z)) // orden estable

  const datos = {
    plantilla: 'traumatologia',
    mecanismo: s.mecanismo
      ? { tipo: s.mecanismo, descripcion: s.mecanismoDesc || null, fecha: s.fechaEvento || null }
      : null,
    zonas,
    dolorEva: eva,
    sintomas: s.sintomas,
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    examen,
    estudiosSolicitados: s.estudiosSolicitados,
    conducta: s.conducta,
    inmovilizacion: s.inmovilizacion || null,
    proximoControl: s.proximoControl || null,
  }

  // Objetivo legible (SOAP): zonas afectadas + examen por ítem.
  const objetivo = [
    zonas.length ? `Zonas: ${zonas.join(', ')}` : '',
    ...EXAMEN_TRAUMA.filter(([k]) => examen[k]).map(([k, label]) => `${label}: ${examen[k]}`),
  ].filter(Boolean).join(' · ')

  const medicacion = s.medicacion
    ? s.medicacion.split(',').map((x) => x.trim()).filter(Boolean)
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
