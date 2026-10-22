/* Generador de contraseñas aleatorias seguras.
 * Portado de AlgoritmoGeneracionPasswAleat/passwordSecurity.py (parte de
 * GENERACIÓN). Alfabeto = letras + dígitos + un set CHICO de símbolos amigables,
 * excluyendo caracteres ambiguos. Longitud corta (10) para que sean fáciles de
 * comunicar/tipear, pero con muestreo sin sesgo (CSPRNG). El HASH lo hace
 * Supabase Auth (bcrypt); acá NO se hashea ni almacena. */

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SIMBOLOS = '!@#$%*?-' // set chico y "amigable" (sin < > & " ')
const AMBIGUOUS = 'il1Lo0O'

function alfabeto(): string {
  return [...(LETTERS + DIGITS + SIMBOLOS)]
    .filter((c) => !AMBIGUOUS.includes(c))
    .join('')
}

// Entero aleatorio en [0, max) sin sesgo de módulo (rejection sampling).
function randInt(max: number): number {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

export function generarPassword(longitud = 10): string {
  const a = alfabeto()
  let out = ''
  for (let i = 0; i < longitud; i++) out += a[randInt(a.length)]
  return out
}
