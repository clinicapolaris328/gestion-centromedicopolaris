import { createClient } from '../deps.ts'

// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son inyectadas
// automáticamente por la runtime de Edge Functions.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Cliente anónimo sin persistencia: cada request gestiona su propia sesión a
 * partir de las cookies httpOnly (patrón BFF stateless). Idéntico al de Express.
 */
export function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Cliente con service_role: SOLO para operaciones administrativas del lado del
 * servidor (resolver usuario→email en el login, alta/edición/baja de usuarios).
 * Nunca se expone al frontend. Ignora RLS: usar con cuidado y gateado a admin.
 */
export function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
