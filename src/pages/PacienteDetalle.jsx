import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import {
  ArrowLeft, Plus, FileHeart, FolderOpen, CalendarClock,
  IdCard, Stethoscope, Paperclip, Pencil, Trash2, Lock, Activity, LayoutDashboard,
} from 'lucide-react'
import { Card, Badge, Avatar, EmptyState, Loader, ErrorState } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { useVista } from '../context/VistaContext'
import { useAuth } from '../context/AuthContext'
import { pacientesApi, turnosApi, profesionalesApi, evolucionesApi, estudiosApi, catalogosApi, observacionesApi, alertasApi } from '../lib/api'
import { soloDigitos } from '../lib/dni'
import { nombreCompleto, ESTADOS_TURNO } from '../data/mock'
import { CARDIO_VACIO, construirPayloadCardio, cardioDesdeEvolucion } from '../data/hc/cardiologia'
import ConsultaCardiologia from '../components/hc/ConsultaCardiologia'
import { CLINICA_VACIO, construirPayloadClinica, clinicaDesdeEvolucion } from '../data/hc/clinica'
import ConsultaClinica from '../components/hc/ConsultaClinica'
import { PSICO_VACIO, construirPayloadPsico, psicoDesdeEvolucion } from '../data/hc/psicologia'
import ConsultaPsicologia from '../components/hc/ConsultaPsicologia'
import { NEUMO_VACIO, construirPayloadNeumo, neumoDesdeEvolucion } from '../data/hc/neumonologia'
import ConsultaNeumonologia from '../components/hc/ConsultaNeumonologia'
import { REUMA_VACIO, construirPayloadReuma, reumaDesdeEvolucion } from '../data/hc/reumatologia'
import ConsultaReumatologia from '../components/hc/ConsultaReumatologia'
import { INFECTO_VACIO, construirPayloadInfecto, infectoDesdeEvolucion } from '../data/hc/infectologia'
import ConsultaInfectologia from '../components/hc/ConsultaInfectologia'
import { NEURO_VACIO, construirPayloadNeuro, neuroDesdeEvolucion } from '../data/hc/neurologia'
import ConsultaNeurologia from '../components/hc/ConsultaNeurologia'
import { ENDO_VACIO, construirPayloadEndo, endoDesdeEvolucion } from '../data/hc/endocrino'
import ConsultaEndocrino from '../components/hc/ConsultaEndocrino'
import { TRAUMA_VACIO, construirPayloadTrauma, traumaDesdeEvolucion } from '../data/hc/traumatologia'
import ConsultaTraumatologia from '../components/hc/ConsultaTraumatologia'
import { ECO_VACIO, construirPayloadEco, ecoDesdeEvolucion } from '../data/hc/ecografia'
import ConsultaEcografia from '../components/hc/ConsultaEcografia'
import { PEDIA_VACIO, construirPayloadPedia, pediaDesdeEvolucion, pediaBaseDesde } from '../data/hc/pediatria'
import ConsultaPediatria from '../components/hc/ConsultaPediatria'
import { CX_VACIO, construirPayloadCx, cxDesdeEvolucion } from '../data/hc/cirugia'
import ConsultaCirugia from '../components/hc/ConsultaCirugia'
import { NUTRI_VACIO, construirPayloadNutri, nutriDesdeEvolucion } from '../data/hc/nutricion'
import ConsultaNutricion from '../components/hc/ConsultaNutricion'
import { GINE_VACIO, construirPayloadGine, gineDesdeEvolucion, formulaObstetrica } from '../data/hc/ginecologia'
import ConsultaGinecologia from '../components/hc/ConsultaGinecologia'
import { KINE_VACIO, construirPayloadKine, kineDesdeEvolucion } from '../data/hc/kinesiologia'
import ConsultaKinesiologia from '../components/hc/ConsultaKinesiologia'
import { PSQ_VACIO, construirPayloadPsq, psqDesdeEvolucion } from '../data/hc/psiquiatria'
import ConsultaPsiquiatria from '../components/hc/ConsultaPsiquiatria'
import { OFT_VACIO, construirPayloadOft, oftDesdeEvolucion } from '../data/hc/oftalmologia'
import ConsultaOftalmologia from '../components/hc/ConsultaOftalmologia'
import { CargaEstudio, ListaEstudios } from '../components/estudios'
import GraficoEvolucion from '../components/hc/GraficoEvolucion'
import { armarGraficos } from '../data/hc/variables'
import DashboardMedico from '../components/hc/DashboardMedico'
import AlertasPaciente from '../components/hc/AlertasPaciente'
import ReglaAlertaModal from '../components/hc/ReglaAlertaModal'
import { puedePautarAlertas, familiaDe } from '../data/hc/dashboard'

const TABS = [
  { id: 'datos', label: 'Datos generales', icon: IdCard },
  { id: 'hc', label: 'Evoluciones', icon: FileHeart },
  { id: 'estudios', label: 'Estudios', icon: FolderOpen },
  { id: 'turnos', label: 'Turnos', icon: CalendarClock },
]

// `tipo`: qué registra el profesional (consulta o derivación a otra especialidad).
const EV_VACIO = {
  profId: '', tipo: 'consulta', derivacionA: '', motivo: '',
  subjetivo: '', objetivo: '', diagnostico: '', plan: '', medicacion: '',
}
const EMPTY = [] // referencia estable para dependencias de useMemo

export default function PacienteDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const { profId, esProfesional, profesional: viewer } = useVista()
  const { user } = useAuth()

  // Alertas (C3): se cargan aparte y TOLERAN que el backend aún no tenga la ruta
  // (antes del deploy v28): en ese caso la ficha funciona igual, sin alertas.
  const cargarAlertas = () => Promise.all([
    alertasApi.dePaciente(id).then((a) => ({ ok: true, lista: a })).catch(() => ({ ok: false, lista: [] })),
    alertasApi.reglas().then((r) => ({ ok: true, lista: r })).catch(() => ({ ok: false, lista: [] })),
  ])
  const { data, setData, loading, error, reload } = useApi(
    () => Promise.all([
      pacientesApi.get(id), turnosApi.list({ paciente: id }),
      profesionalesApi.list(), evolucionesApi.list({ paciente: id }), catalogosApi.obrasSociales(),
      estudiosApi.list({ paciente: id }), observacionesApi.list({ paciente: id }), cargarAlertas(),
    ]).then(([paciente, turnos, profesionales, evoluciones, obras, estudios, observaciones, [alPac, reg]]) => ({
      paciente, turnos, profesionales, evoluciones, obras: obras.map((o) => o.nombre), estudios, observaciones,
      alertasPac: alPac.lista, reglas: reg.lista, alertasOk: alPac.ok && reg.ok,
    })),
    [id],
  )
  const setAlertasPac = (fn) => setData((d) => ({ ...d, alertasPac: fn(d.alertasPac) }))
  const setReglas = (fn) => setData((d) => ({ ...d, reglas: fn(d.reglas) }))
  const [reglaVar, setReglaVar] = useState(null) // variable cuya alerta se está pautando

  const [tab, setTab] = useState(searchParams.get('tab') === 'hc' ? 'hc' : 'datos')
  const [subHc, setSubHc] = useState('lista') // dentro de Evoluciones: 'lista' | 'resumen' | 'graficos'
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(EV_VACIO)
  const [cardio, setCardio] = useState(CARDIO_VACIO)
  const [clinica, setClinica] = useState(CLINICA_VACIO)
  const [psico, setPsico] = useState(PSICO_VACIO)
  const [neumo, setNeumo] = useState(NEUMO_VACIO)
  const [reuma, setReuma] = useState(REUMA_VACIO)
  const [infecto, setInfecto] = useState(INFECTO_VACIO)
  const [neuro, setNeuro] = useState(NEURO_VACIO)
  const [endo, setEndo] = useState(ENDO_VACIO)
  const [trauma, setTrauma] = useState(TRAUMA_VACIO)
  const [eco, setEco] = useState(ECO_VACIO)
  const [pedia, setPedia] = useState(PEDIA_VACIO)
  const [cx, setCx] = useState(CX_VACIO)
  const [nutri, setNutri] = useState(NUTRI_VACIO)
  const [gine, setGine] = useState(GINE_VACIO)
  const [kine, setKine] = useState(KINE_VACIO)
  const [psq, setPsq] = useState(PSQ_VACIO)
  const [oft, setOft] = useState(OFT_VACIO)
  const [guardandoEv, setGuardandoEv] = useState(false)
  const [errEv, setErrEv] = useState(null)
  const [editId, setEditId] = useState(null)      // evolución en edición (o null = nueva)
  const [showPac, setShowPac] = useState(false)   // modal editar datos del paciente
  const [formPac, setFormPac] = useState(null)
  const [guardandoPac, setGuardandoPac] = useState(false)
  const [errPac, setErrPac] = useState(null)
  const [showBorrarPac, setShowBorrarPac] = useState(false) // modal baja del paciente
  const [borrandoPac, setBorrandoPac] = useState(false)
  const [errBorrarPac, setErrBorrarPac] = useState(null)

  const paciente = data?.paciente
  const turnos = data?.turnos ?? EMPTY
  const profesionales = data?.profesionales ?? EMPTY
  const evols = data?.evoluciones ?? EMPTY
  const obras = data?.obras ?? EMPTY
  const profById = useMemo(() => Object.fromEntries(profesionales.map((p) => [p.id, p])), [profesionales])
  const estudios = data?.estudios ?? EMPTY
  const observaciones = data?.observaciones ?? EMPTY
  const alertasPac = data?.alertasPac ?? EMPTY
  const reglas = data?.reglas ?? EMPTY
  const alertasOk = !!data?.alertasOk
  const pautaAlertas = alertasOk && puedePautarAlertas(user?.rol)

  // Evolución (C2): agrupa las observaciones numéricas en series longitudinales.
  // La TA se grafica combinada (sistólica + diastólica). Motor general: sirve a
  // todas las especialidades porque las variables comparten nombre.
  // El sexo del paciente define las referencias que dependen de él (cintura, ICC).
  const sexo = data?.paciente?.sexo
  const graficos = useMemo(() => armarGraficos(observaciones, reglas, viewer, sexo), [observaciones, reglas, viewer, sexo])

  // Profesionales vinculados al paciente: dueño (cabecera) ∪ agenda (turnos) ∪
  // evoluciones. Es la MISMA relación con la que el backend deja ver/filtrar un
  // paciente; se muestra acá para que la conexión sea visible y trazable y no
  // dependa solo del dueño asignado.
  const vinculados = useMemo(() => {
    const origenes = new Map() // profId -> Set de orígenes ('cabecera'|'agenda'|'evolución')
    const marcar = (pid, origen) => {
      if (!pid) return
      let s = origenes.get(pid)
      if (!s) origenes.set(pid, (s = new Set()))
      s.add(origen)
    }
    if (paciente?.profId) marcar(paciente.profId, 'cabecera')
    for (const t of turnos) marcar(t.profId, 'agenda')
    for (const ev of evols) marcar(ev.profId, 'evolución')
    return [...origenes.entries()]
      .map(([pid, orig]) => ({ id: pid, nombre: profById[pid]?.nombre || 'Profesional', origenes: [...orig] }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [paciente, turnos, evols, profById])

  const especialidades = useMemo(
    () => [...new Set(profesionales.map((p) => p.especialidad).filter(Boolean))].sort(),
    [profesionales],
  )

  // La plantilla de C1 se elige por la FAMILIA de HC de la especialidad del
  // profesional: un dato del servidor (especialidad.familia, Configuración →
  // Especialidades), no el nombre. Una sola lectura reemplaza la cadena de
  // reconocedores por nombre (que quedan solo como respaldo en familiaDe).
  const famPlantilla = familiaDe(profById[form.profId]?.especialidad, profById[form.profId]?.familia)
  const usarCardio = famPlantilla === 'cardiologia'
  const usarClinica = famPlantilla === 'clinica' || famPlantilla === 'obesidad' // misma plantilla (§9)
  const obesidad = famPlantilla === 'obesidad'
  const usarPsico = famPlantilla === 'psicologia'
  const usarNeumo = famPlantilla === 'neumonologia'
  const usarReuma = famPlantilla === 'reumatologia'
  const usarInfecto = famPlantilla === 'infectologia'
  const usarNeuro = famPlantilla === 'neurologia'
  const usarEndo = famPlantilla === 'endocrino'
  const usarTrauma = famPlantilla === 'traumatologia'
  const usarEco = famPlantilla === 'ecografia'
  const usarPedia = famPlantilla === 'pediatria'
  const usarCx = famPlantilla === 'cirugia'
  const usarNutri = famPlantilla === 'nutricion'
  const usarGine = famPlantilla === 'ginecologia'
  const usarKine = famPlantilla === 'kinesiologia'
  const usarPsq = famPlantilla === 'psiquiatria'
  const usarOft = famPlantilla === 'oftalmologia'

  const abrirNueva = () => {
    setErrEv(null); setEditId(null)
    setForm({ ...EV_VACIO, profId: profId || '' }); setCardio(CARDIO_VACIO); setClinica(CLINICA_VACIO); setPsico(PSICO_VACIO); setNeumo(NEUMO_VACIO); setReuma(REUMA_VACIO); setInfecto(INFECTO_VACIO); setNeuro(NEURO_VACIO); setEndo(ENDO_VACIO); setTrauma(TRAUMA_VACIO); setEco(ECO_VACIO); setCx(CX_VACIO); setNutri(NUTRI_VACIO); setGine(GINE_VACIO); setKine(KINE_VACIO); setPsq(PSQ_VACIO); setOft(OFT_VACIO)
    // Pediatría: los datos de base (tutor, nacimiento, perinatales) se precargan de la última consulta pediátrica.
    setPedia(pediaBaseDesde(evols.find((e) => e.datos?.plantilla === 'pediatria' && !e.datos?.restringida)))
    setShow(true)
  }
  const abrirEditar = (ev) => {
    setErrEv(null); setEditId(ev.id)
    setForm({
      profId: ev.profId,
      tipo: ev.datos?.tipo || 'consulta', derivacionA: ev.datos?.derivacionA || '',
      motivo: ev.motivo || '',
      subjetivo: ev.subjetivo || '', objetivo: ev.objetivo || '',
      diagnostico: ev.diagnostico || '', plan: ev.plan || '',
      medicacion: (ev.medicacion || []).join(', '),
    })
    setCardio(cardioDesdeEvolucion(ev))
    setClinica(clinicaDesdeEvolucion(ev))
    setPsico(psicoDesdeEvolucion(ev))
    setNeumo(neumoDesdeEvolucion(ev))
    setReuma(reumaDesdeEvolucion(ev))
    setInfecto(infectoDesdeEvolucion(ev))
    setNeuro(neuroDesdeEvolucion(ev))
    setEndo(endoDesdeEvolucion(ev))
    setTrauma(traumaDesdeEvolucion(ev))
    setEco(ecoDesdeEvolucion(ev))
    setPedia(pediaDesdeEvolucion(ev))
    setCx(cxDesdeEvolucion(ev))
    setNutri(nutriDesdeEvolucion(ev))
    setGine(gineDesdeEvolucion(ev))
    setKine(kineDesdeEvolucion(ev))
    setPsq(psqDesdeEvolucion(ev))
    setOft(oftDesdeEvolucion(ev))
    setShow(true)
  }

  const abrirEditarPac = () => {
    setErrPac(null)
    const enLista = obras.includes(paciente.obraSocial)
    setFormPac({
      apellido: paciente.apellido || '', nombre: paciente.nombre || '', dni: paciente.dni || '',
      fechaNac: paciente.fechaNac || '', sexo: paciente.sexo || 'F',
      telefono: paciente.telefono || '', email: paciente.email || '',
      obraSocial: paciente.obraSocial ? (enLista ? paciente.obraSocial : 'Otros') : '',
      obraSocialOtra: paciente.obraSocial && !enLista ? paciente.obraSocial : '',
      afiliado: paciente.afiliado || '', derivacion: paciente.derivacion || '',
      profesionalAsignado: paciente.profId || '',
    })
    setShowPac(true)
  }
  const guardarPac = async (e) => {
    e.preventDefault()
    setErrPac(null)
    const { obraSocialOtra, ...resto } = formPac
    const obraSocial = formPac.obraSocial === 'Otros' ? obraSocialOtra.trim() : formPac.obraSocial
    const dni = soloDigitos(formPac.dni)
    if (!dni) { setErrPac('El DNI debe contener números.'); return }
    setGuardandoPac(true)
    try {
      const upd = await pacientesApi.update(id, { ...resto, dni, obraSocial })
      setData((d) => ({ ...d, paciente: upd }))
      setShowPac(false)
    } catch (err) {
      setErrPac(err.message)
    } finally {
      setGuardandoPac(false)
    }
  }

  const eliminarPac = async () => {
    setBorrandoPac(true); setErrBorrarPac(null)
    try {
      await pacientesApi.remove(id)
      nav('/pacientes')
    } catch (err) {
      setErrBorrarPac(err.message)
      setBorrandoPac(false)
    }
  }

  const guardarEvolucion = async () => {
    setErrEv(null)
    if (!form.profId) { setErrEv('Seleccioná el profesional.'); return }
    const motivo = usarCardio ? cardio.motivo : usarClinica ? clinica.motivo : usarPsico ? psico.motivo : usarNeumo ? neumo.motivo : usarReuma ? reuma.motivo : usarInfecto ? infecto.motivo : usarNeuro ? neuro.motivo : usarEndo ? endo.motivo : usarTrauma ? trauma.motivo : usarEco ? eco.motivo : usarPedia ? pedia.motivo : usarCx ? cx.motivo : usarNutri ? nutri.motivo : usarGine ? gine.motivo : usarKine ? kine.motivo : usarPsq ? psq.motivo : usarOft ? oft.motivo : form.motivo
    if (!motivo.trim()) { setErrEv('El motivo de consulta es requerido.'); return }
    if (form.tipo === 'derivacion' && !form.derivacionA) { setErrEv('Indicá a qué especialidad se deriva.'); return }
    setGuardandoEv(true)
    try {
      const base = usarCardio
        ? construirPayloadCardio(cardio)
        : usarClinica
        ? construirPayloadClinica(clinica, { obesidad })
        : usarPsico
        ? construirPayloadPsico(psico)
        : usarNeumo
        ? construirPayloadNeumo(neumo)
        : usarReuma
        ? construirPayloadReuma(reuma)
        : usarInfecto
        ? construirPayloadInfecto(infecto)
        : usarNeuro
        ? construirPayloadNeuro(neuro)
        : usarEndo
        ? construirPayloadEndo(endo)
        : usarTrauma
        ? construirPayloadTrauma(trauma)
        : usarEco
        ? construirPayloadEco(eco)
        : usarPedia
        ? construirPayloadPedia(pedia)
        : usarCx
        ? construirPayloadCx(cx)
        : usarNutri
        ? construirPayloadNutri(nutri)
        : usarGine
        ? construirPayloadGine(gine)
        : usarKine
        ? construirPayloadKine(kine)
        : usarPsq
        ? construirPayloadPsq(psq)
        : usarOft
        ? construirPayloadOft(oft)
        : {
            motivo: form.motivo, subjetivo: form.subjetivo, objetivo: form.objetivo,
            diagnostico: form.diagnostico, plan: form.plan,
            medicacion: form.medicacion ? form.medicacion.split(',').map((m) => m.trim()).filter(Boolean) : [],
          }
      const contenido = {
        ...base,
        datos: {
          ...(base.datos || {}),
          tipo: form.tipo,
          derivacionA: form.tipo === 'derivacion' ? form.derivacionA : null,
        },
      }
      if (editId) {
        const upd = await evolucionesApi.update(editId, contenido)
        setData((d) => ({ ...d, evoluciones: d.evoluciones.map((x) => (x.id === editId ? upd : x)) }))
      } else {
        // La evolución queda editable; la inmutabilidad y la trazabilidad (quién/qué/
        // cuándo) se resuelven del lado del servidor (auditoría), no en la interfaz.
        const nueva = await evolucionesApi.create({ pacienteId: id, profId: form.profId, ...contenido, estado: 'borrador' })
        setData((d) => ({ ...d, evoluciones: [nueva, ...d.evoluciones] }))
      }
      setShow(false); setForm(EV_VACIO); setCardio(CARDIO_VACIO); setClinica(CLINICA_VACIO); setPsico(PSICO_VACIO); setNeumo(NEUMO_VACIO); setReuma(REUMA_VACIO); setInfecto(INFECTO_VACIO); setNeuro(NEURO_VACIO); setEndo(ENDO_VACIO); setTrauma(TRAUMA_VACIO); setEco(ECO_VACIO); setPedia(PEDIA_VACIO); setCx(CX_VACIO); setNutri(NUTRI_VACIO); setGine(GINE_VACIO); setKine(KINE_VACIO); setPsq(PSQ_VACIO); setOft(OFT_VACIO); setEditId(null)
      setTab('hc')
    } catch (err) {
      setErrEv(err.message)
    } finally {
      setGuardandoEv(false)
    }
  }

  if (loading) return <Card><Loader label="Cargando ficha…" /></Card>
  if (error) {
    return (
      <Card><ErrorState onRetry={reload}>{error}</ErrorState></Card>
    )
  }
  if (!paciente) {
    return (
      <EmptyState icon={FileHeart} title="Paciente no encontrado">
        <Link to="/pacientes">Volver al listado</Link>
      </EmptyState>
    )
  }

  return (
    <>
      <button className="btn btn-link p-0 mb-3 d-inline-flex align-items-center gap-1 text-decoration-none"
        onClick={() => nav('/pacientes')}>
        <ArrowLeft size={16} /> Pacientes
      </button>

      {/* Cabecera de ficha */}
      <Card>
        <div className="pac-header">
          <Avatar {...paciente} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>{nombreCompleto(paciente)}</h1>
            <div className="text-muted">
              DNI {paciente.dni}{paciente.edad != null ? ` · ${paciente.edad} años` : ''} · {paciente.obraSocial || 'Sin obra social'}
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Badge tone="info">{estudios.length} {estudios.length === 1 ? 'estudio' : 'estudios'}</Badge>
            <Badge tone="ok">{evols.length} {evols.length === 1 ? 'evolución' : 'evoluciones'}</Badge>
          </div>
        </div>
        <AlertasPaciente pacienteId={id} alertas={alertasPac} setAlertas={setAlertasPac} disponible={alertasOk} />
      </Card>

      {/* Tabs */}
      <div className="tabs-p mt-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-p d-inline-flex align-items-center gap-2 ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* --- Datos generales --- */}
      {tab === 'datos' && (
        <Card
          title="Datos del paciente"
          actions={
            <div className="d-inline-flex gap-2">
              <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1" onClick={abrirEditarPac}>
                <Pencil size={14} /> Editar
              </Button>
              <Button size="sm" variant="outline-danger" className="d-inline-flex align-items-center gap-1"
                onClick={() => { setErrBorrarPac(null); setShowBorrarPac(true) }}>
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          }
        >
          <dl className="data-grid mb-0">
            <Dato k="Apellido y nombre" v={nombreCompleto(paciente)} />
            <Dato k="DNI" v={paciente.dni} />
            <Dato k="Edad" v={paciente.edad != null ? `${paciente.edad} años` : '—'} />
            <Dato k="Fecha de nacimiento" v={paciente.fechaNac || '—'} />
            <Dato k="Sexo" v={paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : 'Otro'} />
            <Dato k="Teléfono" v={paciente.telefono || '—'} />
            <Dato k="Email" v={paciente.email || '—'} />
            <Dato k="Obra Social" v={paciente.obraSocial || '—'} />
            <Dato k="Nº Afiliado" v={paciente.afiliado || '—'} />
            <Dato k="Derivación" v={paciente.derivacion || '—'} />
            <Dato k="Profesional asignado" v={paciente.profesional || 'Genérico (sin asignar)'} />
            <Dato k="Profesionales vinculados" v={
              vinculados.length === 0 ? '—' : (
                <div className="d-flex flex-column gap-1">
                  {vinculados.map((v) => (
                    <span key={v.id}>
                      {v.nombre} <small className="text-muted">({v.origenes.join(' · ')})</small>
                    </span>
                  ))}
                </div>
              )
            } />
            <Dato k="Alta en sistema" v={paciente.creado || '—'} />
          </dl>
        </Card>
      )}

      {/* --- Historia clínica: línea de tiempo de evoluciones --- */}
      {tab === 'hc' && (
        <Card>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="tabs-p" style={{ margin: 0 }}>
              <button type="button" className={`tab-p d-inline-flex align-items-center gap-2 ${subHc === 'lista' ? 'active' : ''}`} onClick={() => setSubHc('lista')}>
                <FileHeart size={16} /> Evoluciones
              </button>
              <button type="button" className={`tab-p d-inline-flex align-items-center gap-2 ${subHc === 'resumen' ? 'active' : ''}`} onClick={() => setSubHc('resumen')}>
                <LayoutDashboard size={16} /> Resumen
              </button>
              <button type="button" className={`tab-p d-inline-flex align-items-center gap-2 ${subHc === 'graficos' ? 'active' : ''}`} onClick={() => setSubHc('graficos')}>
                <Activity size={16} /> Gráficos
              </button>
            </div>
            {subHc === 'lista' && (
              <Button size="sm" className="d-inline-flex align-items-center gap-2" onClick={abrirNueva}>
                <Plus size={16} /> Nueva evolución
              </Button>
            )}
          </div>

          {subHc === 'resumen' ? (
            <DashboardMedico
              evols={evols} turnos={turnos} estudios={estudios} observaciones={observaciones}
              alertasPaciente={alertasPac} reglas={reglas} viewer={viewer} profById={profById}
              fijo={esProfesional && !!viewer} sexo={sexo}
              onNuevaEvolucion={abrirNueva} onIrGraficos={() => setSubHc('graficos')}
              onAlerta={pautaAlertas ? setReglaVar : undefined}
            />
          ) : subHc === 'graficos' ? (
            graficos.length === 0 ? (
              <EmptyState icon={Activity} title="Sin datos para graficar">
                Las variables numéricas (presión, peso, IMC, laboratorio…) se grafican acá a medida que se cargan en las evoluciones.
              </EmptyState>
            ) : (
              <>
                <div className="row g-3">
                  {graficos.map((g) => (
                    <div className="col-md-6" key={g.key}>
                      <div className="graf-card">
                        <GraficoEvolucion titulo={g.titulo} unidad={g.unidad} series={g.series} rango={g.rango}
                          onAlerta={pautaAlertas ? setReglaVar : undefined} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-muted small mt-3">
                  Las alertas las pauta cada profesional (personal o de su especialidad); sin alerta pautada se muestra la referencia orientativa. Nunca son diagnósticas.
                </div>
              </>
            )
          ) : evols.length === 0 ? (
            <EmptyState icon={Stethoscope} title="Sin evoluciones">
              Aún no hay registros clínicos para este paciente.
            </EmptyState>
          ) : (
            <div className="timeline">
              {evols.map((ev) => (
                <div className="tl-item" key={ev.id}>
                  <div className="tl-card">
                    <div className="tl-head">
                      <div>
                        <span className="tl-esp">{ev.especialidad}</span>
                        <div className="tl-meta">
                          {profById[ev.profId]?.nombre || 'Profesional'} · {ev.motivo}
                        </div>
                      </div>
                      <div className="d-flex gap-2 flex-wrap justify-content-end">
                        {ev.datos?.confidencial && <Badge tone="warn">Confidencial</Badge>}
                        {ev.datos?.tipo === 'derivacion' && <Badge tone="brand">Derivación → {ev.datos.derivacionA}</Badge>}
                        <Badge tone="info">{ev.fecha}</Badge>
                      </div>
                    </div>

                    {ev.datos?.restringida ? (
                      <p className="text-muted small mb-0 d-flex align-items-center gap-1">
                        <Lock size={14} /> Contenido confidencial: visible solo para el profesional tratante.
                      </p>
                    ) : (<>
                    <dl className="soap-grid mb-0">
                      {ev.subjetivo && <div><dt>Subjetivo</dt><dd>{ev.subjetivo}</dd></div>}
                      {ev.objetivo && <div><dt>Objetivo</dt><dd>{ev.objetivo}</dd></div>}
                      {ev.diagnostico && <div><dt>Diagnóstico</dt><dd>{ev.diagnostico}</dd></div>}
                      {ev.plan && <div><dt>Plan</dt><dd>{ev.plan}</dd></div>}
                    </dl>
                    {ev.datos?.plantilla?.startsWith('clinica')
                      ? <ResumenClinica datos={ev.datos} />
                      : ev.datos?.plantilla === 'psicologia'
                      ? <ResumenPsicologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'neumonologia'
                      ? <ResumenNeumonologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'reumatologia'
                      ? <ResumenReumatologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'infectologia'
                      ? <ResumenInfectologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'neurologia'
                      ? <ResumenNeurologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'endocrino'
                      ? <ResumenEndocrino datos={ev.datos} />
                      : ev.datos?.plantilla === 'traumatologia'
                      ? <ResumenTraumatologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'ecografia'
                      ? <ResumenEcografia datos={ev.datos} />
                      : ev.datos?.plantilla === 'pediatria'
                      ? <ResumenPediatria datos={ev.datos} />
                      : ev.datos?.plantilla === 'cirugia'
                      ? <ResumenCirugia datos={ev.datos} />
                      : ev.datos?.plantilla === 'nutricion'
                      ? <ResumenNutricion datos={ev.datos} />
                      : ev.datos?.plantilla === 'ginecologia'
                      ? <ResumenGinecologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'kinesiologia'
                      ? <ResumenKinesiologia datos={ev.datos} />
                      : ev.datos?.plantilla === 'psiquiatria'
                      ? <ResumenPsiquiatria datos={ev.datos} />
                      : ev.datos?.plantilla === 'oftalmologia'
                      ? <ResumenOftalmologia datos={ev.datos} />
                      : <ResumenCardio datos={ev.datos} />}

                    {ev.medicacion?.length > 0 && (
                      <div className="mt-2">
                        <dt style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Medicación</dt>
                        {ev.medicacion.map((m) => <span key={m} className="med-chip">{m}</span>)}
                      </div>
                    )}
                    {ev.adjuntos?.length > 0 && (
                      <div className="mt-2 text-muted small d-flex align-items-center gap-1">
                        <Paperclip size={14} /> {ev.adjuntos.length} estudio(s) adjunto(s)
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-3">
                      <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1" onClick={() => abrirEditar(ev)}>
                        <Pencil size={14} /> Editar
                      </Button>
                    </div>
                    </>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* --- Estudios (archivos del paciente) --- */}
      {tab === 'estudios' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <Card title="Cargar estudio">
              <CargaEstudio
                pacienteId={id}
                evoluciones={evols}
                profId={profId}
                onSubido={(nuevos) => setData((d) => ({
                  ...d,
                  estudios: [...nuevos, ...d.estudios],
                  evoluciones: d.evoluciones.map((ev) => ({
                    ...ev,
                    adjuntos: [...(ev.adjuntos || []), ...nuevos.filter((n) => n.evolucionId === ev.id).map((n) => n.id)],
                  })),
                }))}
              />
            </Card>
          </div>
          <div className="col-lg-7">
            <Card title="Estudios y archivos">
              <ListaEstudios
                estudios={estudios}
                vacio="Cargá el primer archivo desde el panel de la izquierda."
                onEliminado={(estId) => setData((d) => ({
                  ...d,
                  estudios: d.estudios.filter((e) => e.id !== estId),
                  evoluciones: d.evoluciones.map((ev) => ({ ...ev, adjuntos: (ev.adjuntos || []).filter((a) => a !== estId) })),
                }))}
              />
            </Card>
          </div>
        </div>
      )}

      {/* --- Turnos (reales) --- */}
      {tab === 'turnos' && (
        <Card title="Turnos del paciente" bodyClass="p-0">
          {turnos.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Sin turnos registrados" />
          ) : (
            <div className="table-scroll">
            <table className="table-p">
              <thead>
                <tr><th>Fecha</th><th>Hora</th><th>Especialidad</th><th>Profesional</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {turnos.map((t) => (
                  <tr key={t.id}>
                    <td>{t.fecha}</td>
                    <td><strong>{t.hora}</strong></td>
                    <td>{t.especialidad}</td>
                    <td>{profById[t.profId]?.nombre}</td>
                    <td><Badge tone={ESTADOS_TURNO[t.estado].tone}>{ESTADOS_TURNO[t.estado].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal nueva / editar evolución */}
      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Form onSubmit={(e) => { e.preventDefault(); guardarEvolucion() }}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>
              {editId ? 'Editar evolución' : 'Nueva evolución'} — {nombreCompleto(paciente)}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errEv && <Alert variant="danger" className="py-2 px-3 small">{errEv}</Alert>}
            <div className="row g-3">
              <div className="col-12">
                <Form.Label>Profesional</Form.Label>
                <Form.Select required value={form.profId} disabled={esProfesional || !!editId}
                  onChange={(e) => setForm({ ...form, profId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.especialidad}</option>)}
                </Form.Select>
                {usarCardio && <div className="text-muted small mt-1">Plantilla de Cardiología</div>}
                {usarClinica && <div className="text-muted small mt-1">Plantilla de Clínica Médica{obesidad ? ' (obesidad)' : ''}</div>}
                {usarPsico && <div className="text-muted small mt-1">Plantilla de Psicología</div>}
                {usarNeumo && <div className="text-muted small mt-1">Plantilla de Neumonología</div>}
                {usarReuma && <div className="text-muted small mt-1">Plantilla de Reumatología</div>}
                {usarInfecto && <div className="text-muted small mt-1">Plantilla de Infectología</div>}
                {usarNeuro && <div className="text-muted small mt-1">Plantilla de Neurología</div>}
                {usarEndo && <div className="text-muted small mt-1">Plantilla de Endocrinología / Diabetología / Ginecoendocrinología</div>}
                {usarTrauma && <div className="text-muted small mt-1">Plantilla de Traumatología</div>}
                {usarEco && <div className="text-muted small mt-1">Plantilla de Ecografía (informe)</div>}
                {usarPedia && <div className="text-muted small mt-1">Plantilla de Pediatría</div>}
                {usarCx && <div className="text-muted small mt-1">Plantilla de Cirugía</div>}
                {usarNutri && <div className="text-muted small mt-1">Plantilla de Nutrición</div>}
                {usarGine && <div className="text-muted small mt-1">Plantilla de Ginecología</div>}
                {usarKine && <div className="text-muted small mt-1">Plantilla de Kinesiología</div>}
                {usarPsq && <div className="text-muted small mt-1">Plantilla de Psiquiatría</div>}
                {usarOft && <div className="text-muted small mt-1">Plantilla de Oftalmología</div>}
              </div>
              <div className="col-md-5">
                <Form.Label>Tipo de registro</Form.Label>
                <Form.Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="consulta">Consulta</option>
                  <option value="derivacion">Derivación</option>
                </Form.Select>
              </div>
              {form.tipo === 'derivacion' && (
                <div className="col-md-7">
                  <Form.Label>Se deriva a</Form.Label>
                  <Form.Select value={form.derivacionA} onChange={(e) => setForm({ ...form, derivacionA: e.target.value })}>
                    <option value="">Seleccionar especialidad...</option>
                    {especialidades.map((esp) => <option key={esp}>{esp}</option>)}
                  </Form.Select>
                </div>
              )}
            </div>

            {usarCardio ? (
              <div className="mt-3">
                <ConsultaCardiologia value={cardio} onChange={(patch) => setCardio((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarClinica ? (
              <div className="mt-3">
                <ConsultaClinica value={clinica} obesidad={obesidad} onChange={(patch) => setClinica((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarPsico ? (
              <div className="mt-3">
                <ConsultaPsicologia value={psico} onChange={(patch) => setPsico((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarNeumo ? (
              <div className="mt-3">
                <ConsultaNeumonologia value={neumo} onChange={(patch) => setNeumo((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarReuma ? (
              <div className="mt-3">
                <ConsultaReumatologia value={reuma} onChange={(patch) => setReuma((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarInfecto ? (
              <div className="mt-3">
                <ConsultaInfectologia value={infecto} onChange={(patch) => setInfecto((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarNeuro ? (
              <div className="mt-3">
                <ConsultaNeurologia value={neuro} onChange={(patch) => setNeuro((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarEndo ? (
              <div className="mt-3">
                <ConsultaEndocrino value={endo} onChange={(patch) => setEndo((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarTrauma ? (
              <div className="mt-3">
                <ConsultaTraumatologia value={trauma} onChange={(patch) => setTrauma((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarEco ? (
              <div className="mt-3">
                <ConsultaEcografia value={eco} onChange={(patch) => setEco((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarPedia ? (
              <div className="mt-3">
                <ConsultaPediatria value={pedia} onChange={(patch) => setPedia((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarCx ? (
              <div className="mt-3">
                <ConsultaCirugia value={cx} onChange={(patch) => setCx((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarNutri ? (
              <div className="mt-3">
                <ConsultaNutricion value={nutri} onChange={(patch) => setNutri((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarGine ? (
              <div className="mt-3">
                <ConsultaGinecologia value={gine} onChange={(patch) => setGine((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarKine ? (
              <div className="mt-3">
                <ConsultaKinesiologia value={kine} onChange={(patch) => setKine((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarPsq ? (
              <div className="mt-3">
                <ConsultaPsiquiatria value={psq} onChange={(patch) => setPsq((c) => ({ ...c, ...patch }))} />
              </div>
            ) : usarOft ? (
              <div className="mt-3">
                <ConsultaOftalmologia value={oft} onChange={(patch) => setOft((c) => ({ ...c, ...patch }))} />
              </div>
            ) : (
              <div className="row g-3 mt-0">
                <div className="col-12">
                  <Form.Label>Motivo de consulta</Form.Label>
                  <Form.Control value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <Form.Label>Subjetivo</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.subjetivo}
                    onChange={(e) => setForm({ ...form, subjetivo: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <Form.Label>Objetivo</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.objetivo}
                    onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <Form.Label>Diagnóstico</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.diagnostico}
                    onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <Form.Label>Plan / indicaciones</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })} />
                </div>
                <div className="col-12">
                  <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
                  <Form.Control placeholder="Ej: Enalapril 10mg c/12h, Amlodipina 5mg/día" value={form.medicacion}
                    onChange={(e) => setForm({ ...form, medicacion: e.target.value })} />
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" onClick={() => setShow(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardandoEv}>{guardandoEv ? 'Guardando…' : 'Guardar'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* C3: pauta de alerta sobre una variable (desde el gráfico o el resumen) */}
      <ReglaAlertaModal
        show={!!reglaVar} onHide={() => setReglaVar(null)} variable={reglaVar}
        reglas={reglas} rol={user?.rol} profesional={viewer}
        especialidades={especialidades} profesionales={profesionales} onCambio={setReglas}
      />

      {/* Modal editar datos del paciente */}
      <Modal show={showPac} onHide={() => setShowPac(false)} centered size="lg">
        {formPac && (
        <Form onSubmit={guardarPac}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: 18 }}>Editar paciente</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errPac && <Alert variant="danger" className="py-2 px-3 small">{errPac}</Alert>}
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label>Apellido</Form.Label>
                <Form.Control required value={formPac.apellido} onChange={(e) => setFormPac({ ...formPac, apellido: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nombre</Form.Label>
                <Form.Control required value={formPac.nombre} onChange={(e) => setFormPac({ ...formPac, nombre: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>DNI</Form.Label>
                <Form.Control required inputMode="numeric" placeholder="Solo números" value={formPac.dni}
                  onChange={(e) => setFormPac({ ...formPac, dni: soloDigitos(e.target.value) })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Fecha de nacimiento</Form.Label>
                <Form.Control type="date" value={formPac.fechaNac} onChange={(e) => setFormPac({ ...formPac, fechaNac: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Sexo</Form.Label>
                <Form.Select value={formPac.sexo} onChange={(e) => setFormPac({ ...formPac, sexo: e.target.value })}>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                  <option value="X">Otro</option>
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control value={formPac.telefono} onChange={(e) => setFormPac({ ...formPac, telefono: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={formPac.email} onChange={(e) => setFormPac({ ...formPac, email: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Obra Social</Form.Label>
                <Form.Select value={formPac.obraSocial} onChange={(e) => setFormPac({ ...formPac, obraSocial: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {obras.map((o) => <option key={o}>{o}</option>)}
                  <option value="Otros">Otros</option>
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Nº Afiliado</Form.Label>
                <Form.Control value={formPac.afiliado} onChange={(e) => setFormPac({ ...formPac, afiliado: e.target.value })} />
              </div>
              {formPac.obraSocial === 'Otros' && (
                <div className="col-12">
                  <Form.Label>Especificar obra social</Form.Label>
                  <Form.Control required placeholder="Nombre de la obra social / prepaga"
                    value={formPac.obraSocialOtra} onChange={(e) => setFormPac({ ...formPac, obraSocialOtra: e.target.value })} />
                </div>
              )}
              <div className="col-12">
                <Form.Label>Derivación</Form.Label>
                <Form.Control value={formPac.derivacion} onChange={(e) => setFormPac({ ...formPac, derivacion: e.target.value })} />
              </div>
              {!esProfesional && (
                <div className="col-md-6">
                  <Form.Label>Profesional asignado <span className="text-muted small">(opcional)</span></Form.Label>
                  <Form.Select value={formPac.profesionalAsignado}
                    onChange={(e) => setFormPac({ ...formPac, profesionalAsignado: e.target.value })}>
                    <option value="">Genérico (sin asignar)</option>
                    {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.especialidad}</option>)}
                  </Form.Select>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" onClick={() => setShowPac(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardandoPac}>{guardandoPac ? 'Guardando…' : 'Guardar cambios'}</Button>
          </Modal.Footer>
        </Form>
        )}
      </Modal>

      {/* Confirmar baja (soft-delete) del paciente desde su ficha */}
      <Modal show={showBorrarPac} onHide={() => setShowBorrarPac(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }}>Eliminar paciente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errBorrarPac && <Alert variant="danger" className="py-2 px-3 small">{errBorrarPac}</Alert>}
          Se va a eliminar a <strong>{nombreCompleto(paciente)}</strong> del listado de pacientes.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowBorrarPac(false)}>Cancelar</Button>
          <Button variant="danger" disabled={borrandoPac} onClick={eliminarPac}>
            {borrandoPac ? 'Eliminando…' : 'Eliminar paciente'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

// Resumen de la consulta de Cardiología (signos vitales + escalas) en la línea de tiempo.
function ResumenCardio({ datos }) {
  if (!datos?.vitales && !datos?.sintomas) return null
  const v = datos.vitales || {}
  const vitales = [
    v.taSist && v.taDiast && `TA ${v.taSist}/${v.taDiast} mmHg`,
    v.fc && `FC ${v.fc} lpm`,
    v.sat && `Sat ${v.sat}%`,
    v.peso && `Peso ${v.peso} kg`,
    datos.imc && `IMC ${datos.imc}`,
    datos.nyha && `NYHA ${datos.nyha}`,
    datos.riesgoCV && `Riesgo CV ${datos.riesgoCV}`,
    datos.cha2ds2 && `CHA₂DS₂-VASc ${datos.cha2ds2}`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {vitales.length > 0 && <div><dt>Signos vitales y escalas</dt><dd>{vitales.join(' · ')}</dd></div>}
      {lista('Síntomas', datos.sintomas)}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Clínica Médica (signos vitales + antecedentes + plan) en la línea de tiempo.
function ResumenClinica({ datos }) {
  const v = datos.vitales || {}
  const vitales = [
    v.taSist && v.taDiast && `TA ${v.taSist}/${v.taDiast} mmHg`,
    v.fc && `FC ${v.fc} lpm`,
    v.fr && `FR ${v.fr} rpm`,
    v.temp && `T ${v.temp} °C`,
    v.sat && `Sat ${v.sat}%`,
    v.peso && `Peso ${v.peso} kg`,
    datos.imc && `IMC ${datos.imc}`,
    v.cintura && `Cintura ${v.cintura} cm`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {vitales.length > 0 && <div><dt>Signos vitales</dt><dd>{vitales.join(' · ')}</dd></div>}
      {lista('Antecedentes', datos.antecedentes)}
      {datos.diferenciales && <div><dt>Diagnósticos diferenciales</dt><dd>{datos.diferenciales}</dd></div>}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la sesión de Psicología en la línea de tiempo (solo para quien puede leerla).
function ResumenPsicologia({ datos }) {
  const campo = (titulo, v) => v && <div><dt>{titulo}</dt><dd>{v}</dd></div>
  return (
    <dl className="soap-grid mb-0 mt-2">
      {campo('Contexto familiar', datos.contextoFamiliar)}
      {campo('Contexto laboral / escolar', datos.contextoLaboral)}
      {campo('Tratamientos previos', datos.tratamientosPrevios)}
      {campo('Situaciones relevantes', datos.situacionesRelevantes)}
      {campo('Objetivos terapéuticos', datos.objetivos)}
      {campo('Intervenciones', datos.intervenciones)}
      {campo('Próxima sesión', datos.proximoControl)}
    </dl>
  )
}

// Resumen de la consulta de Neumonología (función respiratoria + escalas) en la línea de tiempo.
function ResumenNeumonologia({ datos }) {
  const v = datos.vitales || {}
  const t = datos.tabaquismo
  const valores = [
    v.fr && `FR ${v.fr} rpm`,
    v.sat && `Sat ${v.sat}%`,
    v.fev1 && `FEV1 ${v.fev1} L`,
    v.fev1Pct && `FEV1 ${v.fev1Pct}% pred.`,
    datos.mmrc && `mMRC ${datos.mmrc}`,
    datos.cat != null && `CAT ${datos.cat}`,
    datos.stopBang != null && `STOP-BANG ${datos.stopBang}`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {valores.length > 0 && <div><dt>Función respiratoria y escalas</dt><dd>{valores.join(' · ')}</dd></div>}
      {t?.estado && <div><dt>Tabaquismo</dt><dd>{t.estado}{t.paquetesAnio != null ? ` · ${t.paquetesAnio} paquetes/año` : ''}</dd></div>}
      {lista('Síntomas', datos.sintomas)}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Reumatología (dolor, articulaciones, laboratorio) en la línea de tiempo.
function ResumenReumatologia({ datos }) {
  const dolor = datos.dolor || {}
  const lab = datos.laboratorio || {}
  const valores = [
    dolor.eva != null && `EVA ${dolor.eva}/10`,
    datos.rigidezMatinal != null && `Rigidez matinal ${datos.rigidezMatinal} min`,
    lab.pcr != null && `PCR ${lab.pcr} mg/L`,
    lab.vsg != null && `VSG ${lab.vsg} mm/h`,
    datos.actividad && `Actividad ${datos.actividad}`,
  ].filter(Boolean)
  const resultados = Object.entries(lab.resultados || {}).map(([k, v]) => `${ETIQUETA_LAB_REUMA[k] || k}: ${v}`)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {valores.length > 0 && <div><dt>Dolor, laboratorio y actividad</dt><dd>{valores.join(' · ')}</dd></div>}
      {lista('Síntomas', datos.sintomas)}
      {lista('Articulaciones', datos.articulaciones)}
      {lista('Laboratorio', resultados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}
const ETIQUETA_LAB_REUMA = { factorReumatoide: 'FR', antiCcp: 'Anti-CCP', fan: 'FAN', antiDna: 'Anti-DNA', complemento: 'Complemento', cpk: 'CPK', otros: 'Otros' }

// Resumen de la consulta de Infectología (fiebre, foco, microbiología, antibióticos) en la línea de tiempo.
function ResumenInfectologia({ datos }) {
  const f = datos.fiebre || {}
  const fiebre = f.presente ? [
    'Fiebre',
    f.inicio && `desde ${f.inicio}`,
    f.tempMax != null && `máx. ${f.tempMax} °C`,
    f.patron && `patrón ${f.patron.toLowerCase()}`,
  ].filter(Boolean).join(' · ') : null
  const micro = (datos.microbiologia || []).map((m) => [m.muestra, m.microorganismo, m.resistencia && `R: ${m.resistencia}`].filter(Boolean).join(' – '))
  const atb = (datos.antibioticos || []).map((a) => [a.antibiotico, a.dosis, a.via, a.inicio && `${a.inicio}${a.fin ? ` → ${a.fin}` : ''}`].filter(Boolean).join(' '))
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {fiebre && <div><dt>Fiebre</dt><dd>{fiebre}</dd></div>}
      {datos.temperatura != null && <div><dt>Temperatura</dt><dd>{datos.temperatura} °C</dd></div>}
      {lista('Epidemiología', datos.epidemiologia)}
      {lista('Microbiología', micro)}
      {lista('Antibióticos', atb)}
      {datos.duracionPrevista && <div><dt>Duración prevista</dt><dd>{datos.duracionPrevista}</dd></div>}
      {datos.proximoControl && <div><dt>Control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Neurología (vitales + escalas + síntomas) en la línea de tiempo.
function ResumenNeurologia({ datos }) {
  const v = datos.vitales || {}
  const valores = [
    v.taSist && v.taDiast && `TA ${v.taSist}/${v.taDiast} mmHg`,
    v.fc && `FC ${v.fc} lpm`,
    v.sat && `Sat ${v.sat}%`,
    datos.glasgow != null && `Glasgow ${datos.glasgow}`,
    datos.nihss != null && `NIHSS ${datos.nihss}`,
    datos.imc && `IMC ${datos.imc}`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {valores.length > 0 && <div><dt>Signos vitales y escalas</dt><dd>{valores.join(' · ')}</dd></div>}
      {lista('Síntomas', datos.sintomas)}
      {lista('Antecedentes', datos.antecedentes)}
      {datos.diferenciales && <div><dt>Diagnósticos diferenciales</dt><dd>{datos.diferenciales}</dd></div>}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Endocrino (sub-área + antropometría + laboratorio) en la línea de tiempo.
function ResumenEndocrino({ datos }) {
  const v = datos.vitales || {}
  const lab = datos.laboratorio || {}
  const valores = [
    v.taSist && v.taDiast && `TA ${v.taSist}/${v.taDiast} mmHg`,
    v.peso && `Peso ${v.peso} kg`,
    datos.imc && `IMC ${datos.imc}`,
    v.cintura && `Cintura ${v.cintura} cm`,
  ].filter(Boolean)
  const labs = [
    lab.glucemia && `Glucemia ${lab.glucemia} mg/dL`,
    lab.hba1c && `HbA1c ${lab.hba1c}%`,
    lab.colesterolTotal && `CT ${lab.colesterolTotal}`,
    lab.ldl && `LDL ${lab.ldl}`,
    lab.trigliceridos && `TG ${lab.trigliceridos}`,
    lab.tsh && `TSH ${lab.tsh}`,
    lab.t4l && `T4L ${lab.t4l}`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {datos.subarea && <div><dt>Sub-área</dt><dd>{datos.subarea}</dd></div>}
      {valores.length > 0 && <div><dt>Signos y antropometría</dt><dd>{valores.join(' · ')}</dd></div>}
      {labs.length > 0 && <div><dt>Laboratorio</dt><dd>{labs.join(' · ')}</dd></div>}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Traumatología (mecanismo, zonas, conducta) en la línea de tiempo.
function ResumenTraumatologia({ datos }) {
  const m = datos.mecanismo
  const mecanismo = m?.tipo ? [m.tipo, m.descripcion, m.fecha && `(${m.fecha})`].filter(Boolean).join(' · ') : null
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {mecanismo && <div><dt>Mecanismo</dt><dd>{mecanismo}</dd></div>}
      {datos.dolorEva != null && <div><dt>Dolor</dt><dd>EVA {datos.dolorEva}/10</dd></div>}
      {lista('Síntomas', datos.sintomas)}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios solicitados', datos.estudiosSolicitados)}
      {lista('Conducta', datos.conducta)}
      {datos.inmovilizacion && datos.inmovilizacion !== 'Ninguna' && <div><dt>Inmovilización</dt><dd>{datos.inmovilizacion}</dd></div>}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen del informe ecográfico (tipo, derivante, mediciones) en la línea de tiempo.
function ResumenEcografia({ datos }) {
  const med = (datos.mediciones || []).map((x) => [x.estructura, x.valor && `${x.valor} ${x.unidad}`].filter(Boolean).join(': '))
  return (
    <dl className="soap-grid mb-0 mt-2">
      {datos.tipoEstudio && <div><dt>Ecografía</dt><dd>{datos.tipoEstudio}</dd></div>}
      {datos.derivante && <div><dt>Solicitado por</dt><dd>{datos.derivante}</dd></div>}
      {datos.tecnica && <div><dt>Técnica</dt><dd>{datos.tecnica}</dd></div>}
      {med.length > 0 && <div><dt>Mediciones</dt><dd>{med.join(' · ')}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Pediatría (antropometría, vacunación, alimentación) en la línea de tiempo.
function ResumenPediatria({ datos }) {
  const v = datos.vitales || {}
  const b = datos.base || {}
  const vac = datos.vacunacion || {}
  const antropo = [
    v.peso && `Peso ${v.peso} kg`,
    v.talla && `Talla ${v.talla} cm`,
    v.perimetroCefalico && `PC ${v.perimetroCefalico} cm`,
    datos.imc && `IMC ${datos.imc}`,
  ].filter(Boolean)
  const nacimiento = [
    b.edadGestacional != null && `${b.edadGestacional} sem`,
    b.tipoParto,
    b.pesoNacer != null && `${b.pesoNacer} g`,
  ].filter(Boolean)
  return (
    <dl className="soap-grid mb-0 mt-2">
      {antropo.length > 0 && <div><dt>Antropometría</dt><dd>{antropo.join(' · ')}</dd></div>}
      {vac.esquema && <div><dt>Vacunación</dt><dd>{vac.esquema}{vac.pendientes ? ` · Pendientes: ${vac.pendientes}` : ''}</dd></div>}
      {datos.alimentacion?.length > 0 && <div><dt>Alimentación</dt><dd>{datos.alimentacion.join(' · ')}</dd></div>}
      {nacimiento.length > 0 && <div><dt>Nacimiento</dt><dd>{nacimiento.join(' · ')}</dd></div>}
      {b.tutorNombre && <div><dt>Tutor</dt><dd>{b.tutorNombre}{b.tutorTelefono ? ` · ${b.tutorTelefono}` : ''}</dd></div>}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de Cirugía (etapa, procedimiento, consentimiento, postoperatorio) en la línea de tiempo.
function ResumenCirugia({ datos }) {
  const pre = datos.preoperatorio || {}
  const qx = datos.cirugia || {}
  const post = datos.postoperatorio || {}
  const cirugia = [qx.fecha, qx.procedimiento, qx.cirujano && `Cirujano: ${qx.cirujano}`, qx.anestesia && `Anestesia ${qx.anestesia.toLowerCase()}`].filter(Boolean)
  const postop = [
    post.herida && `Herida: ${post.herida}`,
    post.dolorEva != null && `Dolor EVA ${post.dolorEva}/10`,
    post.temperatura != null && `T ${post.temperatura} °C`,
    post.drenajes && `Drenajes: ${post.drenajes}`,
    post.retiroPuntos && `Retiro de puntos: ${post.retiroPuntos}`,
  ].filter(Boolean)
  return (
    <dl className="soap-grid mb-0 mt-2">
      {datos.etapa && <div><dt>Etapa</dt><dd>{datos.etapa}{post.alta ? ' · Alta quirúrgica' : ''}</dd></div>}
      {(pre.riesgo || pre.procedimientoPropuesto) && <div><dt>Preoperatorio</dt><dd>{[pre.riesgo, pre.procedimientoPropuesto].filter(Boolean).join(' · ')}</dd></div>}
      {datos.consentimiento && <div><dt>Consentimiento</dt><dd>{datos.consentimiento}</dd></div>}
      {cirugia.length > 0 && <div><dt>Cirugía</dt><dd>{cirugia.join(' · ')}</dd></div>}
      {postop.length > 0 && <div><dt>Postoperatorio</dt><dd>{postop.join(' · ')}</dd></div>}
      {post.complicaciones && <div><dt>Complicaciones</dt><dd>{post.complicaciones}</dd></div>}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Nutrición (antropometría, objetivos, actividad) en la línea de tiempo.
function ResumenNutricion({ datos }) {
  const a = datos.antropometria || {}
  const af = datos.actividadFisica
  const antropo = [
    a.peso && `Peso ${a.peso} kg`,
    datos.imc && `IMC ${datos.imc}`,
    a.pesoObjetivo && `Objetivo ${a.pesoObjetivo} kg`,
    a.cintura && `Cintura ${a.cintura} cm`,
    datos.icc && `ICC ${datos.icc}`,
    a.grasaPct && `Grasa ${a.grasaPct}%`,
    a.masaMuscular && `Masa muscular ${a.masaMuscular} kg`,
  ].filter(Boolean)
  return (
    <dl className="soap-grid mb-0 mt-2">
      {antropo.length > 0 && <div><dt>Antropometría</dt><dd>{antropo.join(' · ')}</dd></div>}
      {datos.objetivosPaciente?.length > 0 && <div><dt>Objetivo del paciente</dt><dd>{datos.objetivosPaciente.join(' · ')}</dd></div>}
      {af?.tipo && <div><dt>Actividad física</dt><dd>{[af.tipo, af.frecuencia != null && `${af.frecuencia}×/semana`, af.duracion != null && `${af.duracion} min`].filter(Boolean).join(' · ')}</dd></div>}
      {datos.indicaciones && <div><dt>Indicaciones</dt><dd>{datos.indicaciones}</dd></div>}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Ginecología (fórmula obstétrica, FUM, anticoncepción) en la línea de tiempo.
function ResumenGinecologia({ datos }) {
  const m = datos.menstrual || {}
  const ac = datos.anticoncepcion
  const formula = formulaObstetrica(datos.gestaciones || {})
  const menstrual = [
    m.fum && `FUM ${m.fum}`,
    m.cicloDias != null && `Ciclo ${m.cicloDias}/${m.duracionDias ?? '—'} días`,
    m.dismenorrea && 'Dismenorrea',
    m.menopausia && `Menopausia${m.edadMenopausia != null ? ` (${m.edadMenopausia} años)` : ''}`,
  ].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {formula && <div><dt>Fórmula obstétrica</dt><dd>{formula}</dd></div>}
      {lista('Ciclo menstrual', menstrual)}
      {ac?.metodo && <div><dt>Anticoncepción</dt><dd>{ac.metodo === 'Otro' && ac.otro ? ac.otro : ac.metodo}</dd></div>}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios', datos.estudios)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la sesión de Kinesiología (zonas, dolor pre/post, tratamiento, sesión) en la línea de tiempo.
function ResumenKinesiologia({ datos }) {
  const d = datos.dolor || {}
  const ses = datos.sesion
  const dolor = [
    d.eva != null && `EVA ${d.eva}/10`,
    d.evaPost != null && `post tratamiento ${d.evaPost}/10`,
  ].filter(Boolean)
  const tratamientos = (datos.tratamientos || []).map((t) => (t === 'Otro' && datos.tratamientoOtro ? datos.tratamientoOtro : t))
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {ses && <div><dt>Sesión</dt><dd>{ses.numero ?? '—'}{ses.total != null ? ` / ${ses.total}` : ''}</dd></div>}
      {lista('Zonas', datos.zonas)}
      {dolor.length > 0 && <div><dt>Dolor</dt><dd>{dolor.join(' · ')}</dd></div>}
      {lista('Tratamiento realizado', tratamientos)}
      {datos.objetivos && <div><dt>Objetivos</dt><dd>{datos.objetivos}</dd></div>}
      {datos.proximoControl && <div><dt>Próxima sesión</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Psiquiatría (riesgo, antecedentes, seguimiento) en la línea de tiempo.
// Solo llega con contenido a quien puede leerla: si es confidencial y no es el tratante,
// la API la redacta y la tarjeta muestra "Contenido confidencial".
function ResumenPsiquiatria({ datos }) {
  const r = datos.riesgo || {}
  const a = datos.antecedentes || {}
  const riesgo = [
    r.suicida && `Suicida: ${r.suicida}`,
    r.autoagresion && `Autoagresión: ${r.autoagresion}`,
    r.heteroagresion && `Heteroagresión: ${r.heteroagresion}`,
  ].filter(Boolean)
  const antecedentes = [
    a.diagnosticosPrevios,
    a.internaciones && `Internaciones: ${a.internaciones}`,
    a.intentosAutolesivos && `Intentos autolesivos${a.intentosDetalle ? `: ${a.intentosDetalle}` : ''}`,
  ].filter(Boolean)
  return (
    <dl className="soap-grid mb-0 mt-2">
      {riesgo.length > 0 && <div><dt>Evaluación de riesgo</dt><dd>{riesgo.join(' · ')}</dd></div>}
      {antecedentes.length > 0 && <div><dt>Antecedentes</dt><dd>{antecedentes.join(' · ')}</dd></div>}
      {datos.respuestaEfectos && <div><dt>Respuesta / efectos adversos</dt><dd>{datos.respuestaEfectos}</dd></div>}
      {datos.indicaciones && <div><dt>Indicaciones</dt><dd>{datos.indicaciones}</dd></div>}
      {datos.proximoControl && <div><dt>Seguimiento</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

// Resumen de la consulta de Oftalmología (refracción, corrección, estudios) en la línea de tiempo.
function ResumenOftalmologia({ datos }) {
  const rf = datos.refraccion || {}
  const refr = (o) => (o && (o.esfera || o.cilindro || o.eje)
    ? [o.esfera && `esf ${o.esfera}`, o.cilindro && `cil ${o.cilindro}`, o.eje && `eje ${o.eje}°`].filter(Boolean).join(' ')
    : null)
  const refraccion = [refr(rf.od) && `OD ${refr(rf.od)}`, refr(rf.oi) && `OI ${refr(rf.oi)}`].filter(Boolean)
  const lista = (titulo, items) => items?.length > 0 && (
    <div><dt>{titulo}</dt><dd>{items.join(' · ')}</dd></div>
  )
  return (
    <dl className="soap-grid mb-0 mt-2">
      {lista('Refracción', refraccion)}
      {datos.correccion && <div><dt>Corrección</dt><dd>{datos.correccion}</dd></div>}
      {lista('Antecedentes', datos.antecedentes)}
      {lista('Estudios', datos.estudios)}
      {datos.proximoControl && <div><dt>Próximo control</dt><dd>{datos.proximoControl}</dd></div>}
    </dl>
  )
}

function Dato({ k, v }) {
  return (
    <div>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  )
}
