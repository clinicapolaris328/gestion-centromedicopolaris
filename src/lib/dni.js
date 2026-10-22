/** Utilidades de DNI. Se guarda canónico (solo dígitos) y se muestra con puntos. */

// Deja solo dígitos: "20.352.652" / "DNI 20352652" → "20352652".
export const soloDigitos = (v) => (v || '').replace(/\D/g, '')

// Formato de lectura: "20352652" → "20.352.652". Si no hay dígitos, devuelve tal cual.
export const formatearDni = (v) => {
  const d = soloDigitos(v)
  if (!d) return v || ''
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
