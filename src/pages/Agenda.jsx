import { useMemo, useState } from 'react'
import { Form, Button, Alert } from 'react-bootstrap'
import { Plus, ChevronLeft, ChevronRight, Users, X, CalendarRange, CalendarCheck, CalendarX } from 'lucide-react'
import { PageHeader, Card, Loader, ErrorState } from '../components/ui'
import BuscadorSelect from '../components/ui/BuscadorSelect'
import { useApi } from '../hooks/useApi'
import { usePref } from '../hooks/usePref'
import { useVista } from '../context/VistaContext'
import { turnosApi, profesionalesApi, pacientesApi, catalogosApi } from '../lib/api'
import { ESTADOS_TURNO, nombreCompleto } from '../data/mock'
import {
  hoyISO, sumarDias, sumarMeses, sumarAnios,
  inicioSemana, finSemana, inicioMes, finMes, inicioAnio, finAnio,
  diasEntre, fmtFechaLarga, fmtFechaCorta, fmtMesAnio,
} from '../lib/fecha'
import { CORTE_MANANA } from '../components/agenda/franjas'
import VistaDia from '../components/agenda/VistaDia'
import VistaSemana from '../components/agenda/VistaSemana'
import VistaMes from '../components/agenda/VistaMes'
import VistaAnio from '../components/agenda/VistaAnio'
import TurnoModal from '../components/agenda/TurnoModal'
import PacientePicker from '../components/agenda/PacientePicker'
import '../styles/agenda.css'

const EMPTY = []
const VISTAS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Año' },
]
// Datos iniciales de un paciente que se registra junto con su primer turno.
const PAC_VACIO = {
  apellido: '', nombre: '', dni: '', fechaNac: '', sexo: 'F',
  telefono: '', email: '', obraSocial: '', obraSocialOtra: '', afiliado: '',
}
// Filtro de ocupación de la grilla Día: qué profesionales (columnas) se muestran.
const OCUPACION = [
  { key: '', label: 'Todos los turnos', icon: CalendarRange },
  { key: 'con', label: 'Con turnos', icon: CalendarCheck },
  { key: 'sin', label: 'Sin turnos', icon: CalendarX },
]

export default function Agenda() {
  const { profId, esProfesional } = useVista()
  const [vista, setVista] = usePref('polaris:agenda-vista', 'dia')
  const [fecha, setFecha] = useState(hoyISO())
  const [profFiltro, setProfFiltro] = useState('')
  const [filtroEsp, setFiltroEsp] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pacFiltro, setPacFiltro] = useState('') // paciente elegido en el panel (submódulo)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filtroOcupacion, setFiltroOcupacion] = useState('') // '' | 'con' | 'sin' (columnas del Día)
  const [franja, setFranja] = useState('') // '' todos | 'manana' | 'tarde' — filtra turnos por horario
  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState(null)

  // Rango de fechas a consultar según la vista (para Mes/Año se pide el rango
  // visible completo, así los conteos de días vecinos son reales).
  const { desde, hasta } = useMemo(() => {
    if (vista === 'dia') return { desde: fecha, hasta: fecha }
    if (vista === 'semana') return { desde: inicioSemana(fecha), hasta: finSemana(fecha) }
    if (vista === 'mes') return { desde: inicioSemana(inicioMes(fecha)), hasta: finSemana(finMes(fecha)) }
    return { desde: inicioAnio(fecha), hasta: finAnio(fecha) }
  }, [vista, fecha])

  const { data, setData, loading, error, reload } = useApi(
    () => Promise.all([
      turnosApi.list({ desde, hasta, profesional: profId }),
      profesionalesApi.list(),
      pacientesApi.list(),
      catalogosApi.especialidades(),
      catalogosApi.obrasSociales(),
    ]).then(([turnos, profesionales, pacientes, esps, obras]) => ({
      turnos, profesionales, pacientes,
      especialidades: esps.map((e) => e.nombre),
      obras: obras.map((o) => o.nombre),
    })),
    [desde, hasta, profId],
  )

  const turnos = data?.turnos ?? EMPTY
  const profesionales = data?.profesionales ?? EMPTY
  const pacientes = data?.pacientes ?? EMPTY
  const especialidades = data?.especialidades ?? EMPTY
  const obras = data?.obras ?? EMPTY
  const pacById = useMemo(() => Object.fromEntries(pacientes.map((p) => [p.id, p])), [pacientes])
  const profById = useMemo(() => Object.fromEntries(profesionales.map((p) => [p.id, p])), [profesionales])

  // Filtros de cliente. El rango de fechas se re-filtra acá como red de seguridad:
  // así la vista es correcta aunque el backend aún no aplique desde/hasta (p. ej.
  // Edge Function todavía sin redeploy). El filtro por profId lo aplica el backend
  // en modo profesional.
  const turnosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return turnos.filter((t) => {
      if (!(t.fecha >= desde && t.fecha <= hasta)) return false
      if (filtroEsp && t.especialidad !== filtroEsp) return false
      if (!esProfesional && profFiltro && t.profId !== profFiltro) return false
      if (pacFiltro && t.pacienteId !== pacFiltro) return false
      if (filtroEstado && t.estado !== filtroEstado) return false
      if (franja) {
        // mañana = hora < 13; tarde = hora >= 13. parseInt tolera "9:30" y "09:30".
        const esManana = parseInt(t.hora, 10) < CORTE_MANANA
        if ((franja === 'manana') !== esManana) return false
      }
      if (q) {
        const p = pacById[t.pacienteId]
        const campos = [p?.nombre, p?.apellido, p?.dni, p?.telefono, p?.obraSocial]
          .filter(Boolean).join(' ').toLowerCase()
        if (!campos.includes(q)) return false
      }
      return true
    })
  }, [turnos, desde, hasta, filtroEsp, profFiltro, esProfesional, pacFiltro, filtroEstado, franja, busqueda, pacById])

  // Profesionales que tienen al menos un turno en el rango/filtros actuales.
  const profsConTurno = useMemo(() => new Set(turnosFiltrados.map((t) => t.profId)), [turnosFiltrados])

  // Profesionales visibles en la grilla del Día. El filtro de ocupación (todos /
  // con turnos / sin turnos) decide qué columnas se muestran.
  const profsDia = useMemo(() => {
    let base = esProfesional
      ? profesionales.filter((p) => p.id === profId)
      : (profFiltro ? profesionales.filter((p) => p.id === profFiltro) : profesionales)
    if (filtroOcupacion === 'con') base = base.filter((p) => profsConTurno.has(p.id))
    else if (filtroOcupacion === 'sin') base = base.filter((p) => !profsConTurno.has(p.id))
    return base
  }, [esProfesional, profesionales, profId, profFiltro, filtroOcupacion, profsConTurno])

  // Profesional de la vista Semana (una columna por día, un solo profesional).
  // Si el asistente no eligió uno, no se asume: VistaSemana muestra el aviso
  // "Elegí un profesional" (coherente con el placeholder del select).
  const profSemana = esProfesional
    ? profesionales.find((p) => p.id === profId) || null
    : (profFiltro ? profesionales.find((p) => p.id === profFiltro) || null : null)

  const diasSemana = useMemo(() => diasEntre(inicioSemana(fecha), finSemana(fecha)), [fecha])

  // Botón de ocupación (cicla todos → con turnos → sin turnos).
  const ocupActual = OCUPACION.find((o) => o.key === filtroOcupacion) || OCUPACION[0]
  const ciclarOcupacion = () => {
    const i = OCUPACION.findIndex((o) => o.key === filtroOcupacion)
    setFiltroOcupacion(OCUPACION[(i + 1) % OCUPACION.length].key)
  }

  // --- navegación de fecha ---
  const paso = (dir) => {
    if (vista === 'dia') setFecha((f) => sumarDias(f, dir))
    else if (vista === 'semana') setFecha((f) => sumarDias(f, dir * 7))
    else if (vista === 'mes') setFecha((f) => sumarMeses(f, dir))
    else setFecha((f) => sumarAnios(f, dir))
  }
  const etiqueta =
    vista === 'dia' ? fmtFechaLarga(fecha)
    : vista === 'semana' ? `${fmtFechaCorta(inicioSemana(fecha))} – ${fmtFechaCorta(finSemana(fecha))}`
    : vista === 'mes' ? fmtMesAnio(fecha)
    : fecha.slice(0, 4)

  // --- alta / edición ---
  const abrirNuevo = (preset = {}) => {
    setErrForm(null)
    setForm({
      id: null, estado: 'agendado', motivo: '', pacienteId: '',
      modoPac: 'existente', pac: { ...PAC_VACIO },
      profId: preset.profId || (esProfesional ? profId : (profFiltro || '')),
      fecha: preset.fecha || fecha,
      hora: preset.hora || '',
    })
  }
  const abrirEditar = (t) => {
    setErrForm(null)
    setForm({
      id: t.id, fecha: t.fecha, hora: t.hora, pacienteId: t.pacienteId, profId: t.profId,
      motivo: t.motivo || '', estado: t.estado, modoPac: 'existente', pac: { ...PAC_VACIO },
    })
  }
  const onChange = (patch) => setForm((f) => ({ ...f, ...patch }))
  const onChangePac = (patch) => setForm((f) => ({ ...f, pac: { ...f.pac, ...patch } }))

  const guardar = async (e) => {
    e.preventDefault()
    setErrForm(null)
    // Validación propia (los selects de paciente/profesional ahora son buscadores,
    // sin `required` nativo). Fecha/hora y el alta de paciente nuevo siguen con required.
    if (!form.profId) { setErrForm('Seleccioná el profesional.'); return }
    if (form.modoPac !== 'nuevo' && !form.pacienteId) { setErrForm('Seleccioná el paciente.'); return }
    setGuardando(true)
    try {
      // Alta de paciente nuevo junto con su primer turno (queda registrado y
      // trazable para la futura historia clínica; usa el mismo /pacientes).
      let pacienteId = form.pacienteId
      if (!form.id && form.modoPac === 'nuevo') {
        const { obraSocialOtra, ...restoPac } = form.pac
        const obraSocial = form.pac.obraSocial === 'Otros' ? obraSocialOtra.trim() : form.pac.obraSocial
        // Queda asignado al profesional del turno (si no, nadie lo "tiene" como propio).
        const nuevoPac = await pacientesApi.create({ ...restoPac, obraSocial, profesionalAsignado: form.profId })
        setData((d) => ({ ...d, pacientes: [nuevoPac, ...d.pacientes] }))
        pacienteId = nuevoPac.id
      }
      const body = { fecha: form.fecha, hora: form.hora, pacienteId, profId: form.profId, motivo: form.motivo, estado: form.estado }
      const saved = form.id ? await turnosApi.update(form.id, body) : await turnosApi.create(body)
      setData((d) => {
        const dentro = saved.fecha >= desde && saved.fecha <= hasta
        const resto = d.turnos.filter((t) => t.id !== saved.id)
        return { ...d, turnos: dentro ? [...resto, saved] : resto }
      })
      setForm(null)
    } catch (err) {
      setErrForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Cancelar = soft (estado 'cancelado', el turno queda visible). Relanza el error
  // para que el modal reponga sus botones; el mensaje se muestra vía errForm.
  const cancelarActual = async () => {
    setErrForm(null)
    try {
      const saved = await turnosApi.update(form.id, { estado: 'cancelado' })
      setData((d) => {
        const dentro = saved.fecha >= desde && saved.fecha <= hasta
        const resto = d.turnos.filter((t) => t.id !== saved.id)
        return { ...d, turnos: dentro ? [...resto, saved] : resto }
      })
      setForm(null)
    } catch (err) { setErrForm(err.message); throw err }
  }

  // Eliminar = borrado real (queda en auditoría por trigger).
  const eliminarActual = async () => {
    setErrForm(null)
    const id = form.id
    try {
      await turnosApi.remove(id)
      setData((d) => ({ ...d, turnos: d.turnos.filter((t) => t.id !== id) }))
      setForm(null)
    } catch (err) { setErrForm(err.message); throw err }
  }

  const irADia = (iso) => { setFecha(iso); setVista('dia') }
  const irAMes = (iso) => { setFecha(iso); setVista('mes') }

  const hoy = hoyISO()

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Turnos y ocupación por profesional"
        actions={
          <Button className="d-inline-flex align-items-center gap-2" onClick={() => abrirNuevo()} disabled={loading || !!error}>
            <Plus size={18} /> Nuevo turno
          </Button>
        }
      />

      {/* Barra de control: vista + navegación (fila 1) y filtros (fila 2) */}
      <div className="agenda-toolbar">
        <div className="agenda-toolbar__row">
          <div className="agenda-switch" role="tablist" aria-label="Vista de agenda">
            {VISTAS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`agenda-switch__btn ${vista === v.key ? 'is-active' : ''}`}
                onClick={() => setVista(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="agenda-nav">
            <button type="button" className="agenda-nav__arrow" onClick={() => paso(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <button type="button" className="agenda-nav__hoy" onClick={() => setFecha(hoyISO())}>Hoy</button>
            <button type="button" className="agenda-nav__arrow" onClick={() => paso(1)} aria-label="Siguiente"><ChevronRight size={18} /></button>
            <span className="agenda-nav__label" style={{ textTransform: 'capitalize' }}>{etiqueta}</span>
          </div>
        </div>

        <div className="agenda-filtros">
          <Form.Control
            type="search"
            placeholder="Buscar paciente, DNI, teléfono…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="agenda-filtros__search"
          />
          <Form.Control type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoyISO())} className="agenda-filtros__date" />
          {!esProfesional && (
            <BuscadorSelect
              value={profFiltro}
              onChange={setProfFiltro}
              opciones={profesionales.map((p) => ({ value: p.id, label: p.nombre }))}
              placeholder="Todos los profesionales"
              disabled={!!error}
            />
          )}
          {/* Filtro por paciente: abre el panel (submódulo) para explorar todos */}
          <div className="agenda-pacfiltro-wrap">
            <button
              type="button"
              className={`agenda-pacfiltro ${pacFiltro ? 'is-active' : ''}`}
              onClick={() => setPickerOpen(true)}
              disabled={loading || !!error}
              title="Filtrar por paciente"
            >
              <Users size={15} />
              <span>{pacFiltro ? nombreCompleto(pacById[pacFiltro]) : 'Todos los pacientes'}</span>
            </button>
            {pacFiltro && (
              <button
                type="button"
                className="agenda-pacfiltro__clear"
                onClick={() => setPacFiltro('')}
                aria-label="Quitar filtro de paciente"
              >
                <X size={15} />
              </button>
            )}
          </div>
          {/* Ocupación (solo Día): cicla todos / con turnos / sin turnos */}
          {vista === 'dia' && !esProfesional && (
            <button
              type="button"
              className={`agenda-ocup ${filtroOcupacion ? 'is-active' : ''}`}
              onClick={ciclarOcupacion}
              title="Profesionales a mostrar: todos / con turnos / sin turnos (clic para alternar)"
            >
              <ocupActual.icon size={15} />
              <span>{ocupActual.label}</span>
            </button>
          )}
          {/* Franja horaria: todo el día / mañana / tarde (filtra los turnos visibles). */}
          <Form.Select
            value={franja}
            onChange={(e) => setFranja(e.target.value)}
            title="Filtrar turnos por franja horaria"
          >
            <option value="">Todo el día</option>
            <option value="manana">Turnos de la mañana</option>
            <option value="tarde">Turnos de la tarde</option>
          </Form.Select>
          <Form.Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_TURNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Form.Select>
          {vista !== 'semana' && (
            <BuscadorSelect
              value={filtroEsp}
              onChange={setFiltroEsp}
              opciones={especialidades}
              placeholder="Todas las especialidades"
            />
          )}
        </div>
      </div>

      {errForm && !form && <Alert variant="danger" className="py-2 px-3 small" dismissible onClose={() => setErrForm(null)}>{errForm}</Alert>}

      {loading ? (
        <Card><Loader label="Cargando agenda…" /></Card>
      ) : error ? (
        <Card><ErrorState onRetry={reload}>{error}</ErrorState></Card>
      ) : vista === 'dia' ? (
        <VistaDia turnos={turnosFiltrados} profs={profsDia} pacById={pacById} fecha={fecha} franja={franja} onEditar={abrirEditar} onNuevo={abrirNuevo} />
      ) : vista === 'semana' ? (
        <VistaSemana turnos={turnosFiltrados} prof={profSemana} profById={profById} dias={diasSemana} pacById={pacById} hoy={hoy} franja={franja} onEditar={abrirEditar} onNuevo={abrirNuevo} />
      ) : vista === 'mes' ? (
        <VistaMes turnos={turnosFiltrados} fecha={fecha} hoy={hoy} onDiaClick={irADia} />
      ) : (
        <VistaAnio turnos={turnosFiltrados} fecha={fecha} hoy={hoy} onMesClick={irAMes} />
      )}

      <TurnoModal
        form={form}
        onChange={onChange}
        onChangePac={onChangePac}
        onClose={() => setForm(null)}
        onSubmit={guardar}
        guardando={guardando}
        error={errForm}
        pacientes={pacientes}
        profesionales={profesionales}
        obras={obras}
        bloquearProf={esProfesional}
        onCancelar={cancelarActual}
        onEliminar={eliminarActual}
      />

      <PacientePicker
        show={pickerOpen}
        onHide={() => setPickerOpen(false)}
        pacientes={pacientes}
        obras={obras}
        seleccionado={pacFiltro}
        onSelect={setPacFiltro}
      />
    </>
  )
}
