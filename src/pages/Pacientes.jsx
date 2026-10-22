import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react'
import { PageHeader, Card, Avatar, EmptyState, Loader, ErrorState } from '../components/ui'
import BuscadorSelect from '../components/ui/BuscadorSelect'
import { useApi } from '../hooks/useApi'
import { useVista } from '../context/VistaContext'
import { pacientesApi, catalogosApi, profesionalesApi } from '../lib/api'
import { soloDigitos, formatearDni } from '../lib/dni'
import { nombreCompleto } from '../data/mock'

const VACIO = {
  apellido: '', nombre: '', dni: '', fechaNac: '', sexo: 'F',
  telefono: '', email: '', obraSocial: '', obraSocialOtra: '', afiliado: '', derivacion: '',
  profesionalAsignado: '',
}
const EMPTY = [] // referencia estable para dependencias de useMemo

export default function Pacientes() {
  const nav = useNavigate()
  const { profId, esProfesional } = useVista()
  const [q, setQ] = useState('')
  const [fProf, setFProf] = useState('') // filtro por profesional (vínculo real)
  const [fObra, setFObra] = useState('') // filtro por obra social
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [editId, setEditId] = useState(null)   // id del paciente en edición (o null = nuevo)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState(null)
  const [aBorrar, setABorrar] = useState(null) // paciente pendiente de baja (o null)
  const [borrando, setBorrando] = useState(false)
  const [errBorrar, setErrBorrar] = useState(null)

  // Catálogos (una sola vez): obras sociales + profesionales.
  const cat = useApi(
    () => Promise.all([catalogosApi.obrasSociales(), profesionalesApi.list()])
      .then(([obras, profesionales]) => ({ obras: obras.map((o) => o.nombre), profesionales })),
    [],
  )

  // Pacientes: se recargan DEL SERVIDOR al cambiar el profesional filtrado (o la
  // vista). El backend resuelve el vínculo real (dueño ∪ agenda ∪ evolución), así
  // "filtrar por profesional" trae lo MISMO que ese profesional ve y que la agenda
  // (no solo los que tiene asignados como dueño). El texto y la obra se filtran
  // después en el cliente sobre ese conjunto.
  const { data: pacientesData, setData: setPacientes, loading, error, reload } = useApi(
    () => pacientesApi.list({ profesional: profId || fProf }),
    [profId, fProf],
  )

  const lista = pacientesData ?? EMPTY
  const obras = cat.data?.obras ?? EMPTY
  const profesionales = cat.data?.profesionales ?? EMPTY
  const profById = useMemo(() => Object.fromEntries(profesionales.map((p) => [p.id, p])), [profesionales])

  // Nombres de los profesionales vinculados a un paciente (dueño ∪ agenda ∪
  // evolución), resueltos con el listado de profesionales. Es la MISMA relación
  // que usa el filtro, así lo que se ve coincide con lo que se filtra.
  const profsDe = (p) => {
    const ids = p.profIds?.length ? p.profIds : (p.profId ? [p.profId] : [])
    return ids.map((id) => profById[id]?.nombre).filter(Boolean)
  }

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase()
    const sDni = soloDigitos(s)
    return lista.filter((p) => {
      // El profesional ya se filtró en el servidor (vínculo real). Acá queda el
      // filtro por obra social + la búsqueda por texto sobre ese conjunto.
      if (fObra && p.obraSocial !== fObra) return false
      if (!s) return true
      return `${p.apellido} ${p.nombre}`.toLowerCase().includes(s)
        || (sDni && soloDigitos(p.dni).includes(sDni))
        || (p.obraSocial || '').toLowerCase().includes(s)
    })
  }, [lista, q, fObra])

  const abrirNuevo = () => { setErrForm(null); setEditId(null); setForm(VACIO); setShow(true) }
  const abrirEditar = (p) => {
    setErrForm(null); setEditId(p.id)
    const enLista = obras.includes(p.obraSocial)
    setForm({
      apellido: p.apellido || '', nombre: p.nombre || '', dni: p.dni || '',
      fechaNac: p.fechaNac || '', sexo: p.sexo || 'F',
      telefono: p.telefono || '', email: p.email || '',
      obraSocial: p.obraSocial ? (enLista ? p.obraSocial : 'Otros') : '',
      obraSocialOtra: p.obraSocial && !enLista ? p.obraSocial : '',
      afiliado: p.afiliado || '', derivacion: p.derivacion || '',
      profesionalAsignado: p.profId || '',
    })
    setShow(true)
  }

  const eliminar = async () => {
    setBorrando(true); setErrBorrar(null)
    try {
      await pacientesApi.remove(aBorrar.id)
      setPacientes((arr) => (arr ?? []).filter((p) => p.id !== aBorrar.id))
      setABorrar(null)
    } catch (err) {
      setErrBorrar(err.message)
    } finally {
      setBorrando(false)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setErrForm(null)
    const { obraSocialOtra, ...resto } = form
    const obraSocial = form.obraSocial === 'Otros' ? obraSocialOtra.trim() : form.obraSocial
    const dni = soloDigitos(form.dni)
    if (!dni) { setErrForm('El DNI debe contener números.'); return }
    // Aviso instantáneo (la garantía real es el backend + índice único). Excluye al propio en edición.
    const dup = lista.find((p) => soloDigitos(p.dni) === dni && p.id !== editId)
    if (dup) { setErrForm(`Ya existe un paciente con ese DNI: ${dup.apellido}, ${dup.nombre}.`); return }
    // Si estoy en vista de profesional (rol profesional o 'dios' en su vista de
    // médico), el paciente queda a mi nombre; si no, se usa el asignado en el alta.
    const profesionalAsignado = esProfesional ? (profId || '') : form.profesionalAsignado
    setGuardando(true)
    try {
      if (editId) {
        const upd = await pacientesApi.update(editId, { ...resto, dni, obraSocial, profesionalAsignado })
        setPacientes((arr) => (arr ?? []).map((p) => (p.id === editId ? upd : p)))
      } else {
        const nuevo = await pacientesApi.create({ ...resto, dni, obraSocial, profesionalAsignado })
        setPacientes((arr) => [nuevo, ...(arr ?? [])])
      }
      setShow(false); setForm(VACIO); setEditId(null)
    } catch (err) {
      setErrForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={loading ? 'Cargando…' : `${lista.length} pacientes registrados`}
        actions={
          <Button className="d-inline-flex align-items-center gap-2" onClick={abrirNuevo} disabled={loading || !!error}>
            <Plus size={18} /> Nuevo paciente
          </Button>
        }
      />

      {cat.loading ? (
        <Card><Loader label="Cargando…" /></Card>
      ) : (
        <>
          <div className="filter-bar">
            <div className="topbar__search" style={{ maxWidth: 360 }}>
              <Search size={17} />
              <input
                placeholder="Buscar por nombre, DNI u obra social..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {!esProfesional && (
              <BuscadorSelect
                value={fProf}
                onChange={setFProf}
                opciones={profesionales.map((p) => ({ value: p.id, label: p.nombre }))}
                placeholder="Todos los profesionales"
              />
            )}
            <BuscadorSelect
              value={fObra}
              onChange={setFObra}
              opciones={obras}
              placeholder="Todas las obras sociales"
            />
          </div>

          <Card bodyClass="p-0">
            {loading ? (
              <Loader label="Cargando pacientes…" />
            ) : error ? (
              <ErrorState onRetry={reload}>{error}</ErrorState>
            ) : filtrados.length === 0 ? (
              <EmptyState icon={Users} title="Sin resultados">
                {q ? <>No se encontraron pacientes con “{q}”.</>
                  : fProf ? 'Este profesional no tiene pacientes agendados ni atendidos.'
                  : 'Aún no hay pacientes cargados.'}
              </EmptyState>
            ) : (
              <div className="table-scroll">
              <table className="table-p">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>DNI</th>
                    <th>Edad</th>
                    <th>Obra Social</th>
                    <th>Profesional</th>
                    <th>Derivación</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => {
                    const profs = profsDe(p)
                    return (
                    <tr key={p.id} className="clickable" onClick={() => nav(`/pacientes/${p.id}`)}>
                      <td>
                        <div className="pac-cell">
                          <Avatar {...p} />
                          <div>
                            {nombreCompleto(p)}
                            <small>{p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : 'Otro'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{formatearDni(p.dni)}</td>
                      <td>{p.edad != null ? `${p.edad} años` : '—'}</td>
                      <td>{p.obraSocial || '—'}</td>
                      <td>
                        {profs.length
                          ? <>{profs[0]}{profs.length > 1 && <span className="text-muted small"> +{profs.length - 1}</span>}</>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-muted">{p.derivacion || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="d-inline-flex gap-1">
                          <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
                            onClick={() => abrirEditar(p)} title="Editar datos del paciente">
                            <Pencil size={14} /> Editar
                          </Button>
                          <Button size="sm" variant="outline-danger" className="d-inline-flex align-items-center"
                            onClick={() => { setErrBorrar(null); setABorrar(p) }} title="Eliminar paciente" aria-label="Eliminar paciente">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Modal alta paciente */}
      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Form onSubmit={guardar}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>{editId ? 'Editar paciente' : 'Nuevo paciente'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errForm && <Alert variant="danger" className="py-2 px-3 small">{errForm}</Alert>}
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label>Apellido</Form.Label>
                <Form.Control required value={form.apellido}
                  onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nombre</Form.Label>
                <Form.Control required value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>DNI</Form.Label>
                <Form.Control required inputMode="numeric" placeholder="Solo números" value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: soloDigitos(e.target.value) })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Fecha de nacimiento</Form.Label>
                <Form.Control type="date" value={form.fechaNac}
                  onChange={(e) => setForm({ ...form, fechaNac: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Sexo</Form.Label>
                <Form.Select value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                  <option value="X">Otro</option>
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Obra Social</Form.Label>
                <Form.Select value={form.obraSocial}
                  onChange={(e) => setForm({ ...form, obraSocial: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {obras.map((o) => <option key={o}>{o}</option>)}
                  <option value="Otros">Otros</option>
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Nº Afiliado</Form.Label>
                <Form.Control value={form.afiliado}
                  onChange={(e) => setForm({ ...form, afiliado: e.target.value })} />
              </div>
              {form.obraSocial === 'Otros' && (
                <div className="col-12">
                  <Form.Label>Especificar obra social</Form.Label>
                  <Form.Control required autoFocus placeholder="Nombre de la obra social / prepaga"
                    value={form.obraSocialOtra}
                    onChange={(e) => setForm({ ...form, obraSocialOtra: e.target.value })} />
                </div>
              )}
              <div className="col-12">
                <Form.Label>Derivación</Form.Label>
                <Form.Control placeholder="Profesional o motivo de derivación" value={form.derivacion}
                  onChange={(e) => setForm({ ...form, derivacion: e.target.value })} />
              </div>
              {esProfesional ? (
                !editId && (
                  <div className="col-12">
                    <div className="text-muted small">Este paciente quedará asignado a tu perfil profesional.</div>
                  </div>
                )
              ) : (
                <div className="col-md-6">
                  <Form.Label>Profesional asignado <span className="text-muted small">(opcional)</span></Form.Label>
                  <Form.Select value={form.profesionalAsignado}
                    onChange={(e) => setForm({ ...form, profesionalAsignado: e.target.value })}>
                    <option value="">Genérico (sin asignar)</option>
                    {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.especialidad}</option>)}
                  </Form.Select>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => { setShow(false); setEditId(null) }}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Registrar paciente'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirmar baja (soft-delete) del paciente */}
      <Modal show={!!aBorrar} onHide={() => setABorrar(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }}>Eliminar paciente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errBorrar && <Alert variant="danger" className="py-2 px-3 small">{errBorrar}</Alert>}
          Se va a eliminar a <strong>{aBorrar ? nombreCompleto(aBorrar) : ''}</strong>
          {aBorrar?.dni ? <> (DNI {formatearDni(aBorrar.dni)})</> : ''} del listado de pacientes.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setABorrar(null)}>Cancelar</Button>
          <Button variant="danger" disabled={borrando} onClick={eliminar}>
            {borrando ? 'Eliminando…' : 'Eliminar paciente'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
