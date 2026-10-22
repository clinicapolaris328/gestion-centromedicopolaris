import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { Phone, Mail, FileHeart } from 'lucide-react'
import { soloDigitos } from '../../lib/dni'
import { ESTADOS_TURNO, nombreCompleto } from '../../data/mock'
import BuscadorSelect from '../ui/BuscadorSelect'

const PROGRESO = ['agendado', 'confirmado', 'en_sala', 'atendido']

/**
 * Modal de alta / edición de turno. Estado controlado por el contenedor
 * (Agenda): `form === null` cierra el modal. Reúne el alta/edición, las acciones
 * rápidas de estado y la baja del turno (cancelar = soft / eliminar = borrado),
 * ambas con confirmación en pantalla.
 */
export default function TurnoModal({
  form, onChange, onChangePac, onClose, onSubmit, guardando, error,
  pacientes = [], profesionales = [], obras = [], bloquearProf = false,
  onCancelar, onEliminar,
}) {
  const editando = !!form?.id
  const [confirm, setConfirm] = useState(null) // 'cancelar' | 'eliminar' | null
  const [procesando, setProcesando] = useState(false)
  const pacSel = form ? pacientes.find((p) => p.id === form.pacienteId) : null

  // Al abrir/editar otro turno (o al cerrar) se limpia la confirmación pendiente.
  useEffect(() => { setConfirm(null); setProcesando(false) }, [form?.id])

  const avanzar = () => {
    const i = PROGRESO.indexOf(form.estado)
    onChange({ estado: PROGRESO[(i + 1) % PROGRESO.length] })
  }
  const toggleAusente = () =>
    onChange({ estado: form.estado === 'ausente' ? 'agendado' : 'ausente' })

  const ejecutar = async () => {
    setProcesando(true)
    try {
      if (confirm === 'cancelar') await onCancelar()
      else await onEliminar()
      // El contenedor cierra el modal cuando la acción sale bien.
    } catch {
      setConfirm(null) // el error se muestra vía `error`
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal show={form !== null} onHide={onClose} centered size={form && !form.id && form.modoPac === 'nuevo' ? 'lg' : undefined}>
      {form && (
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>{editando ? 'Editar turno' : 'Nuevo turno'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}
            <div className="row g-3">
              <div className="col-6">
                <Form.Label>Fecha</Form.Label>
                <Form.Control type="date" required value={form.fecha}
                  onChange={(e) => onChange({ fecha: e.target.value })} />
              </div>
              <div className="col-6">
                <Form.Label>Hora</Form.Label>
                <Form.Control type="time" required value={form.hora}
                  onChange={(e) => onChange({ hora: e.target.value })} />
              </div>
              <div className="col-12">
                <Form.Label>Estado</Form.Label>
                <Form.Select value={form.estado} onChange={(e) => onChange({ estado: e.target.value })}>
                  {Object.entries(ESTADOS_TURNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Form.Select>
              </div>
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <Form.Label className="mb-0">Paciente</Form.Label>
                  {!editando && (
                    <div className="pac-modo">
                      <button type="button" className={`pac-modo__btn ${form.modoPac === 'existente' ? 'is-active' : ''}`}
                        onClick={() => onChange({ modoPac: 'existente' })}>Existente</button>
                      <button type="button" className={`pac-modo__btn ${form.modoPac === 'nuevo' ? 'is-active' : ''}`}
                        onClick={() => onChange({ modoPac: 'nuevo' })}>Nuevo</button>
                    </div>
                  )}
                </div>

                {!editando && form.modoPac === 'nuevo' ? (
                  <div className="row g-2 pac-nuevo">
                    <div className="col-sm-6">
                      <Form.Control placeholder="Apellido" required value={form.pac.apellido}
                        onChange={(e) => onChangePac({ apellido: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <Form.Control placeholder="Nombre" required value={form.pac.nombre}
                        onChange={(e) => onChangePac({ nombre: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <Form.Control placeholder="DNI (solo números)" required inputMode="numeric" value={form.pac.dni}
                        onChange={(e) => onChangePac({ dni: soloDigitos(e.target.value) })} />
                    </div>
                    <div className="col-sm-6">
                      <Form.Select value={form.pac.sexo} onChange={(e) => onChangePac({ sexo: e.target.value })}>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                        <option value="X">Otro</option>
                      </Form.Select>
                    </div>
                    <div className="col-sm-6">
                      <Form.Control type="tel" placeholder="Teléfono / WhatsApp" value={form.pac.telefono}
                        onChange={(e) => onChangePac({ telefono: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <Form.Control type="email" placeholder="Email" value={form.pac.email}
                        onChange={(e) => onChangePac({ email: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <Form.Select value={form.pac.obraSocial} onChange={(e) => onChangePac({ obraSocial: e.target.value })}>
                        <option value="">Obra social...</option>
                        {obras.map((o) => <option key={o}>{o}</option>)}
                        <option value="Otros">Otros</option>
                      </Form.Select>
                    </div>
                    <div className="col-sm-6">
                      <Form.Control placeholder="Nº Afiliado" value={form.pac.afiliado}
                        onChange={(e) => onChangePac({ afiliado: e.target.value })} />
                    </div>
                    {form.pac.obraSocial === 'Otros' && (
                      <div className="col-12">
                        <Form.Control required placeholder="Especificar obra social / prepaga" value={form.pac.obraSocialOtra}
                          onChange={(e) => onChangePac({ obraSocialOtra: e.target.value })} />
                      </div>
                    )}
                    <div className="col-12">
                      <p className="pac-nuevo__nota">Se registra al paciente junto con el turno; queda disponible para su historia clínica.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <BuscadorSelect
                      value={form.pacienteId}
                      onChange={(v) => onChange({ pacienteId: v })}
                      opciones={pacientes.map((p) => ({ value: p.id, label: `${nombreCompleto(p)} — ${p.dni}` }))}
                      placeholder="Seleccionar paciente..."
                      className="w-100"
                    />
                    {pacSel && (pacSel.telefono || pacSel.email || pacSel.obraSocial) && (
                      <div className="turno-contacto">
                        {pacSel.telefono && <span><Phone size={13} /> {pacSel.telefono}</span>}
                        {pacSel.email && <span><Mail size={13} /> {pacSel.email}</span>}
                        {pacSel.obraSocial && <span className="turno-contacto__os">{pacSel.obraSocial}{pacSel.afiliado ? ` · ${pacSel.afiliado}` : ''}</span>}
                      </div>
                    )}
                    {pacSel && (
                      <Link to={`/pacientes/${pacSel.id}?tab=hc`} onClick={onClose}
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 mt-2">
                        <FileHeart size={14} /> Ver historia clínica
                      </Link>
                    )}
                  </>
                )}
              </div>
              <div className="col-12">
                <Form.Label>Profesional</Form.Label>
                <BuscadorSelect
                  value={form.profId}
                  onChange={(v) => onChange({ profId: v })}
                  disabled={bloquearProf}
                  opciones={profesionales.map((p) => ({ value: p.id, label: `${p.nombre} — ${p.especialidad}` }))}
                  placeholder="Seleccionar profesional..."
                  className="w-100"
                />
              </div>
              <div className="col-12">
                <Form.Label>Motivo</Form.Label>
                <Form.Control placeholder="Ej: Control, primera consulta..." value={form.motivo}
                  onChange={(e) => onChange({ motivo: e.target.value })} />
              </div>
            </div>

            {editando && (
              <div className="mt-3 pt-3 border-top">
                {confirm ? (
                  <div className="turno-confirm">
                    <span className="turno-confirm__msg">
                      {confirm === 'cancelar'
                        ? '¿Marcar este turno como cancelado? El horario queda libre para reprogramar.'
                        : '¿Eliminar este turno definitivamente? Esta acción no se puede deshacer.'}
                    </span>
                    <div className="d-flex gap-2 mt-2">
                      <Button size="sm" type="button" disabled={procesando}
                        variant={confirm === 'cancelar' ? 'warning' : 'danger'} onClick={ejecutar}>
                        {procesando ? 'Procesando…' : confirm === 'cancelar' ? 'Sí, cancelar turno' : 'Sí, eliminar'}
                      </Button>
                      <Button size="sm" variant="light" type="button" disabled={procesando} onClick={() => setConfirm(null)}>
                        No
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="turno-acciones">
                    <div className="turno-acciones__grupo">
                      <Button size="sm" variant="outline-primary" type="button" onClick={avanzar}>Avanzar estado</Button>
                      <Button
                        size="sm"
                        type="button"
                        variant={form.estado === 'ausente' ? 'outline-success' : 'outline-secondary'}
                        onClick={toggleAusente}
                      >
                        {form.estado === 'ausente' ? 'Reactivar' : 'Marcar ausente'}
                      </Button>
                    </div>
                    <div className="turno-acciones__grupo">
                      {form.estado !== 'cancelado' && (
                        <Button size="sm" variant="outline-warning" type="button" onClick={() => setConfirm('cancelar')}>
                          Cancelar turno
                        </Button>
                      )}
                      <Button size="sm" variant="outline-danger" type="button" onClick={() => setConfirm('eliminar')}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={onClose}>Cerrar</Button>
            <Button type="submit" disabled={guardando || procesando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agendar turno'}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  )
}
