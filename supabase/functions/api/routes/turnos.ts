import { Hono } from '../deps.ts'
import type { Env, SupabaseClient } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapTurno } from '../lib/map.ts'
import { scopeProfesional, perfilCaller } from '../lib/acceso.ts'
import { turnoCreate, turnoUpdate } from '../schemas.ts'

const turno = new Hono<Env>()
turno.use('*', requireAuth)

const SELECT = '*, especialidad(nombre, familia)'

// Fecha "de hoy" en horario de Argentina (coincide con el filtro del frontend).
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

// La especialidad del turno se deriva del profesional (misma regla que el frontend).
async function especialidadDe(db: SupabaseClient, profId: string) {
  const { data, error } = await db.from('profesional').select('especialidad_id').eq('id', profId).maybeSingle()
  throwDb(error)
  if (!data) throw httpError(400, 'Profesional inexistente.')
  return data.especialidad_id
}

// GET /api/turnos?fecha=&desde=&hasta=&profesional=&paciente=&especialidad=
// - fecha: un día exacto (vista Día).
// - desde/hasta: rango inclusivo de fechas (vistas Semana/Mes/Año). Si se envían
//   ambos criterios, 'fecha' tiene prioridad.
turno.get('/', async (c) => {
  const db = c.get('db')
  let query = db.from('turno').select(SELECT).order('fecha').order('hora')
  const fecha = c.req.query('fecha')
  const desde = c.req.query('desde')
  const hasta = c.req.query('hasta')
  // Rol 'profesional' → queda limitado a su propia agenda (enforced acá, no en el front).
  const scope = await scopeProfesional(c)
  const profesional = scope ?? c.req.query('profesional')
  const paciente = c.req.query('paciente')
  const especialidad = c.req.query('especialidad')
  if (fecha) {
    query = query.eq('fecha', fecha)
  } else {
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
  }
  if (profesional) query = query.eq('profesional_id', profesional)
  if (paciente) query = query.eq('paciente_id', paciente)
  if (especialidad) {
    const { data: esp, error } = await db.from('especialidad').select('id').ilike('nombre', especialidad).maybeSingle()
    throwDb(error)
    query = query.eq('especialidad_id', esp?.id ?? '00000000-0000-0000-0000-000000000000')
  }
  const { data, error } = await query
  throwDb(error)
  return c.json((data ?? []).map(mapTurno))
})

// POST /api/turnos
turno.post('/', validate(turnoCreate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  // Rol 'profesional': el turno se crea a su nombre (no puede agendar por otro).
  const { rol, profesionalId } = await perfilCaller(c)
  if (rol === 'profesional') {
    if (!profesionalId) throw httpError(400, 'Tu usuario no está vinculado a un profesional.')
    d.profId = profesionalId
  }
  const fila = {
    fecha: d.fecha || hoyISO(),
    hora: d.hora,
    paciente_id: d.pacienteId,
    profesional_id: d.profId,
    especialidad_id: await especialidadDe(db, d.profId),
    estado: d.estado || 'agendado',
    motivo: d.motivo || null,
  }
  const { data, error } = await db.from('turno').insert(fila).select(SELECT).single()
  throwDb(error)
  // Paciente SIN profesional asignado: queda asignado al profesional de este turno
  // (el primero que lo atiende). Nunca pisa un dueño existente. Auditado (trg_audit).
  const asig = await db.from('paciente').update({ profesional_id: d.profId })
    .eq('id', d.pacienteId).is('profesional_id', null)
  throwDb(asig.error)
  return c.json(mapTurno(data), 201)
})

// PATCH /api/turnos/:id  (editar o cambiar estado)
turno.patch('/:id', validate(turnoUpdate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  const cambios: Record<string, unknown> = {}
  if (d.fecha !== undefined) cambios.fecha = d.fecha
  if (d.hora !== undefined) cambios.hora = d.hora
  if (d.pacienteId !== undefined) cambios.paciente_id = d.pacienteId
  if (d.motivo !== undefined) cambios.motivo = d.motivo || null
  if (d.estado !== undefined) cambios.estado = d.estado
  if (d.profId !== undefined) {
    cambios.profesional_id = d.profId
    cambios.especialidad_id = await especialidadDe(db, d.profId)
  }
  if (Object.keys(cambios).length === 0) throw httpError(400, 'No hay datos para actualizar.')

  const { data, error } = await db.from('turno').update(cambios).eq('id', c.req.param('id')).select(SELECT).single()
  throwDb(error)
  if (!data) throw httpError(404, 'Turno no encontrado.')
  return c.json(mapTurno(data))
})

// DELETE /api/turnos/:id  (borrado real; queda registrado en la auditoría por trigger)
turno.delete('/:id', async (c) => {
  const db = c.get('db')
  const { data, error } = await db.from('turno').delete().eq('id', c.req.param('id')).select('id').maybeSingle()
  throwDb(error)
  if (!data) throw httpError(404, 'Turno no encontrado.')
  return c.json({ ok: true, id: data.id })
})

export default turno
