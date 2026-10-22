import { useMemo } from 'react'
import { Card } from '../ui'
import {
  inicioMes, finMes, inicioSemana, finSemana, diasEntre, parseISO, NOMBRES_MES,
} from '../../lib/fecha'

// Intensidad de color según cantidad de turnos en el día (heatmap).
const nivel = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4)

function MesMini({ anio, mes, conteo, mesActual, hoy, onMesClick }) {
  const mesIso = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  const { dias, total } = useMemo(() => {
    const dd = diasEntre(inicioSemana(inicioMes(mesIso)), finSemana(finMes(mesIso)))
    let total = 0
    for (const d of dd) if (d.slice(0, 7) === mesIso.slice(0, 7)) total += conteo[d] || 0
    return { dias: dd, total }
  }, [mesIso, conteo])

  return (
    <button
      type="button"
      className={`anio-mes ${mesIso.slice(0, 7) === mesActual ? 'anio-mes--actual' : ''}`}
      onClick={() => onMesClick(mesIso)}
      title={`${NOMBRES_MES[mes]}: ${total} turno${total !== 1 ? 's' : ''}`}
    >
      <div className="anio-mes__head">
        <span className="anio-mes__nombre">{NOMBRES_MES[mes]}</span>
        <span className={`anio-mes__total ${total === 0 ? 'anio-mes__total--cero' : ''}`}>
          {total} <span className="anio-mes__total-lbl">turno{total === 1 ? '' : 's'}</span>
        </span>
      </div>
      <div className="anio-mes__dow">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="anio-mes__grid">
        {dias.map((d) => {
          const fuera = d.slice(0, 7) !== mesIso.slice(0, 7)
          const n = fuera ? 0 : (conteo[d] || 0)
          return (
            <span
              key={d}
              className={`anio-dia heat-${nivel(n)} ${fuera ? 'anio-dia--fuera' : ''} ${d === hoy ? 'anio-dia--hoy' : ''}`}
            >
              {fuera ? '' : parseISO(d).getDate()}
            </span>
          )
        })}
      </div>
    </button>
  )
}

/** Resumen anual: 12 meses con mini-calendario (días numerados) coloreados por
 *  ocupación. Clic en un mes → vista Mes. */
export default function VistaAnio({ turnos, fecha, hoy, onMesClick }) {
  const anio = Number(fecha.slice(0, 4))
  const mesActual = hoy.slice(0, 7)
  const conteo = useMemo(() => {
    const c = {}
    for (const t of turnos) c[t.fecha] = (c[t.fecha] || 0) + 1
    return c
  }, [turnos])

  return (
    <Card bodyClass="p-0">
      <div className="anio-grid">
        {Array.from({ length: 12 }, (_, m) => (
          <MesMini
            key={m}
            anio={anio}
            mes={m}
            conteo={conteo}
            mesActual={mesActual}
            hoy={hoy}
            onMesClick={onMesClick}
          />
        ))}
      </div>
      <div className="anio-leyenda">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`anio-cel heat-${l}`} />)}
        <span>Más</span>
      </div>
    </Card>
  )
}
