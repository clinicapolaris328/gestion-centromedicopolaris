import { useMemo } from 'react'
import { Card } from '../ui'
import { inicioMes, finMes, inicioSemana, finSemana, diasEntre, parseISO } from '../../lib/fecha'

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Calendario mensual con la cantidad de turnos por día. Clic en un día → Día. */
export default function VistaMes({ turnos, fecha, hoy, onDiaClick }) {
  const mesActual = fecha.slice(0, 7)

  const { dias, conteo } = useMemo(() => {
    const gridIni = inicioSemana(inicioMes(fecha))
    const gridFin = finSemana(finMes(fecha))
    const conteo = {}
    for (const t of turnos) conteo[t.fecha] = (conteo[t.fecha] || 0) + 1
    return { dias: diasEntre(gridIni, gridFin), conteo }
  }, [turnos, fecha])

  return (
    <Card bodyClass="p-0">
      <div className="mes-grid">
        {DOW.map((d) => <div key={d} className="mes-dow">{d}</div>)}
        {dias.map((d) => {
          const fueraDeMes = d.slice(0, 7) !== mesActual
          const n = conteo[d] || 0
          return (
            <button
              key={d}
              type="button"
              className={`mes-dia ${fueraDeMes ? 'mes-dia--fuera' : ''} ${d === hoy ? 'mes-dia--hoy' : ''} ${n ? 'mes-dia--con' : ''}`}
              onClick={() => onDiaClick(d)}
              title={n ? `${n} turno${n > 1 ? 's' : ''}` : 'Sin turnos'}
            >
              <span className="mes-dia__num">{parseISO(d).getDate()}</span>
              {n > 0 && <span className="mes-dia__badge">{n}</span>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
