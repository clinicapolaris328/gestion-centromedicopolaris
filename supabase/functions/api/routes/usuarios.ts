import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { validate } from '../middleware/validate.ts'
import { throwDb, httpError } from '../lib/http.ts'
import { serviceClient } from '../lib/supabase.ts'
import { generarPassword } from '../lib/password.ts'
import { resolverCatalogo } from '../lib/catalogo.ts'
import { vincularProfesional } from '../lib/profesional.ts'
import { perfilCaller } from '../lib/acceso.ts'
import { usuarioCreate, usuarioUpdate } from '../schemas.ts'

const usuarios = new Hono<Env>()
usuarios.use('*', requireAuth)

// Gestión de usuarios: disponible para todos MENOS el rol 'profesional' (aislado).
// administrador, asistente y dios tienen el MISMO poder de gestión (crear/editar/
// eliminar usuarios y cambiar privilegios). Lo único exclusivo de 'dios' es el
// toggle a su vista de médico (se resuelve en el frontend, no acá).
usuarios.use('*', async (c, next) => {
  const { rol } = await perfilCaller(c)
  if (rol === 'profesional') return c.json({ error: 'No disponible para tu perfil.' }, 403)
  await next()
})

const SELECT = 'id, nombre, username, telefono, rol, activo, profesional:profesional_id ( id, nombre, especialidad:especialidad_id ( nombre ) )'

const mapUsuario = (p: any, email: string | null, lastSignIn: string | null = null) => ({
  id: p.id,
  nombre: p.nombre,
  username: p.username,
  email,
  telefono: p.telefono,
  rol: p.rol,
  activo: p.activo,
  lastSignIn,
  profesional: p.profesional
    ? { id: p.profesional.id, nombre: p.profesional.nombre, especialidad: p.profesional.especialidad?.nombre ?? null }
    : null,
})

// GET /api/usuarios/generar-password → contraseña segura sugerida (tu algoritmo)
usuarios.get('/generar-password', (c) => c.json({ password: generarPassword(16) }))

// GET /api/usuarios → perfiles + email/último acceso (de Auth)
usuarios.get('/', async (c) => {
  const svc = serviceClient()
  const { data: perfiles, error } = await svc.from('perfil').select(SELECT).order('nombre')
  throwDb(error)
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const byId = new Map((list?.users ?? []).map((u: any) => [u.id, u]))
  return c.json((perfiles ?? []).map((p: any) => {
    const u: any = byId.get(p.id)
    return mapUsuario(p, u?.email ?? null, u?.last_sign_in_at ?? null)
  }))
})

// POST /api/usuarios → crea la cuenta (Auth) + su perfil
/** Ficha EXISTENTE elegida en Configuración: debe existir y no estar vinculada a
 *  OTRO usuario (una ficha = una persona = un usuario). Devuelve su id. */
export async function fichaElegida(svc: ReturnType<typeof serviceClient>, profId: string, usuarioId: string | null) {
  const { data: ficha, error } = await svc.from('profesional').select('id').eq('id', profId).maybeSingle()
  throwDb(error)
  if (!ficha) throw httpError(400, 'La ficha de profesional elegida no existe.')
  let q = svc.from('perfil').select('username').eq('profesional_id', profId)
  if (usuarioId) q = q.neq('id', usuarioId)
  const { data: otro } = await q.limit(1).maybeSingle()
  if (otro) throw httpError(409, `Esa ficha ya está vinculada al usuario "${(otro as any).username}".`)
  return profId
}

usuarios.post('/', validate(usuarioCreate), async (c) => {
  const d = c.get('data')
  const svc = serviceClient()
  const uname = d.username.trim().toLowerCase()

  // Los roles clínicos (profesional / dios) requieren especialidad o una ficha existente.
  if ((d.rol === 'profesional' || d.rol === 'dios') && !d.profId && !(d.especialidad ?? '').trim()) {
    throw httpError(400, 'La especialidad es obligatoria para los privilegios Profesional y Dios.')
  }

  const { data: existe } = await svc.from('perfil').select('id').eq('username', uname).maybeSingle()
  if (existe) throw httpError(400, 'Ese nombre de usuario ya está en uso.')

  const { data: created, error } = await svc.auth.admin.createUser({
    email: d.email, password: d.password, email_confirm: true,
  })
  if (error || !created?.user) throw httpError(400, error?.message ?? 'No se pudo crear el usuario.')
  const id = created.user.id
  const actor = c.get('user').id

  // El trigger crea el perfil (rol asistente). Se completa con los datos reales.
  const { error: e2 } = await svc.from('perfil').upsert({
    id, nombre: d.nombre, username: uname, telefono: d.telefono || null,
    rol: d.rol,
    // Ficha EXISTENTE elegida → se vincula esa (sin réplicas). Si no, como antes:
    // por nombre + especialidad ("Otros" puede sumar una especialidad al catálogo).
    profesional_id: d.profId
      ? await fichaElegida(svc, d.profId, null)
      : await vincularProfesional(svc, {
        nombre: d.nombre, especialidadId: await resolverCatalogo(svc, 'especialidad', d.especialidad), actor,
      }),
    creado_por: actor, actualizado_por: actor,
  })
  throwDb(e2)

  const { data: p } = await svc.from('perfil').select(SELECT).eq('id', id).single()
  return c.json(mapUsuario(p, created.user.email ?? null), 201)
})

// PATCH /api/usuarios/:id → edita perfil y/o credenciales
usuarios.patch('/:id', validate(usuarioUpdate), async (c) => {
  const id = c.req.param('id')!
  const d = c.get('data')
  const svc = serviceClient()

  const authUpd: Record<string, string> = {}
  if (d.email !== undefined) authUpd.email = d.email
  if (d.password !== undefined) authUpd.password = d.password
  if (Object.keys(authUpd).length) {
    const { error } = await svc.auth.admin.updateUserById(id, authUpd)
    if (error) throw httpError(400, error.message)
  }

  const cambios: Record<string, unknown> = {}
  if (d.nombre !== undefined) cambios.nombre = d.nombre
  if (d.telefono !== undefined) cambios.telefono = d.telefono || null
  if (d.rol !== undefined) cambios.rol = d.rol
  if (d.activo !== undefined) cambios.activo = d.activo
  if (d.profId) {
    // Ficha EXISTENTE elegida: se vincula tal cual (no crea ni modifica fichas).
    cambios.profesional_id = await fichaElegida(svc, d.profId, id)
  } else if (d.especialidad !== undefined || d.rol !== undefined) {
    const { data: perfilAct } = await svc.from('perfil').select('rol, nombre, profesional_id').eq('id', id).maybeSingle()
    const rolEfectivo = (d.rol ?? perfilAct?.rol) as string | undefined
    const clinico = rolEfectivo === 'profesional' || rolEfectivo === 'dios'
    if (d.especialidad !== undefined) {
      const esp = d.especialidad.trim()
      if (!esp) {
        if (clinico) throw httpError(400, 'La especialidad es obligatoria para los privilegios Profesional y Dios.')
        cambios.profesional_id = null
      } else {
        cambios.profesional_id = await vincularProfesional(svc, {
          actualId: perfilAct?.profesional_id ?? null,
          nombre: d.nombre ?? perfilAct?.nombre ?? '',
          especialidadId: await resolverCatalogo(svc, 'especialidad', esp),
          actor: c.get('user').id,
        })
      }
    } else if (clinico && !perfilAct?.profesional_id) {
      throw httpError(400, 'La especialidad es obligatoria para los privilegios Profesional y Dios.')
    }
  }
  if (d.username !== undefined) {
    const uname = d.username.trim().toLowerCase()
    const { data: existe } = await svc.from('perfil').select('id').eq('username', uname).neq('id', id).maybeSingle()
    if (existe) throw httpError(400, 'Ese nombre de usuario ya está en uso.')
    cambios.username = uname
  }
  if (Object.keys(cambios).length) {
    cambios.actualizado_por = c.get('user').id
    const { error } = await svc.from('perfil').update(cambios).eq('id', id)
    throwDb(error)
  }

  const { data: p, error } = await svc.from('perfil').select(SELECT).eq('id', id).maybeSingle()
  throwDb(error)
  if (!p) throw httpError(404, 'Usuario no encontrado.')
  const { data: u } = await svc.auth.admin.getUserById(id)
  return c.json(mapUsuario(p, u?.user?.email ?? null, u?.user?.last_sign_in_at ?? null))
})

// DELETE /api/usuarios/:id → elimina la cuenta (cascade borra el perfil)
usuarios.delete('/:id', async (c) => {
  const id = c.req.param('id')!
  if (c.get('user').id === id) throw httpError(400, 'No podés eliminar tu propia cuenta desde acá.')
  const svc = serviceClient()
  const { error } = await svc.auth.admin.deleteUser(id)
  if (error) throw httpError(400, error.message)
  return c.json({ ok: true, id })
})

export default usuarios
