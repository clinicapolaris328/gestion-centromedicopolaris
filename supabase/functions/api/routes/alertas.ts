import { Hono } from '../deps.ts'
import type { Context, Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapAlertaRegla, mapPacienteAlerta } from '../lib/map.ts'
import { buscarCatalogo } from '../lib/catalogo.ts'
import { perfilCaller, puedeVerPaciente } from '../lib/acceso.ts'
import { alertaReglaCreate, alertaReglaUpdate, pacienteAlertaCreate, pacienteAlertaUpdate } from '../schemas.ts'

/* Alertas (C3) — pautadas por los profesionales (decisión 19/10).
 *
 * 1) Reglas sobre variables (alerta_regla): umbral mínimo/máximo de una variable
 *    numérica, de ámbito PERSONAL (profesional) o de ESPECIALIDAD (compartida).
 *    Quién las gestiona:
 *      - administrador / dios → cualquiera;
 *      - profesional → las suyas o las de su propia especialidad;
 *      - asistente (secretaría) → solo lectura (spec §26: no modifica contenido clínico).
 * 2) Alertas de condición del paciente (paciente_alerta): alergia, anticoagulación…
 *    Cualquier usuario autenticado puede marcarlas (igual que hoy se cargan las
 *    evoluciones) y TODOS las ven (spec §27). El rol profesional, solo en pacientes
 *    que puede ver (puedeVerPaciente).
 * Todo queda en `auditoria` (trg_audit) con quién/qué/cuándo. */

const alertas = new Hono<Env>()
alertas.use('*', requireAuth)

const SELECT_REGLA = '*, especialidad(nombre), profesional(nombre)'

/** Rol del usuario + profesional y especialidad propios. */
export async function contexto(c: Context<Env>) {
  const { rol, profesionalId } = await perfilCaller(c)
  let especialidadId: string | null = null
  if (profesionalId) {
    const { data } = await c.get('db').from('profesional').select('especialidad_id').eq('id', profesionalId).maybeSingle()
    especialidadId = (data as any)?.especialidad_id ?? null
  }
  return { rol, profesionalId, especialidadId }
}

/** ¿Puede crear / editar / borrar una regla con este ámbito? */
export function puedeGestionar(ctx: Awaited<ReturnType<typeof contexto>>, regla: { profesional_id: string | null; especialidad_id: string | null }) {
  if (ctx.rol === 'administrador' || ctx.rol === 'dios') return true
  if (ctx.rol !== 'profesional' || !ctx.profesionalId) return false
  if (regla.profesional_id) return regla.profesional_id === ctx.profesionalId
  return !!regla.especialidad_id && regla.especialidad_id === ctx.especialidadId
}

// ---------------------------------------------------------------- reglas ----

// GET /api/alertas/reglas  → todas (la app elige cuál aplica según quién mira)
alertas.get('/reglas', async (c) => {
  const { data, error } = await c.get('db').from('alerta_regla').select(SELECT_REGLA).order('variable')
  throwDb(error)
  return c.json((data ?? []).map(mapAlertaRegla))
})

// POST /api/alertas/reglas
alertas.post('/reglas', validate(alertaReglaCreate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  const ctx = await contexto(c)

  let profesional_id: string | null = null
  let especialidad_id: string | null = null
  if (d.ambito === 'profesional') {
    // El rol profesional solo crea reglas personales a su nombre.
    profesional_id = ctx.rol === 'profesional' ? ctx.profesionalId : (d.profId || ctx.profesionalId)
    if (!profesional_id) throw httpError(400, 'Indicá el profesional de la regla.')
  } else {
    especialidad_id = ctx.rol === 'profesional' ? ctx.especialidadId : await buscarCatalogo(db, 'especialidad', d.especialidad)
    if (!especialidad_id) throw httpError(400, 'Indicá una especialidad existente.')
  }
  if (!puedeGestionar(ctx, { profesional_id, especialidad_id })) throw httpError(403, 'No podés crear reglas en ese ámbito.')

  const actor = c.get('user').id
  const { data, error } = await db.from('alerta_regla').insert({
    variable: d.variable, profesional_id, especialidad_id,
    minimo: d.minimo ?? null, maximo: d.maximo ?? null, mensaje: d.mensaje || null,
    activo: d.activo ?? true, creado_por: actor, actualizado_por: actor,
  }).select(SELECT_REGLA).single()
  if (error?.code === '23505') throw httpError(409, 'Ya existe una regla para esa variable en ese ámbito. Editala.')
  throwDb(error)
  return c.json(mapAlertaRegla(data), 201)
})

async function reglaGestionable(c: Context<Env>, id: string) {
  const { data, error } = await c.get('db').from('alerta_regla').select('id, profesional_id, especialidad_id, minimo, maximo').eq('id', id).maybeSingle()
  throwDb(error)
  if (!data) throw httpError(404, 'Regla no encontrada.')
  if (!puedeGestionar(await contexto(c), data as any)) throw httpError(403, 'No podés modificar esta regla.')
  return data as any
}

// PATCH /api/alertas/reglas/:id  (umbrales, mensaje, activo; el ámbito no cambia → trazable)
alertas.patch('/reglas/:id', validate(alertaReglaUpdate), async (c) => {
  const id = c.req.param('id')!
  const d = c.get('data')
  const actual = await reglaGestionable(c, id)
  const cambios: Record<string, unknown> = {}
  if (d.minimo !== undefined) cambios.minimo = d.minimo
  if (d.maximo !== undefined) cambios.maximo = d.maximo
  if (d.mensaje !== undefined) cambios.mensaje = d.mensaje || null
  if (d.activo !== undefined) cambios.activo = d.activo
  if (!Object.keys(cambios).length) throw httpError(400, 'No hay datos para actualizar.')
  const min = 'minimo' in cambios ? cambios.minimo : actual.minimo
  const max = 'maximo' in cambios ? cambios.maximo : actual.maximo
  if (min == null && max == null) throw httpError(400, 'Indicá un mínimo o un máximo.')
  if (min != null && max != null && Number(min) > Number(max)) throw httpError(400, 'El mínimo no puede ser mayor que el máximo.')
  cambios.actualizado_por = c.get('user').id
  const { data, error } = await c.get('db').from('alerta_regla').update(cambios).eq('id', id).select(SELECT_REGLA).single()
  throwDb(error)
  return c.json(mapAlertaRegla(data))
})

// DELETE /api/alertas/reglas/:id  (queda registrado en la auditoría)
alertas.delete('/reglas/:id', async (c) => {
  const id = c.req.param('id')!
  await reglaGestionable(c, id)
  const { error } = await c.get('db').from('alerta_regla').delete().eq('id', id)
  throwDb(error)
  return c.body(null, 204)
})

// ------------------------------------------------- alertas del paciente ----

async function pacienteVisible(c: Context<Env>, pacienteId: string) {
  if (!(await puedeVerPaciente(c, pacienteId))) throw httpError(404, 'Paciente no encontrado.')
}

// GET /api/alertas/paciente/:pacienteId
alertas.get('/paciente/:pacienteId', async (c) => {
  const pacienteId = c.req.param('pacienteId')!
  await pacienteVisible(c, pacienteId)
  const { data, error } = await c.get('db').from('paciente_alerta').select('*')
    .eq('paciente_id', pacienteId).order('creado_en')
  throwDb(error)
  return c.json((data ?? []).map(mapPacienteAlerta))
})

// POST /api/alertas/paciente/:pacienteId
alertas.post('/paciente/:pacienteId', validate(pacienteAlertaCreate), async (c) => {
  const pacienteId = c.req.param('pacienteId')!
  await pacienteVisible(c, pacienteId)
  const d = c.get('data')
  const actor = c.get('user').id
  const { data, error } = await c.get('db').from('paciente_alerta').insert({
    paciente_id: pacienteId, tipo: d.tipo, detalle: d.detalle || null, creado_por: actor, actualizado_por: actor,
  }).select('*').single()
  throwDb(error)
  return c.json(mapPacienteAlerta(data), 201)
})

async function alertaDePaciente(c: Context<Env>, id: string) {
  const { data, error } = await c.get('db').from('paciente_alerta').select('id, paciente_id').eq('id', id).maybeSingle()
  throwDb(error)
  if (!data) throw httpError(404, 'Alerta no encontrada.')
  await pacienteVisible(c, (data as any).paciente_id)
}

// PATCH /api/alertas/paciente-alerta/:id  (detalle / activo)
alertas.patch('/paciente-alerta/:id', validate(pacienteAlertaUpdate), async (c) => {
  const id = c.req.param('id')!
  await alertaDePaciente(c, id)
  const d = c.get('data')
  const cambios: Record<string, unknown> = {}
  if (d.detalle !== undefined) cambios.detalle = d.detalle || null
  if (d.activo !== undefined) cambios.activo = d.activo
  if (!Object.keys(cambios).length) throw httpError(400, 'No hay datos para actualizar.')
  cambios.actualizado_por = c.get('user').id
  const { data, error } = await c.get('db').from('paciente_alerta').update(cambios).eq('id', id).select('*').single()
  throwDb(error)
  return c.json(mapPacienteAlerta(data))
})

// DELETE /api/alertas/paciente-alerta/:id
alertas.delete('/paciente-alerta/:id', async (c) => {
  const id = c.req.param('id')!
  await alertaDePaciente(c, id)
  const { error } = await c.get('db').from('paciente_alerta').delete().eq('id', id)
  throwDb(error)
  return c.body(null, 204)
})

export default alertas
