import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Card, Badge, Avatar, EmptyState } from '../ui'
import GridScroll from './GridScroll'
import { construirFranjas } from './franjas'
import { ESTADOS_TURNO, nombreCompleto } from '../../data/mock'

/** Vista Día:
 *  - Escritorio: grilla profesional × hora (celda ocupada → editar, vacía → nuevo).
 *  - Mobile: lista cronológica de turnos (mobile-first, sin scroll horizontal). */
export default function VistaDia({ turnos, profs, pacById, fecha, franja, onEditar, onNuevo }) {
  const franjas = useMemo(() => construirFranjas(turnos.map((t) => t.hora), franja), [turnos, franja])
  const profById = useMemo(() => Object.fromEntries(profs.map((p) => [p.id, p])), [profs])
  const lista = useMemo(() => [...turnos].sort((a, b) => a.hora.localeCompare(b.hora)), [turnos])
  const turnoEn = (profId, slot) => turnos.find((t) => t.profId === profId && t.hora === slot)

  if (!profs.length) {
    return <Card><p className="text-muted small mb-0 py-3 text-center">No hay profesionales para mostrar.</p></Card>
  }

  return (
    <>
      {/* Escritorio: grilla profesional × hora */}
      <Card bodyClass="p-0" className="d-none d-lg-block">
        <GridScroll deps={[profs.length, franjas.length]}>
          <div
            className="agenda-grid"
            style={{ gridTemplateColumns: `72px repeat(${profs.length}, minmax(168px, 1fr))` }}
          >
            <div className="agenda-corner" />
            {profs.map((p) => (
              <div key={p.id} className="agenda-col-head">
                <strong>{p.nombre}</strong>
                <span>{p.especialidad}</span>
              </div>
            ))}

            {franjas.map((slot) => (
              <div className="agenda-row" key={slot} style={{ display: 'contents' }}>
                <div className="agenda-time">{slot}</div>
                {profs.map((p) => {
                  const t = turnoEn(p.id, slot)
                  if (!t) {
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="agenda-cell empty-cell agenda-cell--btn"
                        title="Agendar turno"
                        onClick={() => onNuevo({ profId: p.id, hora: slot, fecha })}
                      />
                    )
                  }
                  const pac = pacById[t.pacienteId]
                  const est = ESTADOS_TURNO[t.estado]
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`agenda-cell ocupado agenda-cell--btn tone-${est.tone}`}
                      title={`${nombreCompleto(pac)} · ${est.label}`}
                      onClick={() => onEditar(t)}
                    >
                      <span className="ag-pac">{nombreCompleto(pac)}</span>
                      <span className="ag-motivo">{t.motivo || est.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </GridScroll>
      </Card>

      {/* Mobile: lista cronológica */}
      <div className="d-lg-none d-flex flex-column gap-3">
        {lista.length === 0 ? (
          <Card bodyClass="p-0">
            <EmptyState icon={CalendarClock} title="Sin turnos">No hay turnos para este día.</EmptyState>
          </Card>
        ) : (
          lista.map((t) => {
            const pac = pacById[t.pacienteId]
            const est = ESTADOS_TURNO[t.estado]
            return (
              <div className="turno-card" key={t.id} role="button" onClick={() => onEditar(t)}>
                <div className="turno-card__top">
                  <span className="turno-card__hora">{t.hora}</span>
                  <Badge tone={est.tone}>{est.label}</Badge>
                </div>
                <div className="pac-cell mb-2">
                  <Avatar {...pac} />
                  <div>{nombreCompleto(pac)}<small>DNI {pac?.dni}</small></div>
                </div>
                <div className="turno-card__meta">
                  <span>{profById[t.profId]?.nombre || '—'}</span>
                  {t.especialidad && <><span>·</span><span>{t.especialidad}</span></>}
                </div>
                {t.motivo && <div className="turno-card__motivo">{t.motivo}</div>}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
