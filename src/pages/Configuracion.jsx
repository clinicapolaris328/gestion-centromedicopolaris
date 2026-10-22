import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { Stethoscope, Plus, Trash2, UserRound, Pencil, BellRing } from 'lucide-react'
import { PageHeader, Card, Badge, Loader, ErrorState, PasswordRequisitos } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { profesionalesApi, catalogosApi, usuariosApi, alertasApi } from '../lib/api'
import ReglaAlertaModal from '../components/hc/ReglaAlertaModal'
import { metaDe } from '../data/hc/variables'
import { puedePautarAlertas, FAMILIAS } from '../data/hc/dashboard'
import { mismaPersona } from '../lib/nombres'
import { cumplePolitica } from '../lib/password'

const FORM_VACIO = { id: null, nombre: '', especialidad: '', especialidadOtra: '', horario: [] }
// Días para el horario de atención (valor = JS getDay(): 0=domingo … 6=sábado).
const DIAS_SEMANA = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']]

// Privilegios de acceso al sistema (coinciden con el enum rol_usuario del backend)
const ROLES = [
  { value: 'dios', label: 'Dios' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'asistente', label: 'Asistente' },
  { value: 'profesional', label: 'Profesional' },
]
const rotulo = (rol) => ROLES.find((r) => r.value === rol)?.label || rol
const USUARIO_VACIO = { id: null, nombre: '', username: '', email: '', telefono: '', password: '', rol: 'asistente', especialidad: '', especialidadOtra: '', profId: '' }


export default function Configuracion() {
  const { user, logout } = useAuth()
  // Gestión de usuarios: administrador, asistente y dios tienen el mismo poder
  // (crear/editar/eliminar y cambiar privilegios). Solo 'profesional' queda afuera
  // (y ni siquiera ve Configuración). Puede asignar cualquier privilegio.
  const soyAdmin = user?.rol !== 'profesional'
  const rolesDisponibles = soyAdmin ? ROLES : ROLES.filter((r) => r.value === 'asistente')
  const { data, setData, loading, error, reload } = useApi(
    () => Promise.all([profesionalesApi.list(), catalogosApi.especialidades(), catalogosApi.obrasSociales(), usuariosApi.list()])
      .then(([profesionales, especialidades, obrasSociales, usuarios]) => ({ profesionales, especialidades, obrasSociales, usuarios })),
    [],
  )

  const [show, setShow] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [errProf, setErrProf] = useState(null)
  const [guardandoProf, setGuardandoProf] = useState(false)
  const [profAEliminar, setProfAEliminar] = useState(null)
  const [accionError, setAccionError] = useState(null)
  const editandoProf = !!form.id

  // --- catálogos (especialidades / obras sociales) ---
  const [showCat, setShowCat] = useState(false)
  const [catForm, setCatForm] = useState({ tipo: 'especialidad', id: null, nombre: '', familia: '' })
  const [errCat, setErrCat] = useState(null)
  const [guardandoCat, setGuardandoCat] = useState(false)
  const [catAEliminar, setCatAEliminar] = useState(null)

  const profs = data?.profesionales ?? []

  // --- alertas pautadas (C3). Carga aparte y tolerante: si el backend aún no tiene
  // la ruta (antes del deploy v28), la tarjeta lo indica y el resto sigue igual.
  const alertasCarga = useApi(() => alertasApi.reglas(), [])
  const reglas = alertasCarga.data ?? []
  const setReglas = (fn) => alertasCarga.setData((l) => fn(l ?? []))
  const gestionaAlertas = puedePautarAlertas(user?.rol) && user?.rol !== 'profesional'
  const [reglaModal, setReglaModal] = useState(null) // { variable, inicial } | { variable: null }
  const esps = data?.especialidades ?? []
  const obras = data?.obrasSociales ?? []
  const usuarios = data?.usuarios ?? []


  // --- usuarios (API real) ---
  const [showUsuario, setShowUsuario] = useState(false)
  const [formUsuario, setFormUsuario] = useState(USUARIO_VACIO)
  const [guardandoUsuario, setGuardandoUsuario] = useState(false)
  const [errUsuario, setErrUsuario] = useState(null)
  const [accionUsuario, setAccionUsuario] = useState(null) // { tipo:'rol'|'estado'|'eliminar', usuario, nuevoRol? }
  const editandoUsuario = !!formUsuario.id

  // Fichas de profesional ya vinculadas a un usuario (una ficha = un usuario).
  const fichaUsuario = Object.fromEntries(usuarios.filter((u) => u.profesional?.id).map((u) => [u.profesional.id, u]))
  const fichaElegida = profs.find((p) => p.id === formUsuario.profId) || null
  // Posibles coincidencias: fichas existentes que comparten apellido/nombre con lo
  // que se está escribiendo (evita crear una réplica de un profesional ya cargado).
  // Misma regla que el servidor (lib/nombres.js ↔ lib/profesional.ts): lo que se
  // avisa acá es exactamente lo que la API bloquearía.
  const coincidencias = formUsuario.profId || !formUsuario.nombre.trim() ? []
    : profs.filter((p) => mismaPersona(p.nombre, formUsuario.nombre))
  // Lo mismo al cargar/editar una ficha en Profesionales (la API además lo rechaza).
  const coincidenciasProf = !form.nombre.trim() ? []
    : profs.filter((p) => p.id !== form.id && mismaPersona(p.nombre, form.nombre))
  const esYo = (u) => u.id && user?.id && u.id === user.id

  const setU = (u) => setData((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? u : x)) }))

  // --- profesionales (API) ---
  const conEspecialidadEnCatalogo = (upd) => (d) => ({
    ...d,
    especialidades: d.especialidades.some((x) => x.nombre.toLowerCase() === upd.especialidad.toLowerCase())
      ? d.especialidades
      : [...d.especialidades, { id: `new-${Date.now()}`, nombre: upd.especialidad, personalizada: true }],
  })

  const abrirNuevoProf = () => { setErrProf(null); setForm(FORM_VACIO); setShow(true) }
  const abrirEditarProf = (p) => {
    setErrProf(null)
    const conocida = esps.some((e) => e.nombre === p.especialidad)
    setForm({
      id: p.id, nombre: p.nombre,
      especialidad: conocida ? p.especialidad : 'Otros',
      especialidadOtra: conocida ? '' : p.especialidad,
      horario: p.horario || [],
    })
    setShow(true)
  }

  const guardarProfesional = async (e) => {
    e.preventDefault()
    setErrProf(null)
    const esp = (form.especialidad === 'Otros' ? form.especialidadOtra : form.especialidad).trim()
    if (!esp) return
    setGuardandoProf(true)
    try {
      const horario = (form.horario || []).filter((f) => f.inicio && f.fin)
      if (editandoProf) {
        const upd = await profesionalesApi.update(form.id, { nombre: form.nombre, especialidad: esp, horario })
        setData((d) => ({ ...conEspecialidadEnCatalogo(upd)(d), profesionales: d.profesionales.map((x) => (x.id === form.id ? upd : x)) }))
      } else {
        const nuevo = await profesionalesApi.create({ nombre: form.nombre, especialidad: esp, horario })
        setData((d) => ({ ...conEspecialidadEnCatalogo(nuevo)(d), profesionales: [...d.profesionales, nuevo] }))
      }
      setShow(false)
      setForm(FORM_VACIO)
    } catch (err) {
      setErrProf(err.message)
    } finally {
      setGuardandoProf(false)
    }
  }

  const toggleSuspender = async (p) => {
    setAccionError(null)
    try {
      const upd = await profesionalesApi.update(p.id, { estado: p.estado === 'activo' ? 'suspendido' : 'activo' })
      setData((d) => ({ ...d, profesionales: d.profesionales.map((x) => (x.id === p.id ? upd : x)) }))
    } catch (err) {
      setAccionError(err.message)
    }
  }

  const eliminarProfesional = async () => {
    if (!profAEliminar) return
    setAccionError(null)
    try {
      await profesionalesApi.remove(profAEliminar.id)
      setData((d) => ({ ...d, profesionales: d.profesionales.filter((x) => x.id !== profAEliminar.id) }))
      setProfAEliminar(null)
    } catch (err) {
      setAccionError(err.message)
      setProfAEliminar(null)
    }
  }

  // --- catálogos: especialidades y obras sociales (CRUD trazable) ---
  const CAT = {
    especialidad: {
      key: 'especialidades', label: 'especialidad',
      crear: catalogosApi.crearEspecialidad, editar: catalogosApi.editarEspecialidad, eliminar: catalogosApi.eliminarEspecialidad,
    },
    obra: {
      key: 'obrasSociales', label: 'obra social',
      crear: catalogosApi.crearObraSocial, editar: catalogosApi.editarObraSocial, eliminar: catalogosApi.eliminarObraSocial,
    },
  }
  const catLabel = (tipo) => (tipo === 'obra' ? 'obra social' : 'especialidad')

  const abrirNuevoCat = (tipo) => { setErrCat(null); setCatForm({ tipo, id: null, nombre: '', familia: '' }); setShowCat(true) }
  const abrirEditarCat = (tipo, item) => { setErrCat(null); setCatForm({ tipo, id: item.id, nombre: item.nombre, familia: item.familia || '' }); setShowCat(true) }

  const guardarCat = async (e) => {
    e.preventDefault()
    setErrCat(null)
    const nombre = catForm.nombre.trim()
    if (!nombre) { setErrCat('El nombre es requerido.'); return }
    const cfg = CAT[catForm.tipo]
    setGuardandoCat(true)
    try {
      // Especialidades: además del nombre, su familia de HC (dato administrable, no
      // deducido del nombre). '' = formulario general (null en la base).
      const conFamilia = async (item) => {
        if (catForm.tipo !== 'especialidad' || (item.familia || '') === catForm.familia) return item
        return catalogosApi.familiaEspecialidad(item.id, catForm.familia || null)
      }
      if (catForm.id) {
        const actual = esps.find((x) => x.id === catForm.id)
        const renombrada = nombre !== actual?.nombre ? await cfg.editar(catForm.id, nombre) : actual
        const upd = await conFamilia(renombrada)
        setData((d) => ({ ...d, [cfg.key]: d[cfg.key].map((x) => (x.id === catForm.id ? upd : x)) }))
      } else {
        const nuevo = await conFamilia(await cfg.crear(nombre))
        setData((d) => ({ ...d, [cfg.key]: [...d[cfg.key], nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
      }
      setShowCat(false)
    } catch (err) {
      setErrCat(err.message)
    } finally {
      setGuardandoCat(false)
    }
  }

  const eliminarCat = async () => {
    if (!catAEliminar) return
    const { tipo, item } = catAEliminar
    const cfg = CAT[tipo]
    setAccionError(null)
    try {
      await cfg.eliminar(item.id)
      setData((d) => ({ ...d, [cfg.key]: d[cfg.key].filter((x) => x.id !== item.id) }))
      setCatAEliminar(null)
    } catch (err) {
      setAccionError(err.message)
      setCatAEliminar(null)
    }
  }

  // --- usuarios (API) ---
  const abrirNuevoUsuario = () => { setErrUsuario(null); setFormUsuario(USUARIO_VACIO); setShowUsuario(true) }
  const abrirEditarUsuario = (u) => {
    setErrUsuario(null)
    const espNom = u.profesional?.especialidad || ''
    const enLista = espNom && esps.some((e) => e.nombre === espNom)
    setFormUsuario({
      id: u.id, nombre: u.nombre || '', username: u.username || '', email: u.email || '',
      telefono: u.telefono || '', password: '', rol: u.rol || 'asistente',
      especialidad: espNom ? (enLista ? espNom : 'Otros') : '',
      especialidadOtra: espNom && !enLista ? espNom : '',
      profId: u.profesional?.id || '',
    })
    setShowUsuario(true)
  }

  const guardarUsuario = async (e) => {
    e.preventDefault()
    setErrUsuario(null)
    const faltan = []
    if (!formUsuario.nombre.trim()) faltan.push('Nombre y apellido')
    if (!formUsuario.username.trim()) faltan.push('Usuario')
    if (!formUsuario.email.trim()) faltan.push('Email')
    if (!editandoUsuario && !formUsuario.password) faltan.push('Contraseña')
    const esp = (formUsuario.especialidad === 'Otros' ? formUsuario.especialidadOtra : formUsuario.especialidad).trim()
    if (['profesional', 'dios'].includes(formUsuario.rol) && !esp && !formUsuario.profId) faltan.push(`Especialidad o ficha de profesional (requerida para el privilegio ${rotulo(formUsuario.rol)})`)
    if (faltan.length) {
      setErrUsuario('Faltan campos obligatorios: ' + faltan.join(', ') + '.')
      return
    }
    if (formUsuario.password && !cumplePolitica(formUsuario.password)) {
      setErrUsuario('La contraseña no cumple los requisitos indicados.')
      return
    }
    setGuardandoUsuario(true)
    try {
      if (editandoUsuario) {
        const body = {
          nombre: formUsuario.nombre, username: formUsuario.username, email: formUsuario.email,
          telefono: formUsuario.telefono, rol: formUsuario.rol, especialidad: esp,
        }
        if (formUsuario.password) body.password = formUsuario.password
        // Ficha existente elegida (solo si cambió respecto de la actual).
        const actual = usuarios.find((x) => x.id === formUsuario.id)?.profesional?.id || ''
        if (formUsuario.profId && formUsuario.profId !== actual) body.profId = formUsuario.profId
        const upd = await usuariosApi.update(formUsuario.id, body)
        setU(upd)
      } else {
        const nuevo = await usuariosApi.create({
          nombre: formUsuario.nombre, username: formUsuario.username, email: formUsuario.email,
          password: formUsuario.password, telefono: formUsuario.telefono, rol: formUsuario.rol,
          especialidad: esp,
          ...(formUsuario.profId ? { profId: formUsuario.profId } : {}),
        })
        setData((d) => ({ ...d, usuarios: [...d.usuarios, nuevo] }))
      }
      setShowUsuario(false)
      setFormUsuario(USUARIO_VACIO)
    } catch (err) {
      setErrUsuario(err.message)
    } finally {
      setGuardandoUsuario(false)
    }
  }

  const confirmarAccionUsuario = async () => {
    if (!accionUsuario) return
    const { tipo, usuario, nuevoRol } = accionUsuario
    setAccionError(null)
    try {
      if (tipo === 'rol') { const upd = await usuariosApi.update(usuario.id, { rol: nuevoRol }); setU(upd) }
      else if (tipo === 'estado') { const upd = await usuariosApi.update(usuario.id, { activo: !usuario.activo }); setU(upd) }
      else if (tipo === 'eliminar') {
        await usuariosApi.remove(usuario.id)
        if (esYo(usuario)) { logout(); return }
        setData((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== usuario.id) }))
      }
      setAccionUsuario(null)
    } catch (err) {
      setAccionError(err.message)
      setAccionUsuario(null)
    }
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Parámetros base del sistema" />

      {accionError && <Alert variant="danger" className="py-2 px-3 small" dismissible onClose={() => setAccionError(null)}>{accionError}</Alert>}

      <div className="row g-4">
        <div className="col-lg-6">
          <Card
            title="Profesionales"
            actions={
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={abrirNuevoProf} disabled={loading || !!error}>
                <Plus size={16} /> Agregar
              </Button>
            }
          >
            {loading ? (
              <Loader label="Cargando profesionales…" />
            ) : error ? (
              <ErrorState onRetry={reload}>{error}</ErrorState>
            ) : (
              <>
                {profs.length === 0 && <p className="text-muted small mb-0">Sin profesionales cargados.</p>}
                {profs.map((p) => {
                  const suspendido = p.estado === 'suspendido'
                  return (
                    <div className="file-row" key={p.id} style={{ opacity: suspendido ? 0.6 : 1 }}>
                      <div className="file-icon"><Stethoscope size={18} /></div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                        <div><small className="text-muted">{p.especialidad}</small></div>
                      </div>
                      <Badge tone={suspendido ? 'warn' : 'ok'}>{suspendido ? 'Suspendido' : 'Activo'}</Badge>
                      <div className="d-flex gap-1 align-items-center flex-wrap justify-content-end">
                        <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1" onClick={() => abrirEditarProf(p)}>
                          <Pencil size={14} /> Editar
                        </Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => toggleSuspender(p)}>
                          {suspendido ? 'Reactivar' : 'Suspender'}
                        </Button>
                        <Button size="sm" variant="outline-danger" className="d-inline-flex align-items-center gap-1" title="Eliminar profesional" onClick={() => setProfAEliminar(p)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </Card>
        </div>

        <div className="col-lg-6">
          <Card
            title="Usuarios del sistema"
            actions={
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={abrirNuevoUsuario} disabled={loading || !!error}>
                <Plus size={16} /> Nuevo usuario
              </Button>
            }
          >
            {loading ? (
              <Loader label="Cargando usuarios…" />
            ) : error ? (
              <ErrorState onRetry={reload}>{error}</ErrorState>
            ) : (
              <>
                {usuarios.length === 0 && <p className="text-muted small mb-0">Sin usuarios cargados.</p>}
                {usuarios.map((u) => {
                  const suspendido = !u.activo
                  const yo = esYo(u)
                  return (
                    <div className="file-row" key={u.id} style={{ opacity: suspendido ? 0.6 : 1 }}>
                      <div className="file-icon"><UserRound size={18} /></div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500 }}>{u.nombre || u.username}</span>
                          {yo && <Badge tone="muted">Vos</Badge>}
                          {u.profesional && <Badge tone="info">{u.profesional.especialidad || 'Profesional'}</Badge>}
                        </div>
                        <small className="text-muted">@{u.username} · {rotulo(u.rol)}</small>
                      </div>
                      {soyAdmin && (
                        <div className="d-flex gap-1 align-items-center flex-wrap justify-content-end">
                          <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1" onClick={() => abrirEditarUsuario(u)}>
                            <Pencil size={14} /> Editar
                          </Button>
                          {!yo && (
                            <Button size="sm" variant="outline-secondary" onClick={() => setAccionUsuario({ tipo: 'estado', usuario: u })}>
                              {suspendido ? 'Reactivar' : 'Suspender'}
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline-danger" className="d-inline-flex align-items-center gap-1"
                            title={yo ? 'Eliminar mi cuenta' : 'Eliminar usuario'}
                            onClick={() => setAccionUsuario({ tipo: 'eliminar', usuario: u })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </Card>
        </div>

        <div className="col-lg-6">
          <Card
            title="Especialidades"
            actions={
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={() => abrirNuevoCat('especialidad')} disabled={loading || !!error}>
                <Plus size={16} /> Agregar
              </Button>
            }
          >
            {loading ? (
              <Loader label="Cargando…" />
            ) : error ? (
              <ErrorState onRetry={reload}>{error}</ErrorState>
            ) : (
              <>
                {esps.length === 0 && <p className="text-muted small mb-0">Sin especialidades cargadas.</p>}
                <div className="d-flex flex-wrap gap-2">
                  {esps.map((e) => (
                    <Button key={e.id} size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
                      onClick={() => abrirEditarCat('especialidad', e)} title="Editar / eliminar">
                      {e.nombre} <Pencil size={12} />
                    </Button>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="col-lg-6">
          <Card
            title="Obras sociales"
            actions={
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={() => abrirNuevoCat('obra')} disabled={loading || !!error}>
                <Plus size={16} /> Agregar
              </Button>
            }
          >
            {loading ? (
              <Loader label="Cargando…" />
            ) : error ? (
              <ErrorState onRetry={reload}>{error}</ErrorState>
            ) : (
              <>
                {obras.length === 0 && <p className="text-muted small mb-0">Sin obras sociales cargadas.</p>}
                <div className="d-flex flex-wrap gap-2">
                  {obras.map((o) => (
                    <Button key={o.id} size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
                      onClick={() => abrirEditarCat('obra', o)} title="Editar / eliminar">
                      {o.nombre} <Pencil size={12} />
                    </Button>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="col-12">
          <Card
            title="Alertas pautadas"
            actions={gestionaAlertas && !alertasCarga.error && (
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={() => setReglaModal({ variable: null, inicial: null })}>
                <Plus size={16} /> Nueva alerta
              </Button>
            )}
          >
            {alertasCarga.loading ? (
              <Loader label="Cargando…" />
            ) : alertasCarga.error ? (
              <p className="text-muted small mb-0">Las alertas pautadas estarán disponibles cuando se despliegue la versión del servidor que las incluye.</p>
            ) : (
              <>
                <p className="text-muted small">
                  Cada profesional pauta sus alertas (personales o de su especialidad) desde los gráficos de la ficha del paciente.
                  Son orientativas: marcan el valor, no bloquean ni diagnostican. Quedan registradas en la auditoría.
                </p>
                {reglas.length === 0 && <p className="text-muted small mb-0">Todavía no hay alertas pautadas.</p>}
                {reglas.map((r) => {
                  const m = metaDe(r.variable)
                  const umbral = [r.minimo != null && `mín. ${r.minimo}`, r.maximo != null && `máx. ${r.maximo}`].filter(Boolean).join(' · ')
                  return (
                    <div className="file-row" key={r.id} style={{ opacity: r.activo ? 1 : 0.6 }}>
                      <div className="file-icon"><BellRing size={18} /></div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500 }}>{m.label}</span>
                          <Badge tone="info">{umbral}{m.unidad ? ` ${m.unidad}` : ''}</Badge>
                          {!r.activo && <Badge tone="muted">Inactiva</Badge>}
                        </div>
                        <small className="text-muted">
                          {r.ambito === 'profesional' ? `Personal · ${r.profesional || 'Profesional'}` : `Especialidad · ${r.especialidad}`}
                          {r.mensaje ? ` · “${r.mensaje}”` : ''}
                        </small>
                      </div>
                      {gestionaAlertas && (
                        <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
                          onClick={() => setReglaModal({ variable: r.variable, inicial: { ambito: r.ambito, especialidad: r.especialidad, profId: r.profId } })}>
                          <Pencil size={14} /> Editar
                        </Button>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </Card>
        </div>
      </div>

      <ReglaAlertaModal
        show={!!reglaModal} onHide={() => setReglaModal(null)} variable={reglaModal?.variable || null} inicial={reglaModal?.inicial || null}
        reglas={reglas} rol={user?.rol} profesional={user?.profesional || null}
        especialidades={esps.map((e) => e.nombre)} profesionales={profs} onCambio={setReglas}
      />

      {/* Modal agregar / editar profesional */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={guardarProfesional}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>{editandoProf ? 'Editar profesional' : 'Nuevo profesional'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errProf && <Alert variant="danger" className="py-2 px-3 small">{errProf}</Alert>}
            <div className="row g-3">
              <div className="col-12">
                <Form.Label>Nombre y apellido</Form.Label>
                <Form.Control required placeholder="Ej: Pérez Juan" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                {coincidenciasProf.length > 0 && (
                  <Alert variant="warning" className="py-2 px-3 small mt-2 mb-0">
                    Ya existe una ficha que podría ser la misma persona. Cada profesional tiene <strong>una sola ficha</strong>:
                    editá la existente en lugar de crear otra.
                    <div className="mt-1">{coincidenciasProf.map((p) => <div key={p.id}>• {p.nombre} — {p.especialidad}</div>)}</div>
                  </Alert>
                )}
              </div>
              <div className="col-12">
                <Form.Label>Especialidad</Form.Label>
                <Form.Select required value={form.especialidad}
                  onChange={(e) => setForm({ ...form, especialidad: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {esps.map((e) => <option key={e.id}>{e.nombre}</option>)}
                  <option value="Otros">Otros</option>
                </Form.Select>
              </div>
              {form.especialidad === 'Otros' && (
                <div className="col-12">
                  <Form.Label>Especificar especialidad</Form.Label>
                  <Form.Control required autoFocus placeholder="Nombre de la especialidad"
                    value={form.especialidadOtra}
                    onChange={(e) => setForm({ ...form, especialidadOtra: e.target.value })} />
                </div>
              )}
              <div className="col-12">
                <Form.Label className="mb-1">Horario de atención</Form.Label>
                <div className="text-muted small mb-2">Define qué días y en qué franja atiende. Se usa para el filtro “En atención ahora” de la agenda.</div>
                {(form.horario || []).map((f, i) => (
                  <div key={i} className="d-flex gap-2 mb-2 align-items-center flex-wrap">
                    <Form.Select value={f.dia} style={{ maxWidth: 150 }}
                      onChange={(e) => setForm({ ...form, horario: form.horario.map((x, j) => (j === i ? { ...x, dia: Number(e.target.value) } : x)) })}>
                      {DIAS_SEMANA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Form.Select>
                    <Form.Control type="time" value={f.inicio} style={{ maxWidth: 130 }}
                      onChange={(e) => setForm({ ...form, horario: form.horario.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)) })} />
                    <span className="text-muted">a</span>
                    <Form.Control type="time" value={f.fin} style={{ maxWidth: 130 }}
                      onChange={(e) => setForm({ ...form, horario: form.horario.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)) })} />
                    <Button variant="outline-danger" size="sm" type="button"
                      onClick={() => setForm({ ...form, horario: form.horario.filter((_, j) => j !== i) })}>Quitar</Button>
                  </div>
                ))}
                <Button variant="outline-secondary" size="sm" type="button"
                  onClick={() => setForm({ ...form, horario: [...(form.horario || []), { dia: 1, inicio: '08:00', fin: '13:00' }] })}>
                  + Agregar franja
                </Button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShow(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardandoProf}>{guardandoProf ? 'Guardando…' : editandoProf ? 'Guardar cambios' : 'Agregar profesional'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirmación: eliminar profesional */}
      <Modal show={profAEliminar !== null} onHide={() => setProfAEliminar(null)} centered size="sm">
        {profAEliminar && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontSize: 18 }}>Eliminar profesional</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Vas a eliminar a <strong>{profAEliminar.nombre}</strong> de forma permanente. Si tiene turnos o evoluciones cargadas no se podrá eliminar (conviene suspenderlo). ¿Confirmás?
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" onClick={() => setProfAEliminar(null)}>Cancelar</Button>
              <Button variant="danger" onClick={eliminarProfesional}>Confirmar</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Modal nuevo / editar usuario */}
      <Modal show={showUsuario} onHide={() => setShowUsuario(false)} centered size="lg">
        <Form onSubmit={guardarUsuario}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>{editandoUsuario ? 'Editar usuario' : 'Nuevo usuario'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errUsuario && <Alert variant="danger" className="py-2 px-3 small">{errUsuario}</Alert>}
            <p className="text-muted small mb-3">Los campos con <span className="text-danger">*</span> son obligatorios.</p>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label>Nombre y apellido <span className="text-danger">*</span></Form.Label>
                <Form.Control required placeholder="Ej: Ana López" value={formUsuario.nombre}
                  onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Usuario <span className="text-danger">*</span></Form.Label>
                <Form.Control required autoCapitalize="none" placeholder="ej: alopez" value={formUsuario.username}
                  onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value })} />
              </div>
              <div className="col-md-7">
                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                <Form.Control type="email" required placeholder="usuario@correo.com" value={formUsuario.email}
                  onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })} />
              </div>
              <div className="col-md-5">
                <Form.Label>Teléfono <span className="text-muted small">(opcional)</span></Form.Label>
                <Form.Control value={formUsuario.telefono}
                  onChange={(e) => setFormUsuario({ ...formUsuario, telefono: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Privilegio <span className="text-danger">*</span></Form.Label>
                <Form.Select value={formUsuario.rol}
                  onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}>
                  {rolesDisponibles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Especialidad {['profesional', 'dios'].includes(formUsuario.rol)
                  ? <span className="text-danger">*</span>
                  : <span className="text-muted small">(si es profesional)</span>}</Form.Label>
                <Form.Select value={formUsuario.especialidad} disabled={!!formUsuario.profId}
                  title={formUsuario.profId ? 'La especialidad es la de la ficha elegida' : undefined}
                  onChange={(e) => setFormUsuario({ ...formUsuario, especialidad: e.target.value })}>
                  <option value="">Sin vínculo</option>
                  {esps.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                  <option value="Otros">Otros</option>
                </Form.Select>
              </div>
              {formUsuario.especialidad === 'Otros' && !formUsuario.profId && (
                <div className="col-md-6">
                  <Form.Label>Especificar especialidad</Form.Label>
                  <Form.Control autoFocus value={formUsuario.especialidadOtra}
                    onChange={(e) => setFormUsuario({ ...formUsuario, especialidadOtra: e.target.value })} />
                </div>
              )}
              <div className="col-12">
                <Form.Label>Ficha de profesional <span className="text-muted small">(si ya está cargado, elegilo: así ve sus pacientes y turnos)</span></Form.Label>
                <Form.Select value={formUsuario.profId}
                  onChange={(e) => {
                    const f = profs.find((p) => p.id === e.target.value)
                    const enLista = f && esps.some((x) => x.nombre === f.especialidad)
                    setFormUsuario({
                      ...formUsuario, profId: e.target.value,
                      ...(f ? { especialidad: enLista ? f.especialidad : 'Otros', especialidadOtra: enLista ? '' : f.especialidad } : {}),
                    })
                  }}>
                  <option value="">Nueva ficha (según nombre y especialidad)</option>
                  {[...profs].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => {
                    const otro = fichaUsuario[p.id]
                    const ocupada = otro && otro.id !== formUsuario.id
                    return (
                      <option key={p.id} value={p.id} disabled={ocupada}>
                        {p.nombre} — {p.especialidad}{ocupada ? ` (ya vinculada a @${otro.username})` : ''}
                      </option>
                    )
                  })}
                </Form.Select>
                {fichaElegida && (
                  <Form.Text className="text-muted">Se vincula a la ficha existente «{fichaElegida.nombre}» ({fichaElegida.especialidad}); no se crea una nueva.</Form.Text>
                )}
                {coincidencias.length > 0 && (
                  <Alert variant="warning" className="py-2 px-3 small mt-2 mb-0">
                    Ya hay fichas que podrían ser la misma persona. Elegí la correcta para no crear una réplica:
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {coincidencias.map((p) => {
                        const otro = fichaUsuario[p.id]
                        const ocupada = otro && otro.id !== formUsuario.id
                        return (
                          <Button key={p.id} size="sm" variant="outline-secondary" disabled={ocupada}
                            onClick={() => {
                              const enLista = esps.some((x) => x.nombre === p.especialidad)
                              setFormUsuario({ ...formUsuario, profId: p.id, especialidad: enLista ? p.especialidad : 'Otros', especialidadOtra: enLista ? '' : p.especialidad })
                            }}>
                            {p.nombre} — {p.especialidad}{ocupada ? ` (de @${otro.username})` : ''}
                          </Button>
                        )
                      })}
                    </div>
                  </Alert>
                )}
              </div>
              <div className="col-12">
                <Form.Label>
                  {editandoUsuario ? 'Contraseña' : <>Contraseña <span className="text-danger">*</span></>}
                  <span className="text-muted small ms-1">
                    {editandoUsuario ? '(dejar vacío = no cambiar)' : '(inicial; el usuario puede cambiarla desde Mi cuenta)'}
                  </span>
                </Form.Label>
                <Form.Control type="text" autoComplete="new-password" autoCapitalize="none" spellCheck={false}
                  placeholder={editandoUsuario ? 'Dejar vacío para no cambiarla' : ''}
                  value={formUsuario.password}
                  onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })} />
                <PasswordRequisitos password={formUsuario.password} />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowUsuario(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardandoUsuario}>{guardandoUsuario ? 'Guardando…' : editandoUsuario ? 'Guardar cambios' : 'Crear usuario'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirmación: acciones sobre un usuario (rol / estado / eliminar) */}
      <Modal show={accionUsuario !== null} onHide={() => setAccionUsuario(null)} centered size="sm">
        {accionUsuario && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontSize: 18 }}>
                {accionUsuario.tipo === 'rol' ? 'Cambiar privilegio'
                  : accionUsuario.tipo === 'eliminar' ? (esYo(accionUsuario.usuario) ? 'Eliminar mi cuenta' : 'Eliminar usuario')
                  : accionUsuario.usuario.activo ? 'Suspender usuario' : 'Reactivar usuario'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {accionUsuario.tipo === 'rol' ? (
                <>Vas a cambiar el privilegio de <strong>{accionUsuario.usuario.nombre}</strong> a <strong>{rotulo(accionUsuario.nuevoRol)}</strong>. ¿Confirmás?</>
              ) : accionUsuario.tipo === 'eliminar' ? (
                esYo(accionUsuario.usuario)
                  ? <>Vas a eliminar <strong>tu propia cuenta</strong> de forma permanente. Se cerrará tu sesión. ¿Continuar?</>
                  : <>Vas a eliminar a <strong>{accionUsuario.usuario.nombre}</strong> de forma permanente. ¿Confirmás?</>
              ) : accionUsuario.usuario.activo ? (
                <>Vas a suspender a <strong>{accionUsuario.usuario.nombre}</strong>. No podrá acceder hasta reactivarlo. ¿Confirmás?</>
              ) : (
                <>Vas a reactivar a <strong>{accionUsuario.usuario.nombre}</strong>. Recuperará el acceso. ¿Confirmás?</>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" onClick={() => setAccionUsuario(null)}>Cancelar</Button>
              <Button variant={accionUsuario.tipo === 'eliminar' ? 'danger' : 'primary'} onClick={confirmarAccionUsuario}>Confirmar</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Modal nueva / editar especialidad u obra social */}
      <Modal show={showCat} onHide={() => setShowCat(false)} centered size="sm">
        <Form onSubmit={guardarCat}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>
              {catForm.id ? 'Editar ' : 'Nueva '}{catLabel(catForm.tipo)}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errCat && <Alert variant="danger" className="py-2 px-3 small">{errCat}</Alert>}
            <Form.Label>Nombre <span className="text-danger">*</span></Form.Label>
            <Form.Control required autoFocus value={catForm.nombre}
              onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} />
            {catForm.tipo === 'especialidad' && (
              <div className="mt-3">
                <Form.Label>Plantilla de historia clínica</Form.Label>
                <Form.Select value={catForm.familia} onChange={(e) => setCatForm({ ...catForm, familia: e.target.value })}>
                  <option value="">Formulario general (sin plantilla propia)</option>
                  {FAMILIAS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </Form.Select>
                <Form.Text className="text-muted">
                  Define qué formulario de evolución, Resumen y confidencialidad usan sus profesionales. Se elige acá (no depende de cómo se escriba el nombre) y queda en la auditoría.
                </Form.Text>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <div>
              {catForm.id && (
                <Button variant="outline-danger" type="button"
                  onClick={() => { setShowCat(false); setCatAEliminar({ tipo: catForm.tipo, item: { id: catForm.id, nombre: catForm.nombre } }) }}>
                  Eliminar
                </Button>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button variant="light" type="button" onClick={() => setShowCat(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardandoCat}>{guardandoCat ? 'Guardando…' : catForm.id ? 'Guardar' : 'Agregar'}</Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirmación: eliminar especialidad u obra social */}
      <Modal show={catAEliminar !== null} onHide={() => setCatAEliminar(null)} centered size="sm">
        {catAEliminar && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontSize: 18 }}>Eliminar {catLabel(catAEliminar.tipo)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Vas a eliminar <strong>{catAEliminar.item.nombre}</strong>. Si está en uso no se podrá eliminar. ¿Confirmás?
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" onClick={() => setCatAEliminar(null)}>Cancelar</Button>
              <Button variant="danger" onClick={eliminarCat}>Confirmar</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  )
}
