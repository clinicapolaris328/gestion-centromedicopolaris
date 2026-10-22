/* ============================================================================
 *  Metadatos de las variables numéricas de la HC (observacion_clinica) para la
 *  vista de EVOLUCIÓN (C2) y los rangos de referencia orientativos (base de C3).
 *
 *  Los `variable` son los MISMOS nombres que usan las plantillas al guardar las
 *  observaciones (data/hc/*.js) → una sola serie longitudinal por paciente, que
 *  sirve a TODAS las especialidades con un único motor (igual que C1/C4).
 *
 *  `rango` es una REFERENCIA visual orientativa — NO es diagnóstico ni una alerta.
 *  Las ALERTAS las pautan los profesionales (C3, tabla alerta_regla): si existe
 *  una regla aplicable (personal > especialidad), reemplaza a esta referencia.
 *  `rangoPorSexo` ({ F, M }) reemplaza a `rango` cuando el umbral depende del sexo
 *  del paciente (cintura, ICC); sin sexo F/M en la ficha no se marca nada.
 *  `clases` = clasificación orientativa del último valor (IMC por grados, glucemia
 *  y HbA1c), con la fuente en `fuente`. Tampoco es diagnóstico.
 * ========================================================================== */

export const META_VARIABLE = {
  ta_sistolica:    { label: 'TA sistólica', unidad: 'mmHg', grupo: 'Signos vitales', rango: [90, 140] },
  ta_diastolica:   { label: 'TA diastólica', unidad: 'mmHg', grupo: 'Signos vitales', rango: [60, 90] },
  fc:              { label: 'Frecuencia cardíaca', unidad: 'lpm', grupo: 'Signos vitales', rango: [60, 100] },
  fr:              { label: 'Frecuencia respiratoria', unidad: 'rpm', grupo: 'Signos vitales', rango: [12, 20] },
  temperatura:     { label: 'Temperatura', unidad: '°C', grupo: 'Signos vitales', rango: [36, 37.5] },
  saturacion:      { label: 'Saturación O₂', unidad: '%', grupo: 'Signos vitales', rango: [95, 100] },
  peso:            { label: 'Peso', unidad: 'kg', grupo: 'Antropometría' },
  talla:           { label: 'Talla', unidad: 'cm', grupo: 'Antropometría' },
  imc: {
    label: 'IMC', unidad: 'kg/m²', grupo: 'Antropometría', rango: [18.5, 25],
    fuente: 'OMS',
    clases: [[18.5, 'Bajo peso'], [25, 'Normal'], [30, 'Sobrepeso'], [35, 'Obesidad grado I'], [40, 'Obesidad grado II'], [null, 'Obesidad grado III']],
  },
  cintura: {
    label: 'Circunferencia de cintura', unidad: 'cm', grupo: 'Antropometría',
    fuente: 'OMS / ATP III (riesgo cardiometabólico)', rangoPorSexo: { F: [null, 88], M: [null, 102] },
  },
  perimetro_cefalico: { label: 'Perímetro cefálico', unidad: 'cm', grupo: 'Antropometría' },
  glucemia: {
    label: 'Glucemia', unidad: 'mg/dL', grupo: 'Laboratorio', rango: [70, 100],
    fuente: 'ADA, glucemia en ayunas',
    clases: [[70, 'Hipoglucemia'], [100, 'Normal'], [126, 'Glucemia alterada en ayunas'], [null, 'Rango de diabetes']],
  },
  hba1c: {
    label: 'HbA1c', unidad: '%', grupo: 'Laboratorio', rango: [null, 5.7],
    fuente: 'ADA',
    clases: [[5.7, 'Normal'], [6.5, 'Rango de prediabetes'], [null, 'Rango de diabetes']],
  },
  colesterol_total:{ label: 'Colesterol total', unidad: 'mg/dL', grupo: 'Laboratorio', rango: [null, 200] },
  hdl:             { label: 'HDL', unidad: 'mg/dL', grupo: 'Laboratorio', rango: [40, null] },
  ldl:             { label: 'LDL', unidad: 'mg/dL', grupo: 'Laboratorio', rango: [null, 100] },
  trigliceridos:   { label: 'Triglicéridos', unidad: 'mg/dL', grupo: 'Laboratorio', rango: [null, 150] },
  tsh:             { label: 'TSH', unidad: 'µUI/mL', grupo: 'Laboratorio', rango: [0.4, 4] },
  t4_libre:        { label: 'T4 libre', unidad: 'ng/dL', grupo: 'Laboratorio', rango: [0.8, 1.8] },
  pcr:             { label: 'PCR', unidad: 'mg/L', grupo: 'Laboratorio', rango: [null, 5] },
  vsg:             { label: 'VSG', unidad: 'mm/h', grupo: 'Laboratorio', rango: [null, 20] },
  fev1:            { label: 'FEV1', unidad: 'L', grupo: 'Función respiratoria' },
  fev1_pct:        { label: 'FEV1 (% del predicho)', unidad: '%', grupo: 'Función respiratoria', rango: [80, null] },
  cadera:          { label: 'Circunferencia de cadera', unidad: 'cm', grupo: 'Antropometría' },
  icc: {
    label: 'Relación cintura/cadera', unidad: '', grupo: 'Antropometría',
    fuente: 'OMS', rangoPorSexo: { F: [null, 0.85], M: [null, 0.9] },
  },
  grasa_pct:       { label: '% de grasa corporal', unidad: '%', grupo: 'Antropometría' },
  masa_muscular:   { label: 'Masa muscular', unidad: 'kg', grupo: 'Antropometría' },
  av_od_sc:        { label: 'Agudeza visual OD (sin corrección)', unidad: 'decimal', grupo: 'Oftalmología' },
  av_oi_sc:        { label: 'Agudeza visual OI (sin corrección)', unidad: 'decimal', grupo: 'Oftalmología' },
  av_od_cc:        { label: 'Agudeza visual OD (con corrección)', unidad: 'decimal', grupo: 'Oftalmología' },
  av_oi_cc:        { label: 'Agudeza visual OI (con corrección)', unidad: 'decimal', grupo: 'Oftalmología' },
  pio_od:          { label: 'Presión intraocular OD', unidad: 'mmHg', grupo: 'Oftalmología', rango: [10, 21] },
  pio_oi:          { label: 'Presión intraocular OI', unidad: 'mmHg', grupo: 'Oftalmología', rango: [10, 21] },
  glasgow:         { label: 'Glasgow', unidad: 'pts', grupo: 'Escalas' },
  nihss:           { label: 'NIHSS', unidad: 'pts', grupo: 'Escalas' },
  dolor_eva:       { label: 'Dolor (EVA)', unidad: '/10', grupo: 'Escalas' },
  dolor_eva_post:  { label: 'Dolor post tratamiento (EVA)', unidad: '/10', grupo: 'Escalas' },
}

// Orden en que se agrupan los gráficos (Signos vitales primero — foco cardiológico).
export const GRUPOS_ORDEN = ['Signos vitales', 'Función respiratoria', 'Antropometría', 'Laboratorio', 'Oftalmología', 'Escalas', 'Otros']

/** Metadatos de una variable (fallback neutro si no está catalogada). */
export const metaDe = (variable) =>
  META_VARIABLE[variable] || { label: variable, unidad: '', grupo: 'Otros' }

/** Rango de referencia de una variable para el sexo del paciente ('F'|'M'|otro).
 *  Con `rangoPorSexo`, solo F/M tienen referencia (sin sexo no se asume ninguno). */
export function referenciaDe(variable, sexo) {
  const m = META_VARIABLE[variable]
  if (!m) return null
  if (m.rangoPorSexo) return m.rangoPorSexo[sexo] || null
  return m.rango || null
}

/** Clasificación orientativa de un valor (ej. IMC 32 → 'Obesidad grado I') o null.
 *  Cada clase es [hasta (exclusivo), etiqueta]; la última (hasta null) no tiene tope. */
export function claseValor(variable, valor) {
  const clases = META_VARIABLE[variable]?.clases
  if (!clases || valor == null) return null
  const c = clases.find(([hasta]) => hasta == null || valor < hasta)
  return c ? c[1] : null
}

const rangoTexto = ([min, max], unidad) => {
  const u = unidad ? ` ${unidad}` : ''
  if (min != null && max != null) return `${min}–${max}${u}`
  return max != null ? `< ${max}${u}` : `≥ ${min}${u}`
}

/** Texto de la referencia orientativa (para quien pauta una alerta C3). */
export function textoReferencia(variable) {
  const m = META_VARIABLE[variable]
  if (!m) return null
  const partes = []
  if (m.rangoPorSexo) {
    if (m.rangoPorSexo.F) partes.push(`${rangoTexto(m.rangoPorSexo.F, m.unidad)} (mujeres)`)
    if (m.rangoPorSexo.M) partes.push(`${rangoTexto(m.rangoPorSexo.M, m.unidad)} (hombres)`)
  } else if (m.rango) partes.push(rangoTexto(m.rango, m.unidad))
  if (!partes.length) return null
  return `${partes.join(' · ')}${m.fuente ? ` — ${m.fuente}` : ''}`
}

/** Estado de un valor frente a un rango: 'ok' | 'alto' | 'bajo' | null.
 *  `rango` = el de la regla aplicable (C3); si no se pasa, la referencia de la
 *  variable. (Orientativo, nunca diagnóstico.) */
export function estadoValor(variable, valor, rango) {
  const r = rango === undefined ? META_VARIABLE[variable]?.rango : rango
  if (!r || valor == null) return null
  const [min, max] = r
  if (min != null && valor < min) return 'bajo'
  if (max != null && valor > max) return 'alto'
  return 'ok'
}

const canon = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Regla de alerta (C3) que aplica a `variable` para quien mira la ficha:
 *  1) la regla PERSONAL de su profesional; 2) la de su ESPECIALIDAD; 3) ninguna →
 *  se usa la referencia de la variable (solo visual). Solo reglas activas.
 *  `viewer` = profesional vinculado al usuario ({ id, especialidad }) o null.
 *  Devuelve { rango, origen: 'personal'|'especialidad'|'referencia'|null, mensaje, regla }. */
export function reglaAplicable(variable, reglas, viewer, sexo) {
  const activas = (reglas || []).filter((r) => r.activo && r.variable === variable)
  const personal = viewer?.id && activas.find((r) => r.ambito === 'profesional' && r.profId === viewer.id)
  const deEsp = viewer?.especialidad && activas.find((r) => r.ambito === 'especialidad' && canon(r.especialidad) === canon(viewer.especialidad))
  const r = personal || deEsp
  if (r) return { rango: [r.minimo, r.maximo], origen: personal ? 'personal' : 'especialidad', mensaje: r.mensaje || null, regla: r }
  const ref = referenciaDe(variable, sexo)
  return ref ? { rango: ref, origen: 'referencia', mensaje: null, regla: null } : { rango: null, origen: null, mensaje: null, regla: null }
}

/** Arma los gráficos (C2) a partir de observaciones: una serie por variable y la
 *  presión arterial combinada (sistólica + diastólica). Cada serie lleva la regla
 *  pautada que aplica a quien mira (C3) o la referencia orientativa (según el
 *  `sexo` del paciente cuando corresponde). Lo usan la pestaña Gráficos (todas las
 *  especialidades) y el Resumen (solo su especialidad). */
export function armarGraficos(observaciones, reglas, viewer, sexo) {
  const porVar = {}
  const unidadObs = {}
  for (const o of observaciones) {
    if (o.valor == null) continue
    ;(porVar[o.variable] ??= []).push({ fecha: o.fecha, valor: o.valor })
    if (o.unidad) unidadObs[o.variable] ??= o.unidad
  }
  for (const k in porVar) porVar[k].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const conRegla = (serie) => {
    const r = reglaAplicable(serie.variable, reglas, viewer, sexo)
    return { ...serie, rango: r.rango, origen: r.origen, mensaje: r.mensaje }
  }
  const charts = []
  if (porVar.ta_sistolica || porVar.ta_diastolica) {
    charts.push({
      key: 'ta', titulo: 'Presión arterial', unidad: 'mmHg', grupo: 'Signos vitales', rango: null,
      series: [
        porVar.ta_sistolica && { variable: 'ta_sistolica', nombre: 'Sistólica', color: '#2563eb', puntos: porVar.ta_sistolica },
        porVar.ta_diastolica && { variable: 'ta_diastolica', nombre: 'Diastólica', color: '#9333ea', puntos: porVar.ta_diastolica },
      ].filter(Boolean).map(conRegla),
    })
  }
  for (const [variable, puntos] of Object.entries(porVar)) {
    if (variable === 'ta_sistolica' || variable === 'ta_diastolica') continue
    const m = metaDe(variable)
    const serie = conRegla({ variable, nombre: m.label, puntos })
    charts.push({ key: variable, titulo: m.label, unidad: m.unidad || unidadObs[variable] || '', grupo: m.grupo, rango: serie.rango, series: [serie] })
  }
  charts.sort((a, b) => GRUPOS_ORDEN.indexOf(a.grupo) - GRUPOS_ORDEN.indexOf(b.grupo))
  return charts
}
