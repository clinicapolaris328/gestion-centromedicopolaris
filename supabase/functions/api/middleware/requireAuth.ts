import type { Context, Next, Env } from '../deps.ts'
import { resolveSession } from '../lib/auth.ts'

/**
 * Exige sesión válida. Deja en el contexto (c.get):
 *   'db'      → cliente Supabase autenticado (ejecuta como el usuario, la RLS aplica)
 *   'user'    → usuario de Auth
 *   'session' → sesión (tokens)
 * Corta con 401 si no hay sesión.
 */
export async function requireAuth(c: Context<Env>, next: Next) {
  const s = await resolveSession(c)
  if (!s) return c.json({ error: 'No autenticado.' }, 401)
  c.set('db', s.client)
  c.set('user', s.user)
  c.set('session', s.session)
  await next()
}
