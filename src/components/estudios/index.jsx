import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { UploadCloud, FolderOpen, User, Eye, Download, Trash2, Paperclip } from 'lucide-react'
import { Badge, EmptyState } from '../ui'
import { estudiosApi } from '../../lib/api'
import { hoyISO } from '../../lib/fecha'
import { nombreCompleto } from '../../data/mock'
import {
  TIPOS_ESTUDIO, ACCEPT_ESTUDIO, MAX_MB_ESTUDIO, errorArchivo, esVisible, tamanoHumano,
} from '../../lib/estudios'

// Pantalla de carga que se muestra en la pestaña nueva mientras se baja el archivo
// (ver). Es un documento autónomo (no accede al CSS de la app), así que los colores
// replican los tokens del tema de index.css (--soft/--brand/--ink/--muted + dark).
const CARGANDO_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Cargando…</title><style>
html,body{height:100%;margin:0}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f1f5fa;color:#1e2a3a}
.sp{width:42px;height:42px;border:4px solid #e6ecf3;border-top-color:#2567b0;border-radius:50%;animation:g .8s linear infinite}
@keyframes g{to{transform:rotate(360deg)}}
.t{font-size:15px;color:#64748b}
@media(prefers-color-scheme:dark){body{background:#0f1620;color:#e5eaf1}.sp{border-color:#2a3546;border-top-color:#2e9be0}.t{color:#94a3b4}}
</style></head><body><div class="sp"></div><div class="t">Cargando archivo…</div></body></html>`

/** Carga de estudios de un paciente: categoría + fecha (+ evolución opcional) y
 *  los archivos por arrastre o selección. `onSubido(estudios)` recibe los nuevos. */
export function CargaEstudio({ pacienteId, evoluciones = [], profId, onSubido }) {
  const [tipo, setTipo] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [evolucionId, setEvolucionId] = useState('')
  const [drag, setDrag] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const listo = !!pacienteId && !!tipo && !subiendo

  const subir = async (fileList) => {
    setError(null)
    const archivos = Array.from(fileList)
    const invalido = archivos.map(errorArchivo).find(Boolean)
    if (invalido) { setError(invalido); return }
    setSubiendo(true)
    const nuevos = []
    try {
      for (const archivo of archivos) {
        const fd = new FormData()
        fd.append('archivo', archivo)
        fd.append('pacienteId', pacienteId)
        fd.append('tipo', tipo)
        fd.append('fecha', fecha)
        if (evolucionId) fd.append('evolucionId', evolucionId)
        if (profId) fd.append('profId', profId)
        nuevos.push(await estudiosApi.upload(fd))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
      if (nuevos.length) onSubido(nuevos)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (listo && e.dataTransfer.files?.length) subir(e.dataTransfer.files)
  }

  return (
    <>
      {error && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}
      <div className="row g-3 mb-3">
        <div className="col-sm-7">
          <Form.Label>Tipo de estudio *</Form.Label>
          <Form.Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Seleccionar...</option>
            {TIPOS_ESTUDIO.map((t) => <option key={t}>{t}</option>)}
          </Form.Select>
        </div>
        <div className="col-sm-5">
          <Form.Label>Fecha del estudio</Form.Label>
          <Form.Control type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {evoluciones.length > 0 && (
          <div className="col-12">
            <Form.Label>Adjuntar a una evolución <span className="text-muted small">(opcional)</span></Form.Label>
            <Form.Select value={evolucionId} onChange={(e) => setEvolucionId(e.target.value)}>
              <option value="">Sin adjuntar</option>
              {evoluciones.map((ev) => <option key={ev.id} value={ev.id}>{ev.fecha} — {ev.motivo}</option>)}
            </Form.Select>
          </div>
        )}
      </div>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        style={listo ? undefined : { opacity: 0.6, cursor: 'not-allowed' }}
        onClick={() => listo && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(listo) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <UploadCloud size={38} />
        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>
          {subiendo ? 'Subiendo…' : 'Arrastrá archivos aquí'}
        </div>
        <div className="small">
          {!pacienteId ? 'Primero elegí el paciente.'
            : !tipo ? 'Primero elegí el tipo de estudio.'
            : `o hacé clic para seleccionar · PDF, imágenes, DICOM, Word, Excel · máx. ${MAX_MB_ESTUDIO} MB`}
        </div>
        <input ref={inputRef} type="file" multiple hidden accept={ACCEPT_ESTUDIO}
          onChange={(e) => e.target.files?.length && subir(e.target.files)} />
      </div>
    </>
  )
}

/** Listado de estudios con ver / descargar / eliminar. `mostrarPaciente` agrega
 *  el chip con el paciente (módulo Estudios); en la ficha no hace falta. */
export function ListaEstudios({ estudios, mostrarPaciente = false, onEliminado, vacio }) {
  const [aBorrar, setABorrar] = useState(null)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState(null)
  const [accion, setAccion] = useState(null) // id del estudio que se está abriendo/descargando

  // Ver: trae el archivo por fetch autenticado y lo abre como blob (mismo origen).
  // Se abre la pestaña SINCRÓNICAMENTE (dentro del click) para que el navegador no
  // la bloquee como popup, y recién después se le carga el blob.
  const ver = async (es) => {
    setError(null); setAccion(es.id)
    const win = window.open('', '_blank')
    // Pantalla de carga mientras baja el blob (si no, la pestaña queda en blanco
    // ~1s). Se reemplaza al setear win.location con la URL del blob.
    if (win) { win.document.write(CARGANDO_HTML); win.document.close() }
    try {
      const blob = await estudiosApi.archivoBlob(es.id)
      const url = URL.createObjectURL(blob)
      if (win) win.location = url
      else window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      if (win) win.close()
      setError(err.message)
    } finally {
      setAccion(null)
    }
  }

  const descargar = async (es) => {
    setError(null); setAccion(es.id)
    try {
      const blob = await estudiosApi.archivoBlob(es.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = es.nombre || 'estudio'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError(err.message)
    } finally {
      setAccion(null)
    }
  }

  const eliminar = async () => {
    setBorrando(true)
    setError(null)
    try {
      await estudiosApi.remove(aBorrar.id)
      onEliminado(aBorrar.id)
      setABorrar(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBorrando(false)
    }
  }

  if (estudios.length === 0) {
    return <EmptyState icon={FolderOpen} title="Sin estudios cargados">{vacio}</EmptyState>
  }

  return (
    <>
      {error && !aBorrar && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}
      {estudios.map((es) => (
        <div className="file-row" key={es.id}>
          <div className="file-icon">{(es.formato || 'file').toUpperCase().slice(0, 4)}</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontWeight: 500 }} className="text-truncate">{es.nombre}</div>
            <small className="text-muted">
              {es.tipo} · {tamanoHumano(es.tamano)} · {es.fecha}{es.profesional ? ` · ${es.profesional}` : ''}
            </small>
          </div>
          {es.evolucionId && <Badge tone="info"><Paperclip size={12} /> En evolución</Badge>}
          {mostrarPaciente && es.paciente && (
            <Link to={`/pacientes/${es.pacienteId}`} className="file-pac text-decoration-none">
              <User size={13} /> {nombreCompleto(es.paciente)}
            </Link>
          )}
          <div className="d-flex gap-1">
            {esVisible(es.formato) && (
              <Button size="sm" variant="outline-secondary" title="Ver" aria-label="Ver"
                disabled={accion === es.id} onClick={() => ver(es)}>
                <Eye size={15} />
              </Button>
            )}
            <Button size="sm" variant="outline-secondary" title="Descargar" aria-label="Descargar"
              disabled={accion === es.id} onClick={() => descargar(es)}>
              <Download size={15} />
            </Button>
            <Button size="sm" variant="outline-danger" title="Eliminar" aria-label="Eliminar"
              onClick={() => { setError(null); setABorrar(es) }}>
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      ))}

      <Modal show={!!aBorrar} onHide={() => setABorrar(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }}>Eliminar estudio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}
          Se va a eliminar el archivo:
          <div style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere', margin: '6px 0' }}>
            {aBorrar?.nombre}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setABorrar(null)}>Cancelar</Button>
          <Button variant="danger" disabled={borrando} onClick={eliminar}>
            {borrando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
