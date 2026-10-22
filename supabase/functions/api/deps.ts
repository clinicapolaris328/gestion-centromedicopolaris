// Dependencias centralizadas de la Edge Function (runtime Deno de Supabase).
// Los especificadores se resuelven vía el import-map de deno.json.
import type { Context, Next } from 'hono'
import type { SupabaseClient, Session, User } from '@supabase/supabase-js'

export { Hono } from 'hono'
export { getCookie, setCookie, deleteCookie } from 'hono/cookie'
export { cors } from 'hono/cors'
export { secureHeaders } from 'hono/secure-headers'
export { createClient } from '@supabase/supabase-js'
export { z } from 'zod'
export type { Context, Next, SupabaseClient, Session, User }

// Variables que colgamos en el contexto de cada request (c.set/c.get).
export type Env = {
  Variables: {
    db: SupabaseClient
    user: User
    session: Session
    data: any
  }
}
