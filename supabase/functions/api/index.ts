import { Hono, secureHeaders } from './deps.ts'
import type { Env } from './deps.ts'
import { HttpError } from './lib/http.ts'
import authRoutes from './routes/auth.ts'
import catalogosRoutes from './routes/catalogos.ts'
import profesionalesRoutes from './routes/profesionales.ts'
import pacientesRoutes from './routes/pacientes.ts'
import turnosRoutes from './routes/turnos.ts'
import evolucionesRoutes from './routes/evoluciones.ts'
import observacionesRoutes from './routes/observaciones.ts'
import usuariosRoutes from './routes/usuarios.ts'
import estudiosRoutes from './routes/estudios.ts'
import alertasRoutes from './routes/alertas.ts'

// basePath('/api'): la función se sirve en /functions/v1/api, y la runtime
// incluye el nombre de la función en el path interno. Así /api/... matchea.
const app = new Hono<Env>().basePath('/api')

// La vista de archivos (estudios) se sirve inline: el visor de PDF/imagen del
// navegador lo renderiza en un frame/contexto interno de OTRO origen, y varias
// cabeceras que secureHeaders pone por default se lo bloquean (la pestaña queda
// en blanco y vuelve al panel). En particular Cross-Origin-Resource-Policy:
// same-origin impide que ese visor traiga el recurso. Como este middleware se
// registra ANTES que secureHeaders, su código post-next corre AL FINAL y limpia
// esas cabeceras SOLO para esta ruta (el archivo es same-origin y la cookie es
// SameSite=Lax → no viaja en un iframe de otro sitio, así que no hay clickjacking
// ni fuga real). Dejamos X-Content-Type-Options: nosniff.
app.use('/estudios/:id/archivo', async (c, next) => {
  await next()
  for (const h of [
    'X-Frame-Options',
    'Content-Security-Policy',
    'Cross-Origin-Resource-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy',
  ]) c.res.headers.delete(h)
})

// Security headers en todas las respuestas de la API (defensa en profundidad).
// Anti-clickjacking + nosniff + HSTS + política de referer, etc.
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  contentSecurityPolicy: { frameAncestors: ["'none'"] },
}))

app.get('/health', (c) => c.json({ ok: true }))
app.route('/auth', authRoutes)
app.route('/', catalogosRoutes) // /api/especialidades, /api/obras-sociales
app.route('/profesionales', profesionalesRoutes)
app.route('/pacientes', pacientesRoutes)
app.route('/turnos', turnosRoutes)
app.route('/evoluciones', evolucionesRoutes)
app.route('/observaciones', observacionesRoutes)
app.route('/usuarios', usuariosRoutes)
app.route('/estudios', estudiosRoutes)
app.route('/alertas', alertasRoutes)

app.notFound((c) => c.json({ error: 'No encontrado.' }, 404))

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400)
  console.error('[polaris]', err)
  return c.json({ error: 'Error interno del servidor.' }, 500)
})

Deno.serve(app.fetch)
