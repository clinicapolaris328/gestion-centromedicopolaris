import { useMemo } from 'react'
import { Card } from '../ui'
import GridScroll from './GridScroll'
import { construirFranjas } from './franjas'
import { fmtDiaSemana, fmtFechaCorta } from '../../lib/fecha'
import { ESTADOS_TURNO, nombreCompleto } from '../../data/mock'

/** Grilla semanal (7 días × hora). Si hay un profesional elegido muestra solo el
 *  suyo; si no, muestra TODOS los profesionales (varios turnos por celda). */
export default function VistaSemana({ turnos, prof, profById = {}, dias, pacById, hoy, franja, onEditar, onNuevo }) {
  const visibles = useMemo(
    () => (prof ? turnos.filter((t) => t.profId === prof.id) : turnos),
    [turnos, prof],
  )
  const franjas = useMemo(() => construirFranjas(visibles.map((t) => t.hora), franja), [visibles, franja])
  const turnosEn = (dia, slot) => visibles.filter((t) => t.fecha === dia && t.hora === slot)

  return (
    <Card bodyClass="p-0">
      <GridScroll deps={[franjas.length, visibles.length]}>
        <div
          className="agenda-grid"
          style={{ gridTemplateColumns: `72px repeat(7, minmax(120px, 1fr))` }}
        >
          <div className="agenda-corner" />
          {dias.map((d) => (
            <div key={d} className={`agenda-col-head ${d === hoy ? 'agenda-col-head--hoy' : ''}`}>
              <strong style={{ textTransform: 'capitalize' }}>{fmtDiaSemana(d)}</strong>
              <span>{fmtFechaCorta(d)}</span>
            </div>
          ))}

          {franjas.map((slot) => (
            <div className="agenda-row" key={slot} style={{ display: 'contents' }}>
              <div className="agenda-time">{slot}</div>
              {dias.map((d) => {
                const cell = turnosEn(d, slot)
                if (!cell.length) {
                  return (
                    <button
                      key={d}
                      type="button"
                      className="agenda-cell empty-cell agenda-cell--btn"
                      title="Agendar turno"
                      onClick={() => onNuevo({ profId: prof?.id, hora: slot, fecha: d })}
                    />
                  )
                }
                return (
                  <div key={d} className="agenda-cell agenda-cell--multi">
                    {cell.map((t) => {
                      const pac = pacById[t.pacienteId]
                      const est = ESTADOS_TURNO[t.estado]
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`ag-chip tone-${est.tone}`}
                          title={`${nombreCompleto(pac)} · ${est.label}`}
                          onClick={() => onEditar(t)}
                        >
                          <span className="ag-pac">{nombreCompleto(pac)}</span>
                          <small>{prof ? (t.motivo || est.label) : (profById[t.profId]?.nombre || est.label)}</small>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </GridScroll>
    </Card>
  )
}
