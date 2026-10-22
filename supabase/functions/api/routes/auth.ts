import { Hono } from '../deps.ts'
import type { Env } from '../deps.ts'
import { anonClient, serviceClient } from '../lib/supabase.ts'
import { resolveSession, setAuthCookies, clearAuthCookies } from '../lib/auth.ts'
import { generarPassword } from '../lib/password.ts'
import { buscarCatalogo } from '../lib/catalogo.ts'
import { vincularProfesional } from '../lib/profesional.ts'

const auth = new Hono<Env>()

const publicUser = (u: any) => ({ id: u.id, email: u.email, lastSignIn: u.last_sign_in_at ?? null })

// Resuelve el email a partir del nombre de usuario (login por usuario).
// Usa service_role del lado del servidor; nunca se expone al frontend.
async function emailDeUsuario(usuario: string): Promise<string | null> {
  const svc = serviceClient()
  const { data: perfil } = await svc.from('perfil').select('id').eq('username', usuario.trim().toLowerCase()).maybeSingle()
  if (!perfil) return null
  const { data, error } = await svc.auth.admin.getUserById(perfil.id)
  if (error || !data?.user?.email) return null
  return data.user.email
}

// POST /api/auth/login  { usuario, password }  (usuario = nombre de usuario o email)
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const usuario: string = body.usuario ?? body.email ?? ''
  const password: string = body.password ?? ''
  if (!usuario || !password) return c.json({ error: 'Usuario y contraseña son requeridos.' }, 400)

  // Si parece un email se usa directo; si no, se resuelve el username → email.
  const email = usuario.includes('@') ? usuario.trim() : await emailDeUsuario(usuario)
  // Mensaje genérico para no revelar si el usuario existe (anti-enumeración).
  if (!email) return c.json({ error: 'Usuario o contraseña incorrectos.' }, 401)

  const { data, error } = await anonClient().auth.signInWithPassword({ email, password })
  if (error || !data?.session) return c.json({ error: 'Usuario o contraseña incorrectos.' }, 401)
  setAuthCookies(c, data.session)
  return c.json({ user: publicUser(data.user) })
})

// GET /api/auth/me  (incluye rol y nombre del perfil)
auth.get('/me', async (c) => {
  const s = await resolveSession(c)
  if (!s) return c.json({ error: 'No autenticado.' }, 401)
  const { data: perfil } = await s.client
    .from('perfil')
    .select('nombre, username, rol, activo, profesional:profesional_id ( id, nombre, especialidad:especialidad_id ( nombre, familia ) )')
    .eq('id', s.user.id).maybeSingle()
  const prof = (perfil as any)?.profesional
  return c.json({
    user: {
      ...publicUser(s.user),
      nombre: perfil?.nombre ?? null,
      username: perfil?.username ?? null,
      rol: perfil?.rol ?? null,
      activo: perfil?.activo ?? true,
      profesional: prof ? { id: prof.id, nombre: prof.nombre, especialidad: prof.especialidad?.nombre ?? null, familia: prof.especialidad?.familia ?? null } : null,
    },
  })
})

// Perfil + profesional vinculado (misma forma que /me) para refrescar la sesión del front.
const SELECT_CUENTA = 'nombre, username, telefono, rol, profesional:profesional_id ( id, nombre, especialidad:especialidad_id ( nombre, familia ) )'
const mapProf = (p: any) => (p ? { id: p.id, nombre: p.nombre, especialidad: p.especialidad?.nombre ?? null, familia: p.especialidad?.familia ?? null } : null)

// PATCH /api/auth/account  { email?, password?, nombre?, username?, telefono?, especialidad? }
// El propio usuario edita sus datos (cualquier rol). El rol NO se puede cambiar desde acá.
// `especialidad`: su especialidad (debe existir en el catálogo; '' = sin vínculo,
// no permitido para los roles clínicos Profesional y Dios).
auth.patch('/account', async (c) => {
  const s = await resolveSession(c)
  if (!s) return c.json({ error: 'No autenticado.' }, 401)
  const { email, password, nombre, username, telefono, especialidad } = await c.req.json().catch(() => ({}))

  // 0) Especialidad: se valida ANTES de tocar credenciales (o se aplica todo o nada de lo validable).
  const svc = serviceClient()
  let especialidadId: string | null | undefined
  let perfilAct: any = null
  if (especialidad !== undefined) {
    const esp = String(especialidad ?? '').trim()
    const { data } = await svc.from('perfil').select('rol, nombre, profesional_id').eq('id', s.user.id).maybeSingle()
    perfilAct = data
    const clinico = perfilAct?.rol === 'profesional' || perfilAct?.rol === 'dios'
    if (!esp && clinico) return c.json({ error: 'La especialidad es obligatoria para los privilegios Profesional y Dios.' }, 400)
    especialidadId = esp ? await buscarCatalogo(svc, 'especialidad', esp) : null
    if (esp && !especialidadId) return c.json({ error: 'Especialidad inexistente. Elegí una del listado.' }, 400)
  }

  // 1) Credenciales (email / contraseña) → cuenta de Auth, con la sesión propia.
  const authUpd: Record<string, string> = {}
  if (email) authUpd.email = email
  if (password) authUpd.password = password
  let authUser = s.user
  if (Object.keys(authUpd).length) {
    const { data, error } = await s.client.auth.updateUser(authUpd)
    if (error) return c.json({ error: error.message }, 400)
    authUser = data.user
  }

  // 2) Datos de perfil (nombre / usuario / teléfono / especialidad) → tabla perfil.
  const cambios: Record<string, unknown> = {}
  if (nombre !== undefined) {
    if (!String(nombre).trim()) return c.json({ error: 'El nombre no puede quedar vacío.' }, 400)
    cambios.nombre = String(nombre).trim()
  }
  if (telefono !== undefined) cambios.telefono = telefono || null
  if (username !== undefined) {
    const uname = String(username).trim().toLowerCase()
    if (!uname) return c.json({ error: 'El usuario no puede quedar vacío.' }, 400)
    const { data: existe } = await svc.from('perfil').select('id').eq('username', uname).neq('id', s.user.id).maybeSingle()
    if (existe) return c.json({ error: 'Ese nombre de usuario ya está en uso.' }, 400)
    cambios.username = uname
  }
  if (especialidadId !== undefined) {
    const profesional_id = await vincularProfesional(svc, {
      actualId: perfilAct?.profesional_id ?? null,
      nombre: cambios.nombre as string ?? perfilAct?.nombre ?? '',
      especialidadId,
      actor: s.user.id,
    })
    if (profesional_id !== (perfilAct?.profesional_id ?? null)) cambios.profesional_id = profesional_id
  }
  if (Object.keys(cambios).length) {
    cambios.actualizado_por = s.user.id
    const { error } = await svc.from('perfil').update(cambios).eq('id', s.user.id)
    if (error) return c.json({ error: error.message }, 400)
  }

  if (!Object.keys(authUpd).length && !Object.keys(cambios).length && especialidadId === undefined) {
    return c.json({ error: 'No hay datos para actualizar.' }, 400)
  }

  const { data: perfil } = await svc.from('perfil').select(SELECT_CUENTA).eq('id', s.user.id).maybeSingle()
  return c.json({
    user: {
      ...publicUser(authUser),
      nombre: perfil?.nombre ?? null,
      username: perfil?.username ?? null,
      telefono: perfil?.telefono ?? null,
      rol: perfil?.rol ?? null,
      profesional: mapProf((perfil as any)?.profesional),
    },
    message: email
      ? 'Datos actualizados. Si cambiaste el email, revisá tu correo para confirmarlo.'
      : 'Datos actualizados correctamente.',
  })
})

// GET /api/auth/generar-password → contraseña segura sugerida (para "Mi cuenta").
// Disponible para cualquier usuario autenticado (incluido el rol 'profesional',
// que no tiene acceso a /usuarios).
auth.get('/generar-password', async (c) => {
  const s = await resolveSession(c)
  if (!s) return c.json({ error: 'No autenticado.' }, 401)
  return c.json({ password: generarPassword() })
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const s = await resolveSession(c)
  if (s) await s.client.auth.signOut().catch(() => {})
  clearAuthCookies(c)
  return c.json({ ok: true })
})

export default auth
