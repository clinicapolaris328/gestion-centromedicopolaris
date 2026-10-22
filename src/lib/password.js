/**
 * Política de contraseñas — espejo VISUAL de la regla del backend
 * (supabase/functions/api/lib/password.ts, fuente única). Solo guía al usuario
 * mientras escribe; quien valida de verdad es la API. Si cambia allá, cambiar acá.
 */
export const PASSWORD_MIN = 10
const bytes = (p) => new TextEncoder().encode(p).length

export const REQUISITOS_PASSWORD = [
  { id: 'largo', texto: `${PASSWORD_MIN}+ caracteres`, test: (p) => p.length >= PASSWORD_MIN && bytes(p) <= 72 },
  { id: 'mayus', texto: 'Una mayúscula', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'minus', texto: 'Una minúscula', test: (p) => /\p{Ll}/u.test(p) },
  { id: 'numero', texto: 'Un número', test: (p) => /\p{N}/u.test(p) },
  { id: 'simbolo', texto: 'Un símbolo (! @ # $ % * ? -)', test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
  { id: 'espacios', texto: 'Sin espacios', test: (p) => !/\s/.test(p) },
]

export const cumplePolitica = (p) => REQUISITOS_PASSWORD.every((r) => r.test(p))
