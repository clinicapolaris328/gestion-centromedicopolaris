/* ============================================================================
 *  Plantilla de Ecografía — Informe ecográfico estructurado
 *  (no definida en la spec HCE). El ecografista no hace una consulta clínica sino
 *  un ESTUDIO: la evolución registra el informe (indicación, tipo, hallazgos,
 *  mediciones, conclusión) y las imágenes/PDF se cargan en Estudios (C4)
 *  adjuntos a esa evolución, con la categoría "Ecografía" o "Doppler vascular".
 *    - core SOAP: motivo = indicación; objetivo = hallazgos;
 *      diagnóstico = conclusión; plan = recomendaciones.
 *    - datos JSONB: tipo de estudio, derivante, técnica, mediciones (filas).
 *    - sin observaciones numéricas (las mediciones dependen de cada estructura).
 *  Aplica a "Ecografista" / "Ecografía" (cualquier grafía).
 * ========================================================================== */

export const esEcografia = (esp) => /^\s*ecograf/i.test(esp || '')

export const TIPOS_ECO = [
  'Abdominal', 'Hepatobiliar', 'Renal y vías urinarias', 'Ginecológica (transvaginal)', 'Pelviana',
  'Obstétrica', 'Mamaria', 'Tiroidea', 'Partes blandas', 'Musculoesquelética',
  'Doppler vascular', 'Testicular', 'Otra',
]

// Categorías de estudio (C4) que suma Ecografía ("Ecografía" ya existe; spec §5: Doppler vascular).
export const CATEGORIAS_ESTUDIO_ECO = ['Doppler vascular']

export const MEDICION_VACIA = { estructura: '', valor: '', unidad: 'mm' }
export const UNIDADES_ECO = ['mm', 'cm', 'ml', 'cm/s', 'semanas']

export const ECO_VACIO = {
  motivo: '',          // indicación / motivo del estudio
  tipoEstudio: '',
  tipoOtro: '',
  derivante: '',       // profesional que lo solicita
  tecnica: '',
  hallazgos: '',
  mediciones: [],
  conclusion: '',
  recomendaciones: '',
}

const arr = (v) => (Array.isArray(v) ? v : [])
const conDatos = (m) => String(m.estructura).trim() || String(m.valor).trim()
const limpiar = (filas) => arr(filas)
  .map((m) => ({
    estructura: String(m?.estructura ?? '').trim(),
    valor: String(m?.valor ?? '').trim(),
    unidad: String(m?.unidad ?? '').trim(),
  }))
  .filter(conDatos)

/** Reconstruye el estado del formulario a partir de una evolución guardada. */
export function ecoDesdeEvolucion(ev) {
  const d = ev.datos || {}
  const tipo = d.tipoEstudio || ''
  const conocido = !tipo || TIPOS_ECO.includes(tipo)
  return {
    ...ECO_VACIO,
    motivo: ev.motivo || '',
    tipoEstudio: conocido ? tipo : 'Otra',
    tipoOtro: conocido ? '' : tipo,
    derivante: d.derivante || '',
    tecnica: d.tecnica || '',
    hallazgos: ev.objetivo || '',
    mediciones: limpiar(d.mediciones),
    conclusion: ev.diagnostico || '',
    recomendaciones: ev.plan || '',
  }
}

/** Transforma el informe ecográfico en el payload del backend. */
export function construirPayloadEco(s) {
  const tipoEstudio = s.tipoEstudio === 'Otra' ? (s.tipoOtro.trim() || 'Otra') : (s.tipoEstudio || null)
  const datos = {
    plantilla: 'ecografia',
    tipoEstudio,
    derivante: s.derivante || null,
    tecnica: s.tecnica || null,
    mediciones: limpiar(s.mediciones),
  }
  // Los textos vacíos viajan como '' (la API no admite null en estos campos).
  return {
    motivo: s.motivo,
    subjetivo: '',
    objetivo: s.hallazgos || '',
    diagnostico: s.conclusion || '',
    plan: s.recomendaciones || '',
    medicacion: [],
    datos,
    observaciones: [],
  }
}
