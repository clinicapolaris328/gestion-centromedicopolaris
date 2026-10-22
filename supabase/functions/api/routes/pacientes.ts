import { Hono } from '../deps.ts'
import type { Env, SupabaseClient } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapPaciente } from '../lib/map.ts'
import { resolverCatalogo } from '../lib/catalogo.ts'
import { scopeProfesional, perfilCaller, puedeVerPaciente } from '../lib/acceso.ts'
import { pacienteCreate, pacienteUpdate } from '../schemas.ts'

const pac = new Hono<Env>()
pac.use('*', requireAuth)

const SELECT = '*, obra_social(nombre), profesional(nombre)'

// Traduce el cuerpo camelCase a columnas, resolviendo la obra social por nombre.
async function aColumnas(db: SupabaseClient, d: any) {
  const c: Record<string, unknown> = {}
  if (d.apellido !== undefined) c.apellido = d.apellido
  if (d.nombre !== undefined) c.nombre = d.nombre
  // DNI canónico: solo dígitos (así "20.352.652", "DNI 20352652" y "20352652"
  // son el mismo valor y el índice único los detecta).
  if (d.dni !== undefined) c.dni = String(d.dni).replace(/\D/g, '')
  if (d.fechaNac !== undefined) c.fecha_nac = d.fechaNac || null
  if (d.sexo !== undefined) c.sexo = d.sexo
  if (d.telefono !== undefined) c.telefono = d.telefono || null
  if (d.email !== undefined) c.email = d.email || null
  if (d.afiliado !== undefined) c.afiliado = d.afiliado || null
  if (d.derivacion !== undefined) c.derivacion = d.derivacion || null
  if (d.obraSocial !== undefined) {
    c.obra_social_id = d.obraSocial ? await resolverCatalogo(db, 'obra_social', d.obraSocial) : null
  }
  // Profesional asignado (propiedad del paciente). '' = genérico (sin dueño).
  // Para el rol 'profesional' el backend lo fuerza a su propia ficha en el POST.
  if (d.profesionalAsignado !== undefined) c.profesional_id = d.profesionalAsignado || null
  return c
}

// GET /api/pacientes?q=&profesional=
// Con ?profesional= devuelve solo los pacientes que ese profesional atendió
// (tiene turnos o evoluciones con ellos) — usado por la vista de rol profesional.
pac.get('/', async (c) => {
  const db = c.get('db')
  // Rol 'profesional' → solo los pacientes que atendió (enforced acá).
  const scope = await scopeProfesional(c)
  const profesional = scope ?? c.req.query('profesional')

  let ids: string[] | null = null
  if (profesional) {
    // Un profesional ve: los que atendió (turno/evolución) + los que le pertenecen
    // (paciente.profesional_id), aunque todavía no tengan turno ni evolución.
    const [t, e, p] = await Promise.all([
      db.from('turno').select('paciente_id').eq('profesional_id', profesional),
      db.from('evolucion').select('paciente_id').eq('profesional_id', profesional),
      db.from('paciente').select('id').eq('profesional_id', profesional),
    ])
    throwDb(t.error)
    throwDb(e.error)
    throwDb(p.error)
    ids = [...new Set([
      ...(t.data ?? []).map((r: any) => r.paciente_id),
      ...(e.data ?? []).map((r: any) => r.paciente_id),
      ...(p.data ?? []).map((r: any) => r.id),
    ])]
  }

  let query = db.from('paciente').select(SELECT).is('eliminado_en', null).order('apellido')
  if (ids) query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  // Se neutralizan los metacaracteres del lenguaje de filtros de PostgREST
  // (,()*:"\% ) para evitar filter-injection en el .or() de abajo.
  const q = (c.req.query('q') || '').trim().replace(/[%,()*:"\\]/g, '')
  if (q) query = query.or(`apellido.ilike.%${q}%,nombre.ilike.%${q}%,dni.ilike.%${q}%`)

  const { data, error } = await query
  throwDb(error)
  const pacientes = (data ?? []).map(mapPaciente)

  // Vínculo trazable paciente↔profesional, UNIFORME para todos los módulos:
  // dueño (paciente.profesional_id) ∪ agenda (turno) ∪ evolución. Se expone como
  // `profIds` por paciente para que los filtros/vistas no dependan solo de la
  // propiedad (antes el filtro del front solo "veía" al dueño asignado). Son 2
  // consultas agregadas (no por fila); el front resuelve los nombres con su
  // listado de profesionales.
  if (pacientes.length) {
    const pids = pacientes.map((p: any) => p.id)
    const [tt, ee] = await Promise.all([
      db.from('turno').select('paciente_id, profesional_id').in('paciente_id', pids).not('profesional_id', 'is', null),
      db.from('evolucion').select('paciente_id, profesional_id').in('paciente_id', pids).not('profesional_id', 'is', null),
    ])
    throwDb(tt.error)
    throwDb(ee.error)
    const vinc = new Map<string, Set<string>>()
    const add = (pac: string, prof: string) => {
      let s = vinc.get(pac)
      if (!s) vinc.set(pac, (s = new Set<string>()))
      s.add(prof)
    }
    for (const p of pacientes as any[]) if (p.profId) add(p.id, p.profId)
    for (const r of (tt.data ?? []) as any[]) add(r.paciente_id, r.profesional_id)
    for (const r of (ee.data ?? []) as any[]) add(r.paciente_id, r.profesional_id)
    for (const p of pacientes as any[]) p.profIds = [...(vinc.get(p.id) ?? [])]
  }
  return c.json(pacientes)
})

// GET /api/pacientes/:id
pac.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')!
  const { data, error } = await db.from('paciente').select(SELECT).eq('id', id).maybeSingle()
  throwDb(error)
  if (!data || data.eliminado_en) throw httpError(404, 'Paciente no encontrado.')

  // Rol 'profesional': solo puede abrir un paciente que le pertenece o que atendió
  // (turno o evolución).
  const scope = await scopeProfesional(c)
  if (scope && data.profesional_id !== scope) {
    const [t, e] = await Promise.all([
      db.from('turno').select('id', { count: 'exact', head: true }).eq('profesional_id', scope).eq('paciente_id', id),
      db.from('evolucion').select('id', { count: 'exact', head: true }).eq('profesional_id', scope).eq('paciente_id', id),
    ])
    throwDb(t.error)
    throwDb(e.error)
    if ((t.count ?? 0) === 0 && (e.count ?? 0) === 0) throw httpError(404, 'Paciente no encontrado.')
  }
  return c.json(mapPaciente(data))
})

// Verifica que el DNI (ya normalizado) no esté repetido. `exceptoId` excluye al
// propio paciente en la edición. El índice único es la garantía final; esto solo
// da un mensaje claro antes de chocar contra el índice.
async function chequearDniUnico(db: SupabaseClient, dni: string, exceptoId?: string) {
  if (dni === undefined) return
  if (!dni) throw httpError(400, 'El DNI debe contener números.')
  let q = db.from('paciente').select('id').eq('dni', dni)
  if (exceptoId) q = q.neq('id', exceptoId)
  const { data } = await q.maybeSingle()
  if (data) throw httpError(409, 'Ya existe un paciente con ese DNI.')
}

// POST /api/pacientes
pac.post('/', validate(pacienteCreate), async (c) => {
  const db = c.get('db')
  const fila = await aColumnas(db, c.get('data'))
  await chequearDniUnico(db, fila.dni as string)

  // Propiedad del paciente (trazabilidad):
  //  · rol 'profesional' → siempre a su propia ficha (no puede cargar por otro).
  //  · resto (asistente/admin, o 'dios' en vista admin) → lo que se haya asignado
  //    en el alta (o genérico si no se eligió profesional).
  const { rol, profesionalId } = await perfilCaller(c)
  if (rol === 'profesional') fila.profesional_id = profesionalId ?? null

  const { data, error } = await db.from('paciente').insert(fila).select(SELECT).single()
  throwDb(error)
  return c.json(mapPaciente(data), 201)
})

// PATCH /api/pacientes/:id
pac.patch('/:id', validate(pacienteUpdate), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')!
  const fila = await aColumnas(db, c.get('data'))

  // Rol 'profesional': solo edita pacientes que ve (suyos o atendidos) y no puede
  // reasignar la propiedad a otro profesional.
  const { rol } = await perfilCaller(c)
  if (rol === 'profesional') {
    if (!(await puedeVerPaciente(c, id))) throw httpError(404, 'Paciente no encontrado.')
    delete fila.profesional_id
  }

  if (Object.keys(fila).length === 0) throw httpError(400, 'No hay datos para actualizar.')
  if (fila.dni !== undefined) await chequearDniUnico(db, fila.dni as string, id)
  const { data, error } = await db.from('paciente').update(fila).eq('id', id).select(SELECT).single()
  throwDb(error)
  if (!data) throw httpError(404, 'Paciente no encontrado.')
  return c.json(mapPaciente(data))
})

// DELETE /api/pacientes/:id  — baja trazable (soft-delete).
// Todos pueden eliminar (el rol 'profesional' solo los suyos). El paciente NO se
// borra: se marca como eliminado y se retiene un tiempo antes de la purga
// definitiva. La historia clínica se conserva (Ley 26.529) y la baja queda
// auditada (quién/cuándo, vía trigger + eliminado_por).
const RETENCION_DIAS = 90
pac.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')!

  // Alcance: un 'profesional' solo puede dar de baja pacientes que ve (suyos o
  // atendidos); el resto de roles, cualquiera.
  if (!(await puedeVerPaciente(c, id))) throw httpError(404, 'Paciente no encontrado.')

  const { data: actual, error: e0 } = await db.from('paciente').select('id, eliminado_en').eq('id', id).maybeSingle()
  throwDb(e0)
  if (!actual || actual.eliminado_en) throw httpError(404, 'Paciente no encontrado.')

  const ahora = new Date()
  const purga = new Date(ahora.getTime() + RETENCION_DIAS * 24 * 3600 * 1000)
  const { error } = await db.from('paciente').update({
    eliminado_en: ahora.toISOString(),
    eliminado_por: c.get('user').id,
    purgar_despues_de: purga.toISOString(),
  }).eq('id', id).is('eliminado_en', null)
  throwDb(error)
  return c.json({ ok: true, id })
})

export default pac
