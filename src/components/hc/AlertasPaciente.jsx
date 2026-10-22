import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { alertasApi } from '../../lib/api'
import { ALERTAS_SUGERIDAS } from '../../data/hc/dashboard'

/* Alertas de CONDICIÓN del paciente (C3, spec §3.2): alergia, anticoagulación…
 * Siempre visibles en el encabezado de la ficha. Las marca un profesional y las
 * ven todos los que atienden al paciente (§27). La lista de §3.2 es una
 * sugerencia: se puede elegir una o escribir la propia. Auditadas (trg_audit).
 * `disponible=false` → el backend aún no tiene la ruta (antes del deploy v28):
 * no se muestra nada para no romper la ficha. */
export default function AlertasPaciente({ pacienteId, alertas, setAlertas, disponible }) {
  const [show, setShow] = useState(false)
  const [tipo, setTipo] = useState('')
  const [tipoOtro, setTipoOtro] = useState('')
  const [detalle, setDetalle] = useState('')
  const [err, setErr] = useState(null)
  const [guardando, setGuardando] = useState(false)
  if (!disponible) return null

  const activas = alertas.filter((a) => a.activo)
  const abrir = () => { setErr(null); setTipo(''); setTipoOtro(''); setDetalle(''); setShow(true) }
  const agregar = async (e) => {
    e.preventDefault()
    const t = tipo === 'Otra' ? tipoOtro.trim() : tipo
    if (!t) { setErr('Elegí o escribí el tipo de alerta.'); return }
    setGuardando(true); setErr(null)
    try {
      const nueva = await alertasApi.crearDePaciente(pacienteId, { tipo: t, detalle })
      setAlertas((l) => [...l, nueva])
      setTipo(''); setTipoOtro(''); setDetalle('')
    } catch (e2) { setErr(e2.message) } finally { setGuardando(false) }
  }
  const alternar = async (a) => {
    setErr(null)
    try {
      const upd = await alertasApi.editarDePaciente(a.id, { activo: !a.activo })
      setAlertas((l) => l.map((x) => (x.id === a.id ? upd : x)))
    } catch (e2) { setErr(e2.message) }
  }
  const eliminar = async (a) => {
    setErr(null)
    try {
      await alertasApi.eliminarDePaciente(a.id)
      setAlertas((l) => l.filter((x) => x.id !== a.id))
    } catch (e2) { setErr(e2.message) }
  }

  return (
    <>
      <div className="pac-alertas d-flex flex-wrap align-items-center gap-2 mt-3">
        {activas.length === 0 && <span className="text-muted small">Sin alertas clínicas marcadas.</span>}
        {activas.map((a) => (
          <span key={a.id} className="badge-p tone-danger" title={a.detalle || a.tipo}>
            <AlertTriangle size={12} /> {a.tipo}{a.detalle ? `: ${a.detalle}` : ''}
          </span>
        ))}
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={abrir}>
          {activas.length ? 'Gestionar alertas' : 'Marcar alerta'}
        </button>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }} className="d-flex align-items-center gap-2">
            <AlertTriangle size={18} /> Alertas clínicas del paciente
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2 px-3 small">{err}</Alert>}
          {alertas.length === 0 && <p className="text-muted small">Todavía no hay alertas marcadas.</p>}
          {alertas.map((a) => (
            <div key={a.id} className="d-flex align-items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--line)', opacity: a.activo ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-semibold">{a.tipo}</div>
                {a.detalle && <div className="small text-muted" style={{ overflowWrap: 'anywhere' }}>{a.detalle}</div>}
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => alternar(a)}>{a.activo ? 'Desactivar' : 'Reactivar'}</Button>
              <Button size="sm" variant="outline-danger" title="Eliminar" onClick={() => eliminar(a)}><Trash2 size={14} /></Button>
            </div>
          ))}
          <Form onSubmit={agregar} className="mt-3">
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Label className="small mb-1">Tipo</Form.Label>
                <Form.Select size="sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {ALERTAS_SUGERIDAS.map((t) => <option key={t}>{t}</option>)}
                  <option value="Otra">Otra…</option>
                </Form.Select>
              </div>
              {tipo === 'Otra' && (
                <div className="col-md-6">
                  <Form.Label className="small mb-1">Especificar</Form.Label>
                  <Form.Control size="sm" maxLength={60} value={tipoOtro} onChange={(e) => setTipoOtro(e.target.value)} />
                </div>
              )}
              <div className="col-12">
                <Form.Label className="small mb-1">Detalle <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Control size="sm" maxLength={300} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej: Penicilina — rash" />
              </div>
            </div>
            <Button type="submit" size="sm" className="mt-2 d-inline-flex align-items-center gap-1" disabled={guardando}>
              <Plus size={14} /> {guardando ? 'Agregando…' : 'Agregar alerta'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  )
}
