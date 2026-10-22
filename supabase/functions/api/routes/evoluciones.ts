import { Hono } from '../deps.ts'
import type { Env, SupabaseClient } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapEvolucion } from '../lib/map.ts'
import { resolverCatalogo } from '../lib/catalogo.ts'
import { perfilCaller } from '../lib/acceso.ts'
import { puedeVerContenido, redactar, esConfidencial, normalizarConfidencial } from '../lib/confidencial.ts'
import { evolucionCreate, evolucionUpdate } from '../schemas.ts'

const evol = new Hono<Env>()
evol.use('*', requireAuth)

// Incluye la medicación (indicacion) y los estudios adjuntos (estudio.evolucion_id).
const SELECT = '*, especialidad(nombre, familia), indicacion(texto), estudio(id)'

async function especialidadDe(db: SupabaseClient, profId: string) {
  const { data, error } = await db.from('profesional').select('especialidad_id').eq('id', profId).maybeSingle()
  throwDb(error)
  if (!data) throw httpError(400, 'Profesional inexistente.')
  return data.especialidad_id
}

// Familia de HC de la especialidad (dato de la base): decide si admite notas confidenciales.
async function familiaEspecialidad(db: SupabaseClient, id: string | null) {
  if (!id) return null
  const { data, error } = await db.from('especialidad').select('familia').eq('id', id).maybeSingle()
  throwDb(error)
  return data?.familia ?? null
}

// Observaciones clínicas (variables numéricas → base de los gráficos) de una evolución.
async function guardarObservaciones(
  db: SupabaseClient,
  observaciones: any[] | undefined,
  base: { paciente_id: string; evolucion_id: string; profesional_id: string; especialidad_id: string },
) {
  const obs = (observaciones || []).filter((o: any) => o.valor != null || o.valorTexto)
  if (!obs.length) return
  const filas = obs.map((o: any) => ({
    ...base,
    variable: o.variable,
    valor: o.valor ?? null,
    valor_texto: o.valorTexto || null,
    unidad: o.unidad || null,
    fuente: 'consulta',
  }))
  const { error } = await db.from('observacion_clinica').insert(filas)
  throwDb(error)
}

// GET /api/evoluciones?paciente=&profesional=&especialidad=
evol.get('/', async (c) => {
  const db = c.get('db')
  let query = db.from('evolucion').select(SELECT).order('fecha', { ascending: false })
  const paciente = c.req.query('paciente')
  // Módulo Evoluciones: es transversal — todos los profesionales ven las evoluciones
  // de todos los pacientes (sin aislamiento por profesional). La ESCRITURA sigue
  // firmada por profesional (POST/PATCH restringen a lo propio).
  const profesional = c.req.query('profesional')
  const especialidad = c.req.query('especialidad')
  if (paciente) query = query.eq('paciente_id', paciente)
  if (profesional) query = query.eq('profesional_id', profesional)
  if (especialidad) {
    const { data: esp, error } = await db.from('especialidad').select('id').ilike('nombre', especialidad).maybeSingle()
    throwDb(error)
    query = query.eq('especialidad_id', esp?.id ?? '00000000-0000-0000-0000-000000000000')
  }
  const { data, error } = await query
  throwDb(error)
  // Notas confidenciales (Psico/Psiquiatría): sin contenido para quien no es el tratante.
  const viewer = { userId: c.get('user').id, profesionalId: (await perfilCaller(c)).profesionalId }
  return c.json((data ?? []).map((r: any) => mapEvolucion(puedeVerContenido(r, viewer) ? r : redactar(r))))
})

// POST /api/evoluciones  (asiento nuevo + su medicación) — append-only
evol.post('/', validate(evolucionCreate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  // Rol 'profesional': la evolución se firma a su nombre (no puede cargar por otro).
  const { rol, profesionalId } = await perfilCaller(c)
  if (rol === 'profesional') {
    if (!profesionalId) throw httpError(400, 'Tu usuario no está vinculado a un profesional.')
    d.profId = profesionalId
  }
  const especialidad_id = d.especialidad
    ? await resolverCatalogo(db, 'especialidad', d.especialidad)
    : await especialidadDe(db, d.profId)

  const estado = d.estado === 'borrador' ? 'borrador' : 'finalizada'
  const actor = c.get('user').id

  // Si es una rectificación (addenda), la evolución que corrige debe estar finalizada.
  if (d.rectificaA) {
    const { data: orig } = await db.from('evolucion').select('estado').eq('id', d.rectificaA).maybeSingle()
    if (!orig) throw httpError(400, 'La evolución a rectificar no existe.')
    if (orig.estado !== 'finalizada') throw httpError(400, 'Solo se puede rectificar una evolución finalizada.')
  }

  const { data: ev, error } = await db
    .from('evolucion')
    .insert({
      paciente_id: d.pacienteId,
      profesional_id: d.profId,
      especialidad_id,
      estado,
      motivo: d.motivo || null,
      subjetivo: d.subjetivo || null,
      objetivo: d.objetivo || null,
      diagnostico: d.diagnostico || null,
      plan: d.plan || null,
      datos: normalizarConfidencial(d.datos, await familiaEspecialidad(db, especialidad_id)) ?? null,
      rectifica_a: d.rectificaA || null,
      creado_por: actor,
      finalizada_en: estado === 'finalizada' ? new Date().toISOString() : null,
      finalizada_por: estado === 'finalizada' ? actor : null,
    })
    .select('id')
    .single()
  throwDb(error)
  if (!ev) throw httpError(400, 'No se pudo crear la evolución.')

  const meds = (d.medicacion || []).map((t: string) => t.trim()).filter(Boolean)
  if (meds.length) {
    const { error: e2 } = await db.from('indicacion').insert(meds.map((texto: string) => ({ evolucion_id: ev.id, texto })))
    throwDb(e2)
  }

  await guardarObservaciones(db, d.observaciones, {
    paciente_id: d.pacienteId, evolucion_id: ev.id, profesional_id: d.profId, especialidad_id,
  })

  const { data: full, error: e3 } = await db.from('evolucion').select(SELECT).eq('id', ev.id).single()
  throwDb(e3)
  return c.json(mapEvolucion(full), 201)
})

// PATCH /api/evoluciones/:id  (editar/firmar) — SOLO si está en borrador.
// Inmutabilidad (Ley 26.529): una finalizada no se edita → se rectifica (addenda).
evol.patch('/:id', validate(evolucionUpdate), async (c) => {
  const db = c.get('db')
  const d = c.get('data')
  const id = c.req.param('id')

  const { data: actual, error: e0 } = await db.from('evolucion').select('estado, paciente_id, profesional_id, especialidad_id, datos, creado_por').eq('id', id).maybeSingle()
  throwDb(e0)
  if (!actual) throw httpError(404, 'Evolución no encontrada.')

  // Rol 'profesional' solo edita lo suyo.
  const { rol, profesionalId } = await perfilCaller(c)
  if (rol === 'profesional' && actual.profesional_id !== profesionalId) throw httpError(404, 'Evolución no encontrada.')
  // Nota confidencial: solo la edita quien puede leerla (tratante o quien la cargó).
  if (esConfidencial(actual) && !puedeVerContenido(actual, { userId: c.get('user').id, profesionalId })) {
    throw httpError(404, 'Evolución no encontrada.')
  }

  if (actual.estado === 'finalizada') {
    throw httpError(409, 'No se puede editar una evolución finalizada. Agregá una rectificación.')
  }

  const cambios: Record<string, unknown> = {}
  if (d.motivo !== undefined) cambios.motivo = d.motivo || null
  if (d.subjetivo !== undefined) cambios.subjetivo = d.subjetivo || null
  if (d.objetivo !== undefined) cambios.objetivo = d.objetivo || null
  if (d.diagnostico !== undefined) cambios.diagnostico = d.diagnostico || null
  if (d.plan !== undefined) cambios.plan = d.plan || null
  if (d.datos !== undefined) cambios.datos = normalizarConfidencial(d.datos, await familiaEspecialidad(db, actual.especialidad_id)) ?? null
  if (d.estado === 'finalizada') {
    cambios.estado = 'finalizada'
    cambios.finalizada_en = new Date().toISOString()
    cambios.finalizada_por = c.get('user').id
  }
  if (Object.keys(cambios).length) {
    const { error } = await db.from('evolucion').update(cambios).eq('id', id)
    throwDb(error)
  }

  // Medicación: si viene, reemplaza las indicaciones del borrador.
  if (d.medicacion !== undefined) {
    const { error: eDel } = await db.from('indicacion').delete().eq('evolucion_id', id)
    throwDb(eDel)
    const meds = (d.medicacion as string[]).map((t) => t.trim()).filter(Boolean)
    if (meds.length) {
      const { error: eIns } = await db.from('indicacion').insert(meds.map((texto) => ({ evolucion_id: id, texto })))
      throwDb(eIns)
    }
  }

  // Observaciones: si vienen, reemplazan las del borrador (misma regla que la medicación).
  if (d.observaciones !== undefined) {
    const { error: eDel } = await db.from('observacion_clinica').delete().eq('evolucion_id', id)
    throwDb(eDel)
    await guardarObservaciones(db, d.observaciones, {
      paciente_id: actual.paciente_id, evolucion_id: id!,
      profesional_id: actual.profesional_id, especialidad_id: actual.especialidad_id,
    })
  }

  const { data: full, error } = await db.from('evolucion').select(SELECT).eq('id', id).single()
  throwDb(error)
  return c.json(mapEvolucion(full))
})

export default evol
