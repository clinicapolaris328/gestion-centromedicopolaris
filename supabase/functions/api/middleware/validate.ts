import type { Context, Next, Env } from '../deps.ts'

/**
 * Valida el body (JSON) contra un schema zod. Si pasa, deja el resultado tipado
 * en c.get('data'). Si no, responde 400 con el detalle por campo.
 */
export const validate = (schema: any) => async (c: Context<Env>, next: Next) => {
  let body: unknown = {}
  try { body = await c.req.json() } catch { body = {} }

  const r = schema.safeParse(body ?? {})
  if (!r.success) {
    return c.json({
      error: 'Datos inválidos.',
      detalles: r.error.issues.map((i: any) => ({ campo: i.path.join('.') || '(raíz)', mensaje: i.message })),
    }, 400)
  }
  c.set('data', r.data)
  await next()
}
