import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { mapEstudio } from '../lib/map.ts'
import { serviceClient } from '../lib/supabase.ts'
import { scopeProfesional, perfilCaller, puedeVerPaciente } from '../lib/acceso.ts'
import { estudioMeta, estudioUpdate } from '../schemas.ts'

/* Estudios (C4): archivos del paciente (ECG, eco, laboratorio…).
 * - Metadatos en la tabla `estudio` (con la sesión del usuario → RLS + auditoría).
 * - Archivo en Storage, bucket PRIVADO `estudios`. El navegador nunca habla con
 *   Storage: sube y descarga a través de esta API (mismo patrón BFF), y el
 *   acceso al bucket se hace con service_role, siempre detrás de requireAuth. */

const estudios = new Hono<Env>()
estudios.use('*', requireAuth)

const BUCKET = 'estudios'
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB (igual que el límite del bucket)

// Formatos admitidos → content-type con el que se sirven. El tipo lo define la
// extensión validada acá, nunca el que declara el navegador.
const FORMATOS: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  dcm: 'application/dicom',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
const VISIBLES = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']) // se pueden abrir en el navegador

const SELECT = '*, paciente(apellido, nombre), profesional(nombre)'
const extension = (nombre: string) => (nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '')

// La evolución a la que se adjunta debe ser del mismo paciente.
async function validarEvolucion(c: any, evolucionId: string, pacienteId: string) {
  const { data, error } = await c.get('db').from('evolucion').select('paciente_id').eq('id', evolucionId).maybeSingle()
  throwDb(error)
  if (!data || data.paciente_id !== pacienteId) throw httpError(400, 'La evolución no corresponde a este paciente.')
}

// Trae el estudio y verifica que el usuario pueda operar sobre su paciente.
async function estudioAccesible(c: any, id: string) {
  const { data, error } = await c.get('db').from('estudio').select(SELECT).eq('id', id).maybeSingle()
  throwDb(error)
  if (!data || !(await puedeVerPaciente(c, data.paciente_id))) throw httpError(404, 'Estudio no encontrado.')
  return data
}

// GET /api/estudios?paciente=&evolucion=
estudios.get('/', async (c) => {
  const db = c.get('db')
  const paciente = c.req.query('paciente')
  const evolucion = c.req.query('evolucion')
  let query = db.from('estudio').select(SELECT).order('fecha', { ascending: false }).order('creado_en', { ascending: false })

  // Rol 'profesional': con ?paciente= ve los estudios de un paciente que atendió;
  // sin filtro, solo los que cargó él.
  const scope = await scopeProfesional(c)
  if (paciente) {
    if (!(await puedeVerPaciente(c, paciente))) return c.json([])
    query = query.eq('paciente_id', paciente)
  } else if (scope) {
    query = query.eq('profesional_id', scope)
  }
  if (evolucion) query = query.eq('evolucion_id', evolucion)

  const { data, error } = await query
  throwDb(error)
  return c.json((data ?? []).map(mapEstudio))
})

// POST /api/estudios  (multipart: archivo + pacienteId, tipo, fecha?, evolucionId?, profId?)
estudios.post('/', async (c) => {
  const body = await c.req.parseBody().catch(() => ({} as Record<string, unknown>))
  const archivo = body.archivo
  if (!(archivo instanceof File)) throw httpError(400, 'Falta el archivo.')

  const r = estudioMeta.safeParse({
    pacienteId: body.pacienteId, tipo: body.tipo, fecha: body.fecha ?? '',
    evolucionId: body.evolucionId ?? '', profId: body.profId ?? '',
  })
  if (!r.success) throw httpError(400, r.error.issues[0]?.message ?? 'Datos inválidos.')
  const d = r.data

  const ext = extension(archivo.name)
  if (!FORMATOS[ext]) throw httpError(400, `Formato no admitido. Permitidos: ${Object.keys(FORMATOS).join(', ')}.`)
  if (archivo.size === 0) throw httpError(400, 'El archivo está vacío.')
  if (archivo.size > MAX_BYTES) throw httpError(400, 'El archivo supera el máximo de 20 MB.')

  if (!(await puedeVerPaciente(c, d.pacienteId))) throw httpError(404, 'Paciente no encontrado.')
  if (d.evolucionId) await validarEvolucion(c, d.evolucionId, d.pacienteId)

  // Rol 'profesional': el estudio queda a su nombre.
  const { rol, profesionalId } = await perfilCaller(c)
  const profesional_id = rol === 'profesional' ? profesionalId : (d.profId || profesionalId || null)

  // 1) Archivo → Storage (ruta no adivinable, agrupada por paciente).
  const storage = serviceClient().storage.from(BUCKET)
  const path = `${d.pacienteId}/${crypto.randomUUID()}.${ext}`
  const { error: eUp } = await storage.upload(path, archivo, { contentType: FORMATOS[ext], upsert: false })
  if (eUp) throw httpError(400, `No se pudo subir el archivo: ${eUp.message}`)

  // 2) Metadatos → tabla (si falla, no queda un archivo huérfano).
  const { data, error } = await c.get('db').from('estudio').insert({
    paciente_id: d.pacienteId,
    evolucion_id: d.evolucionId || null,
    profesional_id,
    tipo: d.tipo,
    nombre_archivo: archivo.name.replace(/[\\/]/g, '_').slice(0, 200),
    formato: ext,
    tamano_bytes: archivo.size,
    storage_path: path,
    ...(d.fecha ? { fecha: d.fecha } : {}),
  }).select(SELECT).single()
  if (error || !data) {
    await storage.remove([path]).catch(() => {})
    throw httpError(400, error?.message ?? 'No se pudo registrar el estudio.')
  }
  return c.json(mapEstudio(data), 201)
})

// GET /api/estudios/:id/archivo[?ver=1]  → descarga (o abre, si es PDF/imagen)
estudios.get('/:id/archivo', async (c) => {
  const est = await estudioAccesible(c, c.req.param('id')!)
  if (!est.storage_path) throw httpError(404, 'El estudio no tiene archivo.')
  const { data, error } = await serviceClient().storage.from(BUCKET).download(est.storage_path)
  if (error || !data) throw httpError(404, 'No se encontró el archivo.')

  const ext = (est.formato ?? '').toLowerCase()
  const modo = c.req.query('ver') && VISIBLES.has(ext) ? 'inline' : 'attachment'
  const nombre = encodeURIComponent(est.nombre_archivo)
  // Se omite Content-Length a propósito: al pasar por Cloudflare (que negocia
  // encoding/chunking) un largo fijo sobre un stream provocaba respuestas cortadas
  // en producción (pantalla en blanco). Sin él, va chunked y el proxy lo maneja.
  return c.body(data.stream(), 200, {
    'Content-Type': FORMATOS[ext] ?? 'application/octet-stream',
    'Content-Disposition': `${modo}; filename*=UTF-8''${nombre}`,
    'Cache-Control': 'private, no-store',
  })
})

// PATCH /api/estudios/:id  (categoría, fecha o evolución a la que se adjunta)
estudios.patch('/:id', validate(estudioUpdate), async (c) => {
  const id = c.req.param('id')!
  const d = c.get('data')
  const est = await estudioAccesible(c, id)
  const cambios: Record<string, unknown> = {}
  if (d.tipo !== undefined) cambios.tipo = d.tipo
  if (d.fecha !== undefined) cambios.fecha = d.fecha
  if (d.evolucionId !== undefined) {
    if (d.evolucionId) await validarEvolucion(c, d.evolucionId, est.paciente_id)
    cambios.evolucion_id = d.evolucionId || null
  }
  if (Object.keys(cambios).length === 0) throw httpError(400, 'No hay datos para actualizar.')
  const { data, error } = await c.get('db').from('estudio').update(cambios).eq('id', id).select(SELECT).single()
  throwDb(error)
  return c.json(mapEstudio(data))
})

// DELETE /api/estudios/:id  (queda registrado en la auditoría por trigger)
// Inmutabilidad: un estudio adjunto a una evolución firmada forma parte del
// registro clínico cerrado y no se elimina.
estudios.delete('/:id', async (c) => {
  const id = c.req.param('id')!
  const db = c.get('db')
  const est = await estudioAccesible(c, id)

  const { rol, profesionalId } = await perfilCaller(c)
  if (rol === 'profesional' && est.profesional_id !== profesionalId) {
    throw httpError(403, 'Solo podés eliminar los estudios que cargaste vos.')
  }
  if (est.evolucion_id) {
    const { data: ev } = await db.from('evolucion').select('estado').eq('id', est.evolucion_id).maybeSingle()
    if (ev?.estado === 'finalizada') {
      throw httpError(409, 'El estudio está adjunto a una evolución firmada y no se puede eliminar.')
    }
  }

  const { error } = await db.from('estudio').delete().eq('id', id)
  throwDb(error)
  if (est.storage_path) await serviceClient().storage.from(BUCKET).remove([est.storage_path]).catch(() => {})
  return c.json({ ok: true, id })
})

export default estudios
