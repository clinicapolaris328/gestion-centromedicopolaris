import type { Context, Env, Next } from '../deps.ts'

/** Perfil del usuario autenticado (rol + profesional vinculado). */
export async function perfilCaller(c: Context<Env>): Promise<{ rol: string | null; profesionalId: string | null }> {
  const { data } = await c.get('db').from('perfil').select('rol, profesional_id').eq('id', c.get('user').id).maybeSingle()
  // deno-lint-ignore no-explicit-any
  const p = data as any
  return { rol: p?.rol ?? null, profesionalId: p?.profesional_id ?? null }
}

/**
 * Aislamiento de datos por rol. Si el usuario es 'profesional', devuelve el id de
 * profesional al que deben quedar limitadas sus consultas (turnos/pacientes/
 * evoluciones/observaciones). Para el resto de roles devuelve null (sin límite).
 * Si un 'profesional' no está vinculado a una ficha, devuelve un id imposible
 * (→ resultados vacíos) en vez de exponer todo.
 */
export async function scopeProfesional(c: Context<Env>): Promise<string | null> {
  const { rol, profesionalId } = await perfilCaller(c)
  if (rol !== 'profesional') return null
  return profesionalId ?? '00000000-0000-0000-0000-000000000000'
}

/** Middleware: un rol 'profesional' no puede escribir (solo GET) en este router. */
export async function soloLecturaSiProfesional(c: Context<Env>, next: Next) {
  if (c.req.method !== 'GET') {
    const { rol } = await perfilCaller(c)
    if (rol === 'profesional') return c.json({ error: 'No disponible para tu perfil.' }, 403)
  }
  await next()
}

/**
 * ¿El usuario puede operar sobre este paciente? Para el rol 'profesional' solo
 * si le pertenece (paciente.profesional_id) o lo atendió (tiene un turno o una
 * evolución con él); el resto de roles, sí.
 */
export async function puedeVerPaciente(c: Context<Env>, pacienteId: string): Promise<boolean> {
  const scope = await scopeProfesional(c)
  if (!scope) return true
  const db = c.get('db')
  const [p, t, e] = await Promise.all([
    db.from('paciente').select('id', { count: 'exact', head: true }).eq('profesional_id', scope).eq('id', pacienteId),
    db.from('turno').select('id', { count: 'exact', head: true }).eq('profesional_id', scope).eq('paciente_id', pacienteId),
    db.from('evolucion').select('id', { count: 'exact', head: true }).eq('profesional_id', scope).eq('paciente_id', pacienteId),
  ])
  return (p.count ?? 0) > 0 || (t.count ?? 0) > 0 || (e.count ?? 0) > 0
}
