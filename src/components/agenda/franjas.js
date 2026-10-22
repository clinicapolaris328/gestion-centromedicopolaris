/* Cálculo de franjas horarias para las grillas (Día y Semana).
 * En Fase A las franjas se derivan de los turnos existentes; en Fase C pasarán
 * a construirse desde los horarios de atención de cada profesional. */

export const PASO = 30 // minutos entre franjas base
const BASE_INICIO = 8 * 60 // 08:00 (horario corrido base de la clínica)
const BASE_FIN = 20 * 60 // 20:00
// Corte mañana/tarde (hora): < 13 = mañana. Único lugar donde se define; lo usa
// también el filtro de franja de la Agenda. Ajustable.
export const CORTE_MANANA = 13

const aMin = (h) => { const [H, M] = h.split(':').map(Number); return H * 60 + M }
const aHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const rango = (desde, hasta, paso = PASO) => {
  const out = []
  for (let m = desde; m <= hasta; m += paso) out.push(aHHMM(m))
  return out
}

/** Grilla de 30' que SIEMPRE cubre el día base (08:00–20:00) y se extiende si hay
 *  turnos fuera de ese rango, unida con las horas exactas de cada turno. Así un
 *  único turno (p. ej. 09:00) no "colapsa" la agenda a esa sola fila. */
export function construirFranjas(horas, franja = '') {
  const mins = horas.map(aMin)
  const corte = CORTE_MANANA * 60
  // El rango base se acota a la franja elegida: mañana 08:00–12:30, tarde
  // 13:00–20:00. Igual se extiende si hay turnos fuera de ese rango.
  const baseIni = franja === 'tarde' ? corte : BASE_INICIO
  const baseFin = franja === 'manana' ? corte - PASO : BASE_FIN
  const min = Math.min(baseIni, ...mins)
  const max = Math.max(baseFin, ...mins)
  const desde = min - (min % PASO)
  const hasta = max % PASO ? max + (PASO - (max % PASO)) : max
  const set = new Set([...rango(desde, hasta), ...horas])
  return [...set].sort()
}
