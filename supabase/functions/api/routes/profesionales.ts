import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapProfesional } from '../lib/map.ts'
import { resolverCatalogo } from '../lib/catalogo.ts'
import { soloLecturaSiProfesional } from '../lib/acceso.ts'
import { fichaMismaPersona } from '../lib/profesional.ts'
import { profesionalCreate, profesionalUpdate } from '../schemas.ts'

const prof = new Hono<Env>()
prof.use('*', requireAuth)
prof.use('*', soloLecturaSiProfesional) // el rol profesional no gestiona profesionales

const SELECT = '*, especialidad(nombre, familia)'

// GET /api/profesionales
prof.get('/', async (c) => {
  const { data, error } = await c.get('db').from('profesional').select(SELECT).order('nombre')
  throwDb(error)
  return c.json((data ?? []).map(mapProfesional))
})

// POST /api/profesionales  (la especialidad "Otros" se registra sola)
prof.post('/', validate(profesionalCreate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  const especialidad_id = await resolverCatalogo(db, 'especialidad', d.especialidad)
  // Una persona = UNA ficha: se rechaza si ya existe la misma persona aunque esté
  // escrita distinto o cargada en otra especialidad (lib/profesional.ts).
  const misma = await fichaMismaPersona(db, d.nombre)
  if (misma) throw httpError(409, `Ya existe la ficha «${misma.nombre}» (${misma.especialidad}) de esta persona. Cada profesional tiene una sola ficha.`)
  const { data, error } = await db
    .from('profesional')
    .insert({ nombre: d.nombre, especialidad_id, matricula: d.matricula || null, horario: d.horario ?? [] })
    .select(SELECT)
    .single()
  throwDb(error)
  return c.json(mapProfesional(data), 201)
})

// PATCH /api/profesionales/:id  (editar / suspender-reactivar = baja lógica)
prof.patch('/:id', validate(profesionalUpdate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  const cambios: Record<string, unknown> = {}
  if (d.nombre !== undefined) {
    // Renombrar no puede convertir la ficha en réplica de otra persona.
    const misma = await fichaMismaPersona(db, d.nombre, c.req.param('id'))
    if (misma) throw httpError(409, `Ya existe la ficha «${misma.nombre}» (${misma.especialidad}) de esta persona.`)
    cambios.nombre = d.nombre
  }
  if (d.matricula !== undefined) cambios.matricula = d.matricula || null
  if (d.estado !== undefined) cambios.estado = d.estado
  if (d.horario !== undefined) cambios.horario = d.horario
  if (d.especialidad !== undefined) cambios.especialidad_id = await resolverCatalogo(db, 'especialidad', d.especialidad)
  if (Object.keys(cambios).length === 0) throw httpError(400, 'No hay datos para actualizar.')

  const { data, error } = await db.from('profesional').update(cambios).eq('id', c.req.param('id')).select(SELECT).single()
  throwDb(error)
  if (!data) throw httpError(404, 'Profesional no encontrado.')
  return c.json(mapProfesional(data))
})

// DELETE /api/profesionales/:id  (borrado físico; solo si no tiene historial)
// Si el profesional tiene turnos o evoluciones (historia clínica), no se elimina
// para preservar la integridad y la trazabilidad → se sugiere suspenderlo.
prof.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')

  const [turnos, evol] = await Promise.all([
    db.from('turno').select('id', { count: 'exact', head: true }).eq('profesional_id', id),
    db.from('evolucion').select('id', { count: 'exact', head: true }).eq('profesional_id', id),
  ])
  throwDb(turnos.error)
  throwDb(evol.error)
  if ((turnos.count ?? 0) > 0 || (evol.count ?? 0) > 0) {
    throw httpError(409, 'No se puede eliminar: el profesional tiene turnos o evoluciones asociados. Suspendelo en su lugar.')
  }

  const { error } = await db.from('profesional').delete().eq('id', id)
  throwDb(error)
  return c.body(null, 204)
})

export default prof
