import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Users, FileHeart, UserCheck, ArrowRight } from 'lucide-react'
import { PageHeader, StatCard, Card, Badge, Avatar, Loader, ErrorState } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { useVista } from '../context/VistaContext'
import { turnosApi, pacientesApi, profesionalesApi, evolucionesApi } from '../lib/api'
import { hoyISO } from '../lib/fecha'
import { nombreCompleto, ESTADOS_TURNO } from '../data/mock'

const EMPTY = [] // referencia estable para dependencias de useMemo

export default function Dashboard() {
  const { profId } = useVista()
  const { data, loading, error, reload } = useApi(
    () => Promise.all([
      turnosApi.list({ fecha: hoyISO(), profesional: profId }),
      pacientesApi.list({ profesional: profId }),
      profesionalesApi.list(),
      evolucionesApi.list({ profesional: profId }),
    ]).then(([turnos, pacientes, profesionales, evoluciones]) => ({ turnos, pacientes, profesionales, evoluciones })),
    [profId],
  )

  const turnos = data?.turnos ?? EMPTY
  const pacientes = data?.pacientes ?? EMPTY
  const evoluciones = data?.evoluciones ?? EMPTY
  const pacById = useMemo(() => Object.fromEntries(pacientes.map((p) => [p.id, p])), [pacientes])
  const profById = useMemo(() => Object.fromEntries((data?.profesionales ?? EMPTY).map((p) => [p.id, p])), [data])

  const hoy = turnos.length
  const confirmados = turnos.filter((t) => t.estado === 'confirmado' || t.estado === 'en_sala').length
  const atendidos = turnos.filter((t) => t.estado === 'atendido').length
  const proximos = [...turnos]
    .filter((t) => !['atendido', 'ausente'].includes(t.estado))
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .slice(0, 5)

  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <>
      <PageHeader title="Panel de control" subtitle={`Resumen operativo · ${fecha}`} />

      {loading ? (
        <Card><Loader label="Cargando panel…" /></Card>
      ) : error ? (
        <Card><ErrorState onRetry={reload}>{error}</ErrorState></Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={CalendarClock} tone="brand" label="Turnos de hoy" value={hoy} hint="Agenda del día" />
            <StatCard icon={UserCheck} tone="ok" label="Confirmados / en sala" value={confirmados} hint="Listos para atención" />
            <StatCard icon={FileHeart} tone="info" label="Atendidos" value={atendidos} hint="Consultas cerradas hoy" />
            <StatCard icon={Users} tone="warn" label="Pacientes activos" value={pacientes.length} hint="Registro total" />
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <Card
                title="Próximos turnos"
                actions={<Link to="/agenda" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">Ver agenda <ArrowRight size={15} /></Link>}
                bodyClass="p-0"
              >
                <div className="table-scroll">
                <table className="table-p">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Profesional</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proximos.map((t) => {
                      const pac = pacById[t.pacienteId]
                      const est = ESTADOS_TURNO[t.estado]
                      return (
                        <tr key={t.id}>
                          <td><strong>{t.hora}</strong></td>
                          <td>
                            <div className="pac-cell">
                              <Avatar {...pac} />
                              <div>
                                {nombreCompleto(pac)}
                                <small>{t.especialidad}</small>
                              </div>
                            </div>
                          </td>
                          <td>{profById[t.profId]?.nombre}</td>
                          <td><Badge tone={est.tone}>{est.label}</Badge></td>
                        </tr>
                      )
                    })}
                    {proximos.length === 0 && (
                      <tr><td colSpan={4} className="text-muted text-center py-4">No hay turnos pendientes para hoy.</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
              </Card>
            </div>

            <div className="col-lg-5">
              <Card title="Actividad clínica reciente" bodyClass="p-0">
                <div style={{ padding: '8px 20px 4px' }}>
                  {evoluciones.length === 0 && (
                    <p className="text-muted small py-3 mb-0">Sin evoluciones registradas.</p>
                  )}
                  {evoluciones.slice(0, 4).map((ev) => {
                    const pac = pacById[ev.pacienteId]
                    return (
                      <Link
                        key={ev.id}
                        to={`/pacientes/${ev.pacienteId}`}
                        className="file-row text-decoration-none"
                        style={{ color: 'inherit' }}
                      >
                        <Avatar {...pac} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500 }}>{nombreCompleto(pac)}</div>
                          <small style={{ color: 'var(--muted)' }}>
                            {ev.especialidad} · {ev.motivo}
                          </small>
                        </div>
                        <Badge tone="info">{ev.fecha.slice(5)}</Badge>
                      </Link>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}
