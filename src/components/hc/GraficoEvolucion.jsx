import { BellRing } from 'lucide-react'
import { Badge } from '../ui'
import { estadoValor, claseValor, metaDe } from '../../data/hc/variables'

/* Gráfico de evolución longitudinal de una variable (o par, ej. TA sist/diast).
 * SVG propio (sin dependencias), escalado al ancho por viewBox. Principios dataviz:
 * línea temporal, marcas finas, ejes recesivos, 1 serie sin leyenda (el título la
 * nombra), colores de estado con etiqueta para fuera de rango, tooltip al hover.
 * C3: cada serie puede traer el rango de la ALERTA pautada por el profesional
 * (`s.rango`, `s.origen`, `s.mensaje`); si no hay, se usa la referencia orientativa.
 * Una alerta pautada fuera de rango se marca distinto (peligro) que la referencia. */

const W = 340, H = 150, PAD_L = 40, PAD_R = 14, PAD_T = 12, PAD_B = 22
const TONO = { alto: 'warn', bajo: 'warn', ok: 'ok' }
const ETIQUETA = { alto: 'Alto', bajo: 'Bajo', ok: 'En rango' }
const ORIGEN = { personal: 'Alerta personal', especialidad: 'Alerta de la especialidad', referencia: 'Referencia orientativa' }
const esRegla = (o) => o === 'personal' || o === 'especialidad'
const fueraDeRango = (s) => {
  const e = estadoValor(s.variable, s.puntos[s.puntos.length - 1]?.valor, s.rango)
  return !!e && e !== 'ok'
}

/** series = [{ variable, nombre, color?, puntos: [{fecha, valor}], rango?, origen?, mensaje? }];
 *  rango = [min,max]|null (banda); onAlerta(variable) → abre la pauta de alerta. */
export default function GraficoEvolucion({ titulo, unidad, series, rango = null, onAlerta }) {
  const fechas = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.fecha)))].sort()
  const valores = series.flatMap((s) => s.puntos.map((p) => p.valor)).filter((v) => v != null)
  if (!valores.length) return null

  let lo = Math.min(...valores), hi = Math.max(...valores)
  if (rango) { if (rango[0] != null) lo = Math.min(lo, rango[0]); if (rango[1] != null) hi = Math.max(hi, rango[1]) }
  if (lo === hi) { lo -= 1; hi += 1 }
  const m = (hi - lo) * 0.12 || 1
  lo -= m; hi += m

  // Extremos del eje con los decimales que exige el rango (ej. FEV1 1,6–1,9 L o
  // ICC 0,9 no pueden redondearse a enteros: los dos extremos quedarían iguales).
  const dec = hi - lo < 1 ? 2 : hi - lo < 10 ? 1 : 0
  const tick = (v) => Number(v.toFixed(dec))
  const n = fechas.length
  const idx = Object.fromEntries(fechas.map((f, i) => [f, i]))
  const xFor = (f) => (n <= 1 ? PAD_L + (W - PAD_L - PAD_R) / 2 : PAD_L + (idx[f] / (n - 1)) * (W - PAD_L - PAD_R))
  const yFor = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B)
  const multi = series.length > 1

  return (
    <div className="graf">
      <div className="graf__head">
        <div className="graf__titulo">{titulo} {unidad && <span className="graf__u">{unidad}</span>}</div>
        <div className="graf__ult">
          {series.map((s) => {
            const u = s.puntos[s.puntos.length - 1]
            if (!u) return null
            const est = estadoValor(s.variable, u.valor, s.rango)
            const tono = est && est !== 'ok' && esRegla(s.origen) ? 'danger' : TONO[est]
            return (
              <span key={s.variable} className="graf__val">
                {multi && <i className="graf__dot" style={{ background: s.color }} />}
                <b>{u.valor}</b>{multi ? ` ${s.nombre}` : ''}
                {est && <Badge tone={tono}>{ETIQUETA[est]}</Badge>}
                {!multi && claseValor(s.variable, u.valor) && (
                  <span className="text-muted small" title={`Clasificación orientativa${metaDe(s.variable).fuente ? ` (${metaDe(s.variable).fuente})` : ''}`}>
                    {claseValor(s.variable, u.valor)}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>
      {series.some((s) => s.origen) && (
        <div className="graf__origen">
          {[...new Set(series.map((s) => s.origen).filter(Boolean))].map((o) => ORIGEN[o]).join(' · ')}
          {series.filter((s) => esRegla(s.origen) && s.mensaje && fueraDeRango(s))
            .map((s) => <div key={s.variable} className="graf__msg">{multi ? `${s.nombre}: ` : ''}{s.mensaje}</div>)}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="graf__svg" role="img" aria-label={`Evolución de ${titulo}`}>
        {rango && rango[0] != null && rango[1] != null && (
          <rect className="graf__banda" x={PAD_L} width={W - PAD_L - PAD_R}
            y={yFor(rango[1])} height={Math.max(0, yFor(rango[0]) - yFor(rango[1]))} />
        )}
        <line className="graf__eje" x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} />
        <text className="graf__tick" x={PAD_L - 5} y={yFor(hi) + 3} textAnchor="end">{tick(hi)}</text>
        <text className="graf__tick" x={PAD_L - 5} y={yFor(lo) + 3} textAnchor="end">{tick(lo)}</text>

        {series.map((s) => {
          const pts = [...s.puntos].sort((a, b) => a.fecha.localeCompare(b.fecha))
          const poly = pts.map((p) => `${xFor(p.fecha)},${yFor(p.valor)}`).join(' ')
          return (
            <g key={s.variable}>
              {pts.length > 1 && (
                <polyline className="graf__linea" points={poly} style={s.color ? { stroke: s.color } : undefined} />
              )}
              {pts.map((p, i) => (
                <circle key={i} className="graf__pt" cx={xFor(p.fecha)} cy={yFor(p.valor)}
                  r={i === pts.length - 1 ? 4 : 3} style={s.color ? { fill: s.color } : undefined}>
                  <title>{p.fecha}: {p.valor}{unidad ? ` ${unidad}` : ''}{multi ? ` · ${s.nombre}` : ''}</title>
                </circle>
              ))}
            </g>
          )
        })}

        <text className="graf__tick" x={PAD_L} y={H - 6}>{fechas[0]?.slice(5)}</text>
        {n > 1 && <text className="graf__tick" x={W - PAD_R} y={H - 6} textAnchor="end">{fechas[n - 1]?.slice(5)}</text>}
      </svg>
      {onAlerta && (
        <div className="d-flex flex-wrap gap-1 mt-1">
          {series.map((s) => (
            <button key={s.variable} type="button" className="btn btn-link btn-sm p-0 d-inline-flex align-items-center gap-1 text-decoration-none"
              onClick={() => onAlerta(s.variable)}>
              <BellRing size={13} /> {multi ? `Alerta ${s.nombre.toLowerCase()}` : 'Pautar alerta'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
