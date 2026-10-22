import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { throwDb } from '../lib/http.ts'
import { mapObservacion } from '../lib/map.ts'
import { perfilCaller } from '../lib/acceso.ts'
import { puedeVerContenido } from '../lib/confidencial.ts'

const obs = new Hono<Env>()
obs.use('*', requireAuth)

// GET /api/observaciones?paciente=&variable=&desde=&hasta=
// Serie histórica de variables clínicas (base de los gráficos longitudinales, C2).
// Transversal, igual que las evoluciones: la spec pide el resumen multi-especialidad
// (§23) y compartir la información entre especialidades por defecto (§27).
// Excepción: si la observación pertenece a una nota confidencial (Psico/Psiquiatría)
// que el usuario no puede leer, se excluye (defensa en profundidad).
obs.get('/', async (c) => {
  const db = c.get('db')
  let query = db.from('observacion_clinica').select('*, evolucion(datos, profesional_id, creado_por)').order('fecha')
  const paciente = c.req.query('paciente')
  const variable = c.req.query('variable')
  const desde = c.req.query('desde')
  const hasta = c.req.query('hasta')
  if (paciente) query = query.eq('paciente_id', paciente)
  if (variable) query = query.eq('variable', variable)
  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)
  const { data, error } = await query
  throwDb(error)
  const viewer = { userId: c.get('user').id, profesionalId: (await perfilCaller(c)).profesionalId }
  return c.json((data ?? [])
    .filter((r: any) => !r.evolucion || puedeVerContenido(r.evolucion, viewer))
    .map(mapObservacion))
})

export default obs
