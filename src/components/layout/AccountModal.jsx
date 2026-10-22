import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { useAuth } from '../../context/AuthContext'
import { PasswordRequisitos } from '../ui'
import { cumplePolitica } from '../../lib/password'
import { catalogosApi } from '../../lib/api'

export default function AccountModal({ show, onHide }) {
  const { user, updateAccount } = useAuth()
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRep, setPasswordRep] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [esps, setEsps] = useState([])
  const [msg, setMsg] = useState(null) // { tipo, texto }
  const [guardando, setGuardando] = useState(false)

  // Al abrir, precarga los datos actuales del usuario.
  useEffect(() => {
    if (!show) return
    setNombre(user?.nombre || '')
    setUsername(user?.username || '')
    setTelefono(user?.telefono || '')
    setEmail(user?.email || '')
    setEspecialidad(user?.profesional?.especialidad || '')
    limpiarPass()
    setMsg(null)
  }, [show, user])

  // Catálogo de especialidades (lectura, disponible para todos los roles).
  useEffect(() => {
    if (!show) return
    catalogosApi.especialidades().then((l) => setEsps(l.map((e) => e.nombre))).catch(() => setEsps([]))
  }, [show])

  // Los roles clínicos (Profesional / Dios) deben tener especialidad (misma regla que Configuración).
  const clinico = ['profesional', 'dios'].includes(user?.rol)
  const espActual = user?.profesional?.especialidad || ''
  const opcionesEsp = espActual && !esps.includes(espActual) ? [espActual, ...esps] : esps

  const limpiarPass = () => {
    setPassword('')
    setPasswordRep('')
    setPasswordActual('')
  }

  const cerrar = () => {
    limpiarPass()
    setMsg(null)
    onHide()
  }

  const guardar = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (!nombre.trim() || !username.trim()) {
      setMsg({ tipo: 'warning', texto: 'El nombre y el usuario no pueden quedar vacíos.' })
      return
    }
    const payload = {}
    if (nombre.trim() !== (user?.nombre || '')) payload.nombre = nombre.trim()
    if (username.trim().toLowerCase() !== (user?.username || '')) payload.username = username.trim()
    if (telefono !== (user?.telefono || '')) payload.telefono = telefono
    if (email && email !== (user?.email || '')) payload.email = email
    if (especialidad !== espActual) {
      if (!especialidad && clinico) {
        setMsg({ tipo: 'warning', texto: 'La especialidad es obligatoria para tu privilegio.' })
        return
      }
      payload.especialidad = especialidad
    }
    if (password) {
      if (!cumplePolitica(password)) {
        setMsg({ tipo: 'warning', texto: 'La nueva contraseña no cumple los requisitos indicados.' })
        return
      }
      if (password !== passwordRep) {
        setMsg({ tipo: 'warning', texto: 'Las contraseñas nuevas no coinciden.' })
        return
      }
      if (!passwordActual) {
        setMsg({ tipo: 'warning', texto: 'Ingresá tu contraseña actual para cambiarla.' })
        return
      }
      payload.password = password
      payload.passwordActual = passwordActual
    }
    if (!Object.keys(payload).length) {
      setMsg({ tipo: 'warning', texto: 'No hay cambios para guardar.' })
      return
    }
    setGuardando(true)
    try {
      const texto = await updateAccount(payload)
      setMsg({ tipo: 'success', texto })
      limpiarPass()
    } catch (err) {
      setMsg({ tipo: 'danger', texto: err.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show={show} onHide={cerrar} centered>
      <Form onSubmit={guardar}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }}>Mi cuenta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {msg && <Alert variant={msg.tipo} className="py-2 px-3 small">{msg.texto}</Alert>}
          <p className="text-muted small mb-3">Los campos con <span className="text-danger">*</span> son obligatorios.</p>

          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>Nombre y apellido <span className="text-danger">*</span></Form.Label>
              <Form.Control required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="col-md-6">
              <Form.Label>Usuario <span className="text-danger">*</span></Form.Label>
              <Form.Control required autoCapitalize="none" value={username}
                onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="col-md-7">
              <Form.Label>Correo electrónico</Form.Label>
              <Form.Control type="email" placeholder="tu@correo.com" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="col-md-5">
              <Form.Label>Teléfono <span className="text-muted small">(opcional)</span></Form.Label>
              <Form.Control value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="col-12">
              <Form.Label>Especialidad {clinico
                ? <span className="text-danger">*</span>
                : <span className="text-muted small">(si sos profesional)</span>}</Form.Label>
              <Form.Select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
                {(!clinico || !especialidad) && <option value="">{clinico ? 'Seleccionar...' : 'Sin vínculo'}</option>}
                {opcionesEsp.map((e) => <option key={e} value={e}>{e}</option>)}
              </Form.Select>
              <Form.Text className="text-muted">
                Define tu ficha de profesional y tu vista de médico. Tu historial (turnos y evoluciones) conserva la especialidad con la que se registró.
              </Form.Text>
            </div>
            <div className="col-12">
              <Form.Label>Nueva contraseña <span className="text-muted small">(dejar vacío = no cambiar)</span></Form.Label>
              <Form.Control type="password" autoComplete="new-password"
                placeholder="Dejar vacío para no cambiarla" value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <PasswordRequisitos password={password} />
              <Form.Text className="text-muted">
                Si cambiás el email, vas a recibir un correo para confirmarlo.
              </Form.Text>
            </div>
            {password && (
              <>
                <div className="col-md-6">
                  <Form.Label>Repetir nueva contraseña <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="password" autoComplete="new-password" value={passwordRep}
                    isInvalid={!!passwordRep && passwordRep !== password}
                    onChange={(e) => setPasswordRep(e.target.value)} />
                  <Form.Control.Feedback type="invalid">No coincide con la nueva contraseña.</Form.Control.Feedback>
                </div>
                <div className="col-md-6">
                  <Form.Label>Contraseña actual <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="password" autoComplete="current-password" value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={cerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
