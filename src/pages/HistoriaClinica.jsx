import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Form } from 'react-bootstrap'
import { FileHeart, ArrowRight, Stethoscope } from 'lucide-react'
import { PageHeader, Card, Badge, Avatar, EmptyState, Loader, ErrorState } from '../components/ui'
import BuscadorSelect from '../components/ui/BuscadorSelect'
import { useApi } from '../hooks/useApi'
import { evolucionesApi, pacientesApi, profesionalesApi, catalogosApi } from '../lib/api'
import { nombreCompleto } from '../data/mock'

const EMPTY = []

export default function HistoriaClinica() {
  // Módulo transversal: todos ven las evoluciones de todos los pacientes.
  const { data, loading, error, reload } = useApi(
    () => Promise.all([
      evolucionesApi.list(), pacientesApi.list(), profesionalesApi.list(), catalogosApi.especialidades(),
    ]).then(([evoluciones, pacientes, profesionales, esps]) => ({
      evoluciones, pacientes, profesionales, especialidades: esps.map((e) => e.nombre),
    })),
    [],
  )
  const [esp, setEsp] = useState('')
  const [prof, setProf] = useState('')
  const [q, setQ] = useState('')

  const evoluciones = data?.evoluciones ?? EMPTY
  const profesionales = data?.profesionales ?? EMPTY
  const especialidades = data?.especialidades ?? EMPTY
  const pacById = useMemo(() => Object.fromEntries((data?.pacientes ?? EMPTY).map((p) => [p.id, p])), [data])
  const profById = useMemo(() => Object.fromEntries(profesionales.map((p) => [p.id, p])), [profesionales])

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...evoluciones]
      .filter((e) => !esp || e.especialidad === esp)
      .filter((e) => !prof || e.profId === prof)
      .filter((e) => {
        if (!s) return true
        const pac = pacById[e.pacienteId]
        return (
          nombreCompleto(pac).toLowerCase().includes(s) ||
          (e.diagnostico || '').toLowerCase().includes(s) ||
          (e.motivo || '').toLowerCase().includes(s)
        )
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [evoluciones, esp, prof, q, pacById])

  return (
    <>
      <PageHeader
        title="Evoluciones"
        subtitle="Vista transversal de todas las evoluciones — buscá y filtrá por especialidad, profesional o paciente"
      />

      {loading ? (
        <Card><Loader label="Cargando evoluciones…" /></Card>
      ) : error ? (
        <Card><ErrorState onRetry={reload}>{error}</ErrorState></Card>
      ) : (
        <>
          <div className="filter-bar">
            <Form.Control
              style={{ maxWidth: 320 }}
              placeholder="Buscar por paciente, diagnóstico o motivo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <BuscadorSelect value={esp} onChange={setEsp} opciones={especialidades} placeholder="Todas las especialidades" />
            <BuscadorSelect value={prof} onChange={setProf}
              opciones={profesionales.map((p) => ({ value: p.id, label: p.nombre }))} placeholder="Todos los profesionales" />
            <span className="text-muted small ms-auto">{lista.length} evoluciones</span>
          </div>

          {lista.length === 0 ? (
            <Card><EmptyState icon={FileHeart} title="Sin evoluciones">No hay registros para el filtro aplicado.</EmptyState></Card>
          ) : (
            <div className="d-flex flex-column gap-3">
              {lista.map((ev) => {
                const pac = pacById[ev.pacienteId]
                return (
                  <div className="card-p" key={ev.id}>
                    <div className="card-p__body">
                      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                        <Avatar {...pac} />
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontWeight: 600 }}>{nombreCompleto(pac)}</div>
                          <small className="text-muted">DNI {pac?.dni} · {pac?.obraSocial}</small>
                        </div>
                        <span className="d-inline-flex align-items-center gap-1 text-nowrap"
                          style={{ fontWeight: 600, color: 'var(--navy)' }}>
                          <Stethoscope size={15} /> {profById[ev.profId]?.nombre || 'Profesional'}
                        </span>
                        <Badge tone="brand">{ev.especialidad}</Badge>
                        <Badge tone="info">{ev.fecha}</Badge>
                        <Link to={`/pacientes/${ev.pacienteId}`}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                          Ver ficha <ArrowRight size={14} />
                        </Link>
                      </div>
                      <div className="row g-3">
                        <Campo col={4} k="Motivo" v={ev.motivo} />
                        <Campo col={4} k="Diagnóstico" v={ev.diagnostico} />
                        <Campo col={4} k="Plan" v={ev.plan} />
                      </div>
                      {ev.medicacion?.length > 0 && (
                        <div className="text-muted small mt-2">{ev.medicacion.length} indicación(es)</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}

function Campo({ col, k, v }) {
  return (
    <div className={`col-md-${col}`}>
      <div className="k" style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 14 }}>{v || '—'}</div>
    </div>
  )
}
