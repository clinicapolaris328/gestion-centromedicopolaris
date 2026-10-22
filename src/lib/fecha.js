/** Fecha "de hoy" (YYYY-MM-DD) en horario de Argentina, para que las vistas
 *  del día (Agenda, Dashboard) coincidan sin importar la zona del navegador y
 *  en línea con cómo el backend fija la fecha de un turno. */
export const hoyISO = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

/* --------------------------------------------------------------------------
 * Utilidades sobre fechas ISO (YYYY-MM-DD)
 * Trabajamos con strings ISO y Date locales fijadas al mediodía para evitar
 * corrimientos por zona horaria / horario de verano al sumar o restar días.
 * ------------------------------------------------------------------------ */

/** ISO 'YYYY-MM-DD' → Date local al mediodía. */
export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/** Date → 'YYYY-MM-DD' (local). */
export const aISO = (date) => date.toLocaleDateString('en-CA')

/** Suma (o resta) días a una fecha ISO y devuelve ISO. */
export const sumarDias = (iso, n) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return aISO(d)
}

export const sumarMeses = (iso, n) => {
  const d = parseISO(iso)
  d.setMonth(d.getMonth() + n)
  return aISO(d)
}

export const sumarAnios = (iso, n) => {
  const d = parseISO(iso)
  d.setFullYear(d.getFullYear() + n)
  return aISO(d)
}

/** Lunes de la semana que contiene la fecha (semana lun→dom). */
export const inicioSemana = (iso) => {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - dow)
  return aISO(d)
}
export const finSemana = (iso) => sumarDias(inicioSemana(iso), 6)

export const inicioMes = (iso) => `${iso.slice(0, 7)}-01`
export const finMes = (iso) => {
  const d = parseISO(iso)
  return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
}

export const inicioAnio = (iso) => `${iso.slice(0, 4)}-01-01`
export const finAnio = (iso) => `${iso.slice(0, 4)}-12-31`

/** Lista de ISO desde→hasta (inclusive). */
export const diasEntre = (desde, hasta) => {
  const out = []
  let cur = desde
  let guard = 0
  while (cur <= hasta && guard < 400) {
    out.push(cur)
    cur = sumarDias(cur, 1)
    guard++
  }
  return out
}

/* --------------------------------------------------------------------------
 * Formato para mostrar (es-AR)
 * ------------------------------------------------------------------------ */
export const fmtFechaLarga = (iso) =>
  parseISO(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

export const fmtFechaCorta = (iso) =>
  parseISO(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })

export const fmtDiaSemana = (iso) =>
  parseISO(iso).toLocaleDateString('es-AR', { weekday: 'short' })

export const fmtMesAnio = (iso) =>
  parseISO(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

export const fmtMesCorto = (iso) =>
  parseISO(iso).toLocaleDateString('es-AR', { month: 'short' })

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/* --------------------------------------------------------------------------
 * "Ahora" para el filtro de atención de la agenda
 * ------------------------------------------------------------------------ */

/** Día de la semana (0=domingo … 6=sábado) de una fecha ISO. */
export const diaSemanaISO = (iso) => parseISO(iso).getDay()

/** Hora actual "HH:MM" (24 h) en horario de Argentina. */
export const horaActualAR = () =>
  new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
