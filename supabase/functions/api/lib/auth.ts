import type { Context } from '../deps.ts'
import { getCookie, setCookie, deleteCookie } from '../deps.ts'
import { anonClient } from './supabase.ts'

const ACCESS = 'sb-access'
const REFRESH = 'sb-refresh'
const horas = Number(Deno.env.get('SESSION_MAX_AGE_HOURS')) || 8
const MAX_AGE = horas * 60 * 60 // Hono usa maxAge en segundos

function cookieOpts(c: Context) {
  const isHttps = new URL(c.req.url).protocol === 'https:'
  return {
    httpOnly: true,
    secure: isHttps, // en prod (https) sí; en dev local (http) no, para que el navegador la acepte
    sameSite: 'Lax' as const,
    maxAge: MAX_AGE,
    path: '/',
  }
}

export function setAuthCookies(c: Context, session: { access_token: string; refresh_token: string }) {
  setCookie(c, ACCESS, session.access_token, cookieOpts(c))
  setCookie(c, REFRESH, session.refresh_token, cookieOpts(c))
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS, { path: '/' })
  deleteCookie(c, REFRESH, { path: '/' })
}

// iat (issued-at, en segundos) de un JWT, decodificando el payload base64url.
function tokenIat(jwt: string): number {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).iat ?? 0
  } catch {
    return 0
  }
}

/**
 * Reconstruye la sesión desde las cookies. Si el access token expiró, setSession
 * lo renueva con el refresh token y rotamos cookies. Devuelve { client, user,
 * session } o null. Misma lógica que el backend Express.
 */
export async function resolveSession(c: Context) {
  const access = getCookie(c, ACCESS)
  const refresh = getCookie(c, REFRESH)
  if (!access || !refresh) return null

  const client = anonClient()
  const { data, error } = await client.auth.setSession({ access_token: access, refresh_token: refresh })
  if (error || !data?.session || !data.user) return null

  if (data.session.access_token !== access) setAuthCookies(c, data.session)

  // La función está co-ubicada con la base: con un token recién emitido, a veces
  // PostgREST todavía lo ve "en el futuro" (micro-desfasaje de reloj GoTrue↔PostgREST).
  // Si el token es fresco, probamos hasta que sea aceptado, así ninguna ruta ve el error.
  if (tokenIat(data.session.access_token) > Math.floor(Date.now() / 1000) - 10) {
    for (let i = 0; i < 6; i++) {
      const { error: probe } = await client.from('perfil').select('id').limit(1)
      if (!probe || !/future/i.test(probe.message ?? '')) break
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  return { client, user: data.user, session: data.session }
}
