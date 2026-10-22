import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { BellRing } from 'lucide-react'
import { alertasApi } from '../../lib/api'
import { META_VARIABLE, metaDe, textoReferencia } from '../../data/hc/variables'

/* Pauta de alerta sobre una variable (C3). La define cada profesional:
 *  - rol profesional: regla PERSONAL o de SU especialidad (la API lo hace cumplir);
 *  - administrador / dios: además eligen a qué profesional o especialidad aplica;
 *  - asistente: no pauta alertas (solo las ve) → este modal no se le ofrece.
 * Si ya hay una regla para la variable en ese ámbito, se EDITA (no se duplica).
 * Las alertas son orientativas: nunca bloquean el registro ni diagnostican. */

const canon = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const numOrNull = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')))

export default function ReglaAlertaModal({
  show, onHide, variable: variableFija, reglas, rol, profesional, especialidades = [], profesionales = [], onCambio,
  inicial = null, // { ambito, especialidad, profId } → abre en ese ámbito (editar una regla de la lista)
}) {
  const esGestor = rol === 'administrador' || rol === 'dios'
  const [variable, setVariable] = useState('')
  const [ambito, setAmbito] = useState('profesional')
  const [espSel, setEspSel] = useState('')
  const [profSel, setProfSel] = useState('')
  const [minimo, setMinimo] = useState('')
  const [maximo, setMaximo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [activo, setActivo] = useState(true)
  const [err, setErr] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!show) return
    setErr(null)
    setVariable(variableFija || '')
    setAmbito(inicial?.ambito || (profesional ? 'profesional' : 'especialidad'))
    setEspSel(inicial?.especialidad ?? profesional?.especialidad ?? '')
    setProfSel(inicial?.profId ?? profesional?.id ?? '')
  }, [show, variableFija, profesional, inicial])

  // Destino efectivo del ámbito (para un profesional, siempre él / su especialidad).
  const destinoProf = esGestor ? profSel : profesional?.id
  const destinoEsp = esGestor ? espSel : profesional?.especialidad

  // Regla existente para esa variable en ese ámbito → se edita.
  const existente = useMemo(() => (reglas || []).find((r) => r.variable === variable && (
    ambito === 'profesional'
      ? r.ambito === 'profesional' && r.profId === destinoProf
      : r.ambito === 'especialidad' && canon(r.especialidad) === canon(destinoEsp)
  )), [reglas, variable, ambito, destinoProf, destinoEsp])

  useEffect(() => {
    if (!show) return
    setMinimo(existente?.minimo ?? '')
    setMaximo(existente?.maximo ?? '')
    setMensaje(existente?.mensaje ?? '')
    setActivo(existente ? existente.activo : true)
  }, [show, existente])

  const meta = variable ? metaDe(variable) : null
  const guardar = async (e) => {
    e.preventDefault()
    setErr(null)
    const min = numOrNull(minimo)
    const max = numOrNull(maximo)
    if (!variable) { setErr('Elegí la variable.'); return }
    if ((min != null && Number.isNaN(min)) || (max != null && Number.isNaN(max))) { setErr('Los umbrales deben ser números.'); return }
    if (min == null && max == null) { setErr('Indicá un mínimo o un máximo.'); return }
    if (min != null && max != null && min > max) { setErr('El mínimo no puede ser mayor que el máximo.'); return }
    if (ambito === 'profesional' && !destinoProf) { setErr('Elegí el profesional.'); return }
    if (ambito === 'especialidad' && !destinoEsp) { setErr('Elegí la especialidad.'); return }
    setGuardando(true)
    try {
      const r = existente
        ? await alertasApi.editarRegla(existente.id, { minimo: min, maximo: max, mensaje, activo })
        : await alertasApi.crearRegla({
          variable, ambito, minimo: min, maximo: max, mensaje, activo,
          ...(ambito === 'profesional' ? { profId: destinoProf } : { especialidad: destinoEsp }),
        })
      onCambio?.((lista) => (existente ? lista.map((x) => (x.id === r.id ? r : x)) : [...lista, r]))
      onHide()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setGuardando(false)
    }
  }
  const eliminar = async () => {
    if (!existente) return
    setGuardando(true); setErr(null)
    try {
      await alertasApi.eliminarRegla(existente.id)
      onCambio?.((lista) => lista.filter((x) => x.id !== existente.id))
      onHide()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={guardar}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }} className="d-flex align-items-center gap-2">
            <BellRing size={18} /> {existente ? 'Editar alerta' : 'Pautar alerta'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="py-2 px-3 small">{err}</Alert>}
          <div className="row g-3">
            <div className="col-12">
              <Form.Label>Variable</Form.Label>
              {variableFija ? (
                <div className="fw-semibold">{meta?.label}{meta?.unidad ? ` (${meta.unidad})` : ''}</div>
              ) : (
                <Form.Select value={variable} onChange={(e) => setVariable(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {Object.entries(META_VARIABLE).map(([k, m]) => <option key={k} value={k}>{m.label}{m.unidad ? ` (${m.unidad})` : ''}</option>)}
                </Form.Select>
              )}
            </div>
            <div className="col-12">
              <Form.Label>Aplica a</Form.Label>
              <Form.Select value={ambito} onChange={(e) => setAmbito(e.target.value)}>
                {(esGestor || profesional) && <option value="profesional">{esGestor ? 'Un profesional' : 'Solo a mí (personal)'}</option>}
                <option value="especialidad">{esGestor ? 'Una especialidad (compartida)' : `Mi especialidad${profesional?.especialidad ? ` (${profesional.especialidad})` : ''}`}</option>
              </Form.Select>
            </div>
            {esGestor && ambito === 'profesional' && (
              <div className="col-12">
                <Form.Label>Profesional</Form.Label>
                <Form.Select value={profSel} onChange={(e) => setProfSel(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.especialidad}</option>)}
                </Form.Select>
              </div>
            )}
            {esGestor && ambito === 'especialidad' && (
              <div className="col-12">
                <Form.Label>Especialidad</Form.Label>
                <Form.Select value={espSel} onChange={(e) => setEspSel(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {especialidades.map((n) => <option key={n}>{n}</option>)}
                </Form.Select>
              </div>
            )}
            <div className="col-6">
              <Form.Label>Mínimo {meta?.unidad && <span className="text-muted small">({meta.unidad})</span>}</Form.Label>
              <Form.Control inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Sin mínimo" />
            </div>
            <div className="col-6">
              <Form.Label>Máximo {meta?.unidad && <span className="text-muted small">({meta.unidad})</span>}</Form.Label>
              <Form.Control inputMode="decimal" value={maximo} onChange={(e) => setMaximo(e.target.value)} placeholder="Sin máximo" />
            </div>
            {variable && textoReferencia(variable) && (
              <div className="col-12 text-muted small">
                Referencia orientativa: {textoReferencia(variable)}.
                {META_VARIABLE[variable]?.rangoPorSexo && ' La alerta que pautes aplica a todos los pacientes; la referencia sí distingue por sexo.'}
              </div>
            )}
            <div className="col-12">
              <Form.Label>Mensaje <span className="text-muted small">(opcional, se muestra cuando se dispara)</span></Form.Label>
              <Form.Control maxLength={200} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: Revisar oxigenoterapia" />
            </div>
            {existente && (
              <div className="col-12">
                <Form.Check type="switch" id="regla-activa" label="Alerta activa" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              </div>
            )}
          </div>
          <div className="text-muted small mt-3">
            Las alertas son orientativas: marcan el valor, no bloquean ni reemplazan el criterio clínico. Quedan registradas en la auditoría.
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <div>{existente && <Button variant="outline-danger" type="button" disabled={guardando} onClick={eliminar}>Eliminar</Button>}</div>
          <div className="d-flex gap-2">
            <Button variant="light" type="button" onClick={onHide}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
