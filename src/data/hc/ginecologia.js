/* ============================================================================
 *  Plantilla de Ginecología — Historia Clínica estructurada (spec §11)
 *  Mismo molde que las demás:
 *    - core SOAP: motivo; objetivo = examen; diagnóstico; plan = conducta
 *    - datos JSONB: antecedentes gineco-obstétricos, gestaciones (G/P/C/A/HV),
 *      anticoncepción, antecedentes, estudios
 *    - sin observaciones numéricas (la spec no pide graficar variables acá)
 *  Aplica a "Ginecología" (cualquier grafía). "Endocrinología, Diabetología y
 *  Ginecoendocrinología" tiene su propia plantilla (Endocrino).
 * ========================================================================== */

export const esGinecologia = (esp) => /^\s*ginecolog/i.test(esp || '')

export const ANTICONCEPCION = ['Ninguna', 'ACO', 'DIU', 'Implante', 'Preservativo', 'Otro']
export const ANTECEDENTES_GINE = ['ITS', 'HPV', 'PAP alterado', 'Cirugías ginecológicas', 'Patología mamaria']
export const ESTUDIOS_GINE = ['PAP', 'Colposcopía', 'Mamografía', 'Ecografía ginecológica', 'Ecografía mamaria']

// Gestaciones (fórmula obstétrica): clave → etiqueta.
export const GESTACIONES = [
  ['gestas', 'Gestas'],
  ['partos', 'Partos'],
  ['cesareas', 'Cesáreas'],
  ['abortos', 'Abortos'],
  ['hijosVivos', 'Hijos vivos'],
]

// Categorías de estudio (C4) de la spec §5 que suma Ginecología.
export const CATEGORIAS_ESTUDIO_GINE = ['Mamografía', 'Estudios ginecológicos']

const GEST_VACIA = Object.fromEntries(GESTACIONES.map(([k]) => [k, '']))

export const GINE_VACIO = {
  motivo: '',
  enfermedadActual: '',
  menarca: '',            // edad
  fum: '',                // fecha de última menstruación
  cicloDias: '',
  duracionDias: '',
  dismenorrea: false,
  menopausia: false,
  edadMenopausia: '',
  inicioRelaciones: '',   // edad
  gestaciones: GEST_VACIA,
  anticoncepcion: '',
  anticoncepcionOtro: '',
  antecedentes: [],
  antecedentesDesc: '',
  estudios: [],
  estudiosDesc: '',
  examenMamario: '',
  examenGinecologico: '',
  diagnostico: '',
  conducta: '',
  medicacion: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Fórmula obstétrica abreviada (ej. "G3 P2 C1 A0 HV3"), o null si no hay datos. */
export const formulaObstetrica = (g) => {
  const partes = [['G', g.gestas], ['P', g.partos], ['C', g.cesareas], ['A', g.abortos], ['HV', g.hijosVivos]]
    .filter(([, v]) => v !== '' && v != null)
  return partes.length ? partes.map(([k, v]) => `${k}${v}`).join(' ') : null
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function gineDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const m = obj(d.menstrual)
  const ac = obj(d.anticoncepcion)
  const g = obj(d.gestaciones)
  return {
    ...GINE_VACIO,
    motivo: ev.motivo || '',
    enfermedadActual: ev.subjetivo || '',
    menarca: m.menarca ?? '',
    fum: m.fum || '',
    cicloDias: m.cicloDias ?? '',
    duracionDias: m.duracionDias ?? '',
    dismenorrea: m.dismenorrea === true,
    menopausia: m.menopausia === true,
    edadMenopausia: m.edadMenopausia ?? '',
    inicioRelaciones: d.inicioRelaciones ?? '',
    gestaciones: Object.fromEntries(GESTACIONES.map(([k]) => [k, g[k] ?? ''])),
    anticoncepcion: ac.metodo || '',
    anticoncepcionOtro: ac.otro || '',
    antecedentes: arr(d.antecedentes),
    antecedentesDesc: d.antecedentesDesc || '',
    estudios: arr(d.estudios),
    estudiosDesc: d.estudiosDesc || '',
    examenMamario: obj(d.examen).mamario || '',
    examenGinecologico: obj(d.examen).ginecologico || '',
    diagnostico: ev.diagnostico || '',
    conducta: ev.plan || '',
    medicacion: (ev.medicacion || []).join(', '),
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Ginecología en el payload del backend. */
export function construirPayloadGine(s) {
  const gestaciones = Object.fromEntries(GESTACIONES.map(([k]) => [k, num(s.gestaciones[k])]))
  const datos = {
    plantilla: 'ginecologia',
    menstrual: {
      menarca: num(s.menarca),
      fum: s.fum || null,
      cicloDias: num(s.cicloDias),
      duracionDias: num(s.duracionDias),
      dismenorrea: s.dismenorrea === true,
      menopausia: s.menopausia === true,
      edadMenopausia: s.menopausia ? num(s.edadMenopausia) : null,
    },
    inicioRelaciones: num(s.inicioRelaciones),
    gestaciones,
    anticoncepcion: s.anticoncepcion
      ? { metodo: s.anticoncepcion, otro: s.anticoncepcion === 'Otro' ? (s.anticoncepcionOtro || null) : null }
      : null,
    antecedentes: s.antecedentes,
    antecedentesDesc: s.antecedentesDesc || null,
    estudios: s.estudios,
    estudiosDesc: s.estudiosDesc || null,
    examen: { mamario: s.examenMamario || null, ginecologico: s.examenGinecologico || null },
    proximoControl: s.proximoControl || null,
  }

  const formula = formulaObstetrica(gestaciones)
  const objetivo = [
    formula,
    s.fum && `FUM ${s.fum}`,
    s.examenMamario && `Mamas: ${s.examenMamario}`,
    s.examenGinecologico && `Ginecológico: ${s.examenGinecologico}`,
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
    plan: s.conducta || '',
    medicacion,
    datos,
    observaciones: [],
  }
}
