/* "Una persona = UNA ficha" — COPIA EXACTA de la regla del backend
 * (supabase/functions/api/lib/profesional.ts → palabrasNombre / mismaPersona).
 * La interfaz la usa para AVISAR antes de guardar; el servidor la usa para
 * BLOQUEAR. Al ser la misma regla, lo que se avisa es exactamente lo que se
 * rechaza. Si se cambia una, cambiar la otra. */

const TITULOS = new Set(['dr', 'dra', 'doctor', 'doctora', 'lic', 'de', 'la', 'del', 'y'])

export function palabrasNombre(nombre) {
  return new Set(String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !TITULOS.has(w)))
}

/** Misma persona: comparten 2+ palabras, o todas las de uno están en el otro. */
export function mismaPersona(a, b) {
  const A = palabrasNombre(a), B = palabrasNombre(b)
  const comunes = [...A].filter((w) => B.has(w)).length
  if (!comunes) return false
  if (comunes >= 2) return true
  return [...A].every((w) => B.has(w)) || [...B].every((w) => A.has(w))
}
