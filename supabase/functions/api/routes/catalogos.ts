import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapCatalogo } from '../lib/map.ts'
import { soloLecturaSiProfesional } from '../lib/acceso.ts'
import { catalogoCreate, catalogoUpdate } from '../schemas.ts'

/* Router genérico de catálogo (especialidades / obras sociales): CRUD trazable.
 * `dependencias` = [tabla, columna] que referencian este catálogo; si hay filas
 * que lo usan, no se puede eliminar (se avisa). La auditoría es automática
 * (triggers de trazabilidad sobre especialidad / obra_social). */
function catalogoRouter(tabla: string, dependencias: [string, string][]) {
  const r = new Hono<Env>()
  r.use('*', requireAuth)
  r.use('*', soloLecturaSiProfesional) // el rol profesional no gestiona catálogos

  r.get('/', async (c) => {
    const { data, error } = await c.get('db').from(tabla).select('*').order('nombre')
    throwDb(error)
    return c.json((data ?? []).map(mapCatalogo))
  })

  r.post('/', validate(catalogoCreate), async (c) => {
    const d = c.get('data')
    const { data, error } = await c.get('db')
      .from(tabla).insert({ nombre: d.nombre, personalizada: true }).select('*').single()
    throwDb(error)
    return c.json(mapCatalogo(data), 201)
  })

  // PATCH /:id  (renombrar y/o —solo especialidades— asignar la familia de HC)
  r.patch('/:id', validate(catalogoUpdate), async (c) => {
    const d = c.get('data')
    const cambios: Record<string, unknown> = {}
    if (d.nombre !== undefined) cambios.nombre = d.nombre
    if (d.familia !== undefined) {
      if (tabla !== 'especialidad') throw httpError(400, 'Solo las especialidades tienen familia de HC.')
      cambios.familia = d.familia
    }
    const { data, error } = await c.get('db')
      .from(tabla).update(cambios).eq('id', c.req.param('id')).select('*').single()
    throwDb(error)
    if (!data) throw httpError(404, 'No encontrado.')
    return c.json(mapCatalogo(data))
  })

  // DELETE /:id  (bloquea si está en uso)
  r.delete('/:id', async (c) => {
    const db = c.get('db')
    const id = c.req.param('id')
    for (const [depTabla, col] of dependencias) {
      const { count, error } = await db.from(depTabla).select('id', { count: 'exact', head: true }).eq(col, id)
      throwDb(error)
      if ((count ?? 0) > 0) {
        throw httpError(409, 'No se puede eliminar: está en uso. Reasigná esos registros primero.')
      }
    }
    const { error } = await db.from(tabla).delete().eq('id', id)
    throwDb(error)
    return c.body(null, 204)
  })

  return r
}

const catalogos = new Hono<Env>()
catalogos.route('/especialidades', catalogoRouter('especialidad', [
  ['profesional', 'especialidad_id'],
  ['turno', 'especialidad_id'],
  ['evolucion', 'especialidad_id'],
]))
catalogos.route('/obras-sociales', catalogoRouter('obra_social', [
  ['paciente', 'obra_social_id'],
]))
export default catalogos
