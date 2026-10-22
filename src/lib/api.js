/**
 * Cliente HTTP mínimo hacia el backend (BFF).
 * Siempre envía cookies (credentials: 'include') para la sesión httpOnly.
 * El frontend nunca habla con Supabase ni conoce sus claves: todo pasa por /api.
 */
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error de conexión con el servidor.')
  return data
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) })
const qs = (params = {}) => {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return s ? `?${s}` : ''
}

export const authApi = {
  me: () => request('/auth/me'),
  login: (usuario, password) => post('/auth/login', { usuario, password }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateAccount: (payload) => patch('/auth/account', payload),
}

export const usuariosApi = {
  list: () => request('/usuarios'),
  create: (body) => post('/usuarios', body),
  update: (id, body) => patch(`/usuarios/${id}`, body),
  remove: (id) => request(`/usuarios/${id}`, { method: 'DELETE' }),
}

export const pacientesApi = {
  list: (params = {}) => request(`/pacientes${qs(params)}`),
  get: (id) => request(`/pacientes/${id}`),
  create: (body) => post('/pacientes', body),
  update: (id, body) => patch(`/pacientes/${id}`, body),
  remove: (id) => request(`/pacientes/${id}`, { method: 'DELETE' }),
}

export const turnosApi = {
  list: (params) => request(`/turnos${qs(params)}`),
  create: (body) => post('/turnos', body),
  update: (id, body) => patch(`/turnos/${id}`, body),
  remove: (id) => request(`/turnos/${id}`, { method: 'DELETE' }),
}

export const evolucionesApi = {
  list: (params) => request(`/evoluciones${qs(params)}`),
  create: (body) => post('/evoluciones', body),
  update: (id, body) => patch(`/evoluciones/${id}`, body),
}

// Estudios (archivos). La subida va como multipart: sin Content-Type manual,
// el navegador arma el boundary.
export const estudiosApi = {
  list: (params = {}) => request(`/estudios${qs(params)}`),
  upload: (formData) => request('/estudios', { method: 'POST', body: formData, headers: {} }),
  update: (id, body) => patch(`/estudios/${id}`, body),
  remove: (id) => request(`/estudios/${id}`, { method: 'DELETE' }),
  urlArchivo: (id, ver = false) => `/api/estudios/${id}/archivo${ver ? '?ver=1' : ''}`,
  // Trae el archivo como Blob por fetch autenticado (mismo origen + cookie, igual
  // que el resto de /api). Se usa para ver/descargar sin depender de una navegación
  // en pestaña nueva (que en prod, por HTTP/3 + Cloudflare, quedaba en blanco).
  archivoBlob: async (id) => {
    const res = await fetch(`/api/estudios/${id}/archivo`, { credentials: 'include' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'No se pudo obtener el archivo.')
    }
    return res.blob()
  },
}

export const observacionesApi = {
  list: (params = {}) => request(`/observaciones${qs(params)}`),
}

// Alertas (C3): reglas sobre variables pautadas por cada profesional/especialidad
// y alertas de condición del paciente (alergia, anticoagulación…).
export const alertasApi = {
  reglas: () => request('/alertas/reglas'),
  crearRegla: (body) => post('/alertas/reglas', body),
  editarRegla: (id, body) => patch(`/alertas/reglas/${id}`, body),
  eliminarRegla: (id) => request(`/alertas/reglas/${id}`, { method: 'DELETE' }),
  dePaciente: (pacienteId) => request(`/alertas/paciente/${pacienteId}`),
  crearDePaciente: (pacienteId, body) => post(`/alertas/paciente/${pacienteId}`, body),
  editarDePaciente: (id, body) => patch(`/alertas/paciente-alerta/${id}`, body),
  eliminarDePaciente: (id) => request(`/alertas/paciente-alerta/${id}`, { method: 'DELETE' }),
}

export const profesionalesApi = {
  list: () => request('/profesionales'),
  create: (body) => post('/profesionales', body),
  update: (id, body) => patch(`/profesionales/${id}`, body),
  remove: (id) => request(`/profesionales/${id}`, { method: 'DELETE' }),
}

export const catalogosApi = {
  especialidades: () => request('/especialidades'),
  crearEspecialidad: (nombre) => post('/especialidades', { nombre }),
  editarEspecialidad: (id, nombre) => patch(`/especialidades/${id}`, { nombre }),
  // Familia de HC de la especialidad (plantilla de C1 / Resumen / confidencialidad). null = formulario general.
  familiaEspecialidad: (id, familia) => patch(`/especialidades/${id}`, { familia }),
  eliminarEspecialidad: (id) => request(`/especialidades/${id}`, { method: 'DELETE' }),
  obrasSociales: () => request('/obras-sociales'),
  crearObraSocial: (nombre) => post('/obras-sociales', { nombre }),
  editarObraSocial: (id, nombre) => patch(`/obras-sociales/${id}`, { nombre }),
  eliminarObraSocial: (id) => request(`/obras-sociales/${id}`, { method: 'DELETE' }),
}
