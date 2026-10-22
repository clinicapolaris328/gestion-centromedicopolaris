/* ============================================================================
 *  Plantilla de Nutrición — Historia Clínica estructurada (spec §8)
 *  Mismo molde que las demás:
 *    - core SOAP: motivo; diagnóstico = evaluación nutricional; plan = plan alimentario
 *    - datos JSONB: objetivos, antropometría, historia alimentaria, actividad física
 *    - observaciones: peso, talla, imc, cintura (MISMOS nombres que Clínica (obesidad)
 *      y Endocrino → una sola serie, §23) + cadera, icc, grasa_pct, masa_muscular.
 *  Aplica a "Nutrición" (cualquier grafía). No a "Obesidad y medicina deportiva".
 * ========================================================================== */
import { calcularIMC } from './cardiologia'

export const esNutricion = (esp) => /^\s*nutrici/i.test(esp || '')

export const OBJETIVOS_NUTRI = [
  'Descenso de peso', 'Aumento de peso', 'Diabetes', 'Hipertensión', 'Dislipemia',
  'Enfermedad cardiovascular', 'Nutrición deportiva', 'Embarazo', 'Patología gastrointestinal',
  'Educación alimentaria', 'Otro',
]

export const COMIDAS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Colaciones']
export const FRECUENCIA = ['Nunca', 'Ocasional', 'Semanal', 'Diario']

// Consumos y grupos de alimentos (spec §8): clave → etiqueta. Se registra la frecuencia.
export const CONSUMOS = [
  ['bebidasAzucaradas', 'Bebidas azucaradas'],
  ['alcohol', 'Alcohol'],
  ['frutas', 'Frutas'],
  ['verduras', 'Verduras'],
  ['carnes', 'Carnes'],
  ['lacteos', 'Lácteos'],
  ['harinas', 'Harinas'],
  ['ultraprocesados', 'Ultraprocesados'],
]

// Categorías de estudio (C4) que suma Nutrición.
export const CATEGORIAS_ESTUDIO_NUTRI = ['Bioimpedancia / composición corporal', 'Plan alimentario']

const CONSUMOS_VACIO = Object.fromEntries(CONSUMOS.map(([k]) => [k, '']))

export const NUTRI_VACIO = {
  motivo: '',
  objetivosPaciente: [],
  enfermedadActual: '',
  antro: {
    peso: '', talla: '', pesoHabitual: '', pesoMaximo: '', pesoMinimo: '', pesoObjetivo: '',
    cintura: '', cadera: '', grasaPct: '', masaMuscular: '',
  },
  comidas: [],
  horarios: '',
  aguaLitros: '',
  consumos: CONSUMOS_VACIO,
  actividadTipo: '',
  actividadFrecuencia: '',   // veces por semana
  actividadDuracion: '',     // minutos
  evaluacion: '',
  objetivos: '',
  planAlimentario: '',
  indicaciones: '',
  proximoControl: '',
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Relación cintura/cadera (2 decimales) o null. */
export const calcularICC = (cintura, cadera) => {
  const ci = num(cintura)
  const ca = num(cadera)
  if (!ci || !ca) return null
  return Math.round((ci / ca) * 100) / 100
}

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function nutriDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const act = obj(d.actividadFisica)
  return {
    ...NUTRI_VACIO,
    motivo: ev.motivo || '',
    objetivosPaciente: arr(d.objetivosPaciente),
    enfermedadActual: ev.subjetivo || '',
    antro: { ...NUTRI_VACIO.antro, ...obj(d.antropometria) },
    comidas: arr(d.comidas),
    horarios: d.horarios || '',
    aguaLitros: d.aguaLitros ?? '',
    consumos: { ...CONSUMOS_VACIO, ...obj(d.consumos) },
    actividadTipo: act.tipo || '',
    actividadFrecuencia: act.frecuencia ?? '',
    actividadDuracion: act.duracion ?? '',
    evaluacion: ev.diagnostico || '',
    objetivos: d.objetivos || '',
    planAlimentario: ev.plan || '',
    indicaciones: d.indicaciones || '',
    proximoControl: d.proximoControl || '',
  }
}

/** Transforma el estado del formulario de Nutrición en el payload del backend. */
export function construirPayloadNutri(s) {
  const a = s.antro
  const imc = calcularIMC(a.peso, a.talla)
  const icc = calcularICC(a.cintura, a.cadera)

  const observaciones = []
  const push = (variable, valor, unidad) => { if (valor != null) observaciones.push({ variable, valor, unidad }) }
  push('peso', num(a.peso), 'kg')
  push('talla', num(a.talla), 'cm')
  push('imc', imc, 'kg/m2')
  push('cintura', num(a.cintura), 'cm')
  push('cadera', num(a.cadera), 'cm')
  push('icc', icc, '')
  push('grasa_pct', num(a.grasaPct), '%')
  push('masa_muscular', num(a.masaMuscular), 'kg')

  const consumos = Object.fromEntries(CONSUMOS.map(([k]) => [k, s.consumos[k] || '']))

  const datos = {
    plantilla: 'nutricion',
    objetivosPaciente: s.objetivosPaciente,
    antropometria: a, // tal cual se cargó, para reabrir el formulario
    imc,
    icc,
    comidas: s.comidas,
    horarios: s.horarios || null,
    aguaLitros: num(s.aguaLitros),
    consumos,
    actividadFisica: s.actividadTipo
      ? { tipo: s.actividadTipo, frecuencia: num(s.actividadFrecuencia), duracion: num(s.actividadDuracion) }
      : null,
    objetivos: s.objetivos || null,
    indicaciones: s.indicaciones || null,
    proximoControl: s.proximoControl || null,
  }

  // Objetivo legible (SOAP): antropometría principal.
  const objetivo = [
    num(a.peso) != null && `Peso ${num(a.peso)} kg`,
    imc != null && `IMC ${imc}`,
    num(a.cintura) != null && `Cintura ${num(a.cintura)} cm`,
    icc != null && `ICC ${icc}`,
    num(a.grasaPct) != null && `Grasa ${num(a.grasaPct)}%`,
  ].filter(Boolean).join(' · ')

  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: s.enfermedadActual || '',
    objetivo,
    diagnostico: s.evaluacion || '',
    plan: s.planAlimentario || '',
    medicacion: [],
    datos,
    observaciones,
  }
}
