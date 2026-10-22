import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Plus, AlertTriangle, BellRing, CalendarClock } from 'lucide-react'
import { Badge } from '../ui'
import GraficoEvolucion from './GraficoEvolucion'
import { metaDe, estadoValor, reglaAplicable, armarGraficos, claseValor } from '../../data/hc/variables'
import { PRIORIDAD, familiaDe, nombreFamilia } from '../../data/hc/dashboard'
import { hoyISO, fmtFechaCorta } from '../../lib/fecha'

/* Dashboard médico (C3a, spec §3): al abrir la HC, primero un resumen priorizado.
 * Es el resumen del paciente EN UNA ESPECIALIDAD (familia: agrupa sus variantes):
 *  - quien atiende como médico (rol profesional o vista de médico) ve SOLO su
 *    especialidad;
 *  - admin / secretaría eligen entre las especialidades que el paciente TIENE.
 * Se filtran por esa familia: última consulta, próximo turno, diagnósticos,
 * medicación, signos/gráficos (observaciones de esas evoluciones), estudios
 * (adjuntos a esas evoluciones o cargados por sus profesionales) y controles.
 * Las alertas de CONDICIÓN del paciente se muestran SIEMPRE, de cualquier
 * especialidad (seguridad del paciente, spec §27: una alergia es para todos).
 *  - Encabezado: última consulta, próximo turno y "Nueva evolución" (Gráficos y
 *    Estudios no se repiten acá: ya son sub-pestaña y pestaña de la ficha).
 *  - Alertas: las de CONDICIÓN del paciente + las REGLAS pautadas por el profesional
 *    que se disparan con el último valor (no se listan las de referencia: esas
 *    solo se ven en los gráficos, porque las alertas las pauta cada profesional).
 *  - Bloques en el orden de la especialidad (§3.4, data/hc/dashboard.js).
 * Solo lectura sobre datos existentes. Respeta la confidencialidad: las evoluciones
 * redactadas (`datos.restringida`) no aportan diagnósticos ni medicación. */

const legible = (ev) => !ev.datos?.restringida

function Bloque({ titulo, children, vacio }) {
  return (
    <div className="dash-bloque">
      <div className="dash-bloque__t">{titulo}</div>
      {vacio ? <div className="text-muted small">{vacio}</div> : children}
    </div>
  )
}

export default function DashboardMedico({
  evols: todasEvols, turnos: todosTurnos, estudios: todosEstudios, observaciones: todasObs,
  alertasPaciente, reglas, viewer, profById, fijo, sexo,
  onNuevaEvolucion, onIrGraficos, onAlerta,
}) {
  const espDe = (x) => x.especialidad || profById[x.profId]?.especialidad
  // Familia de un registro: la que manda el servidor (evolución/turno traen la de su
  // especialidad; estudio, la de su profesional). familiaDe solo cae al nombre si falta.
  const famDe = (x) => (x.especialidadFamilia !== undefined
    ? familiaDe(x.especialidad, x.especialidadFamilia)
    : familiaDe(profById[x.profId]?.especialidad, profById[x.profId]?.familia))
  // Especialidades (familias) que el paciente TIENE: evoluciones, turnos y estudios.
  const delPaciente = useMemo(() => {
    const m = new Map()
    for (const x of [...todasEvols, ...todosTurnos, ...todosEstudios]) {
      const esp = espDe(x); const f = famDe(x)
      if (f && !m.has(f)) m.set(f, nombreFamilia(f, esp))
    }
    return [...m.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasEvols, todosTurnos, todosEstudios, profById])
  const propia = familiaDe(viewer?.especialidad, viewer?.familia)
  const porDefecto = (propia && (fijo || delPaciente.some(([k]) => k === propia)) ? propia : null)
    || (todasEvols[0] ? famDe(todasEvols[0]) : null) || delPaciente[0]?.[0] || null
  const [elegida, setElegida] = useState(null)
  const familia = fijo ? propia : (elegida || porDefecto)
  const nombre = familia ? nombreFamilia(familia, delPaciente.find(([k]) => k === familia)?.[1] || viewer?.especialidad) : null

  // Datos del paciente SOLO de esa familia.
  const deFamilia = (x) => famDe(x) === familia
  const evols = todasEvols.filter(deFamilia)
  const ids = new Set(evols.map((e) => e.id))
  const turnos = todosTurnos.filter(deFamilia)
  // Estudios de la familia: adjuntos a una de sus evoluciones, cargados por un
  // profesional de la familia, o "sueltos" (sin profesional NI evolución → no
  // tienen especialidad; se muestran en todos los resúmenes para que un paciente
  // con estudios no figure "sin estudios"). Un estudio adjunto a la evolución de
  // OTRA familia no aparece acá (es de esa otra).
  const estudios = todosEstudios.filter((e) => ids.has(e.evolucionId) || (e.profId ? deFamilia(e) : !e.evolucionId))
  const observaciones = todasObs.filter((o) => ids.has(o.evolucionId))
  const graficos = armarGraficos(observaciones, reglas, viewer, sexo)
  const config = PRIORIDAD[familia] || PRIORIDAD.general

  // Último valor por variable (para vitales y alertas de reglas).
  const ultimos = useMemo(() => {
    const m = {}
    for (const o of observaciones) {
      if (o.valor == null) continue
      if (!m[o.variable] || o.fecha >= m[o.variable].fecha) m[o.variable] = { valor: o.valor, fecha: o.fecha }
    }
    return m
  }, [observaciones])

  const legibles = evols.filter(legible)
  const ultima = evols[0] || null
  const hoy = hoyISO()
  const proximo = [...turnos]
    .filter((t) => t.fecha >= hoy && !['cancelado', 'ausente', 'atendido'].includes(t.estado))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0] || null

  // Reglas pautadas que se disparan con el último valor.
  const disparadas = Object.entries(ultimos).flatMap(([variable, u]) => {
    const r = reglaAplicable(variable, reglas, viewer, sexo)
    if (r.origen !== 'personal' && r.origen !== 'especialidad') return []
    const est = estadoValor(variable, u.valor, r.rango)
    if (!est || est === 'ok') return []
    return [{ variable, ...u, est, ...r }]
  })
  const condiciones = alertasPaciente.filter((a) => a.activo)

  const render = (b, i) => {
    switch (b.tipo) {
      case 'alertas':
        return (
          <Bloque key={i} titulo="Alertas clínicas" vacio={!condiciones.length && !disparadas.length ? 'Sin alertas activas.' : null}>
            <div className="d-flex flex-wrap gap-2">
              {condiciones.map((a) => (
                <span key={a.id} className="badge-p tone-danger"><AlertTriangle size={12} /> {a.tipo}{a.detalle ? `: ${a.detalle}` : ''}</span>
              ))}
              {disparadas.map((d) => {
                const m = metaDe(d.variable)
                const lim = d.est === 'alto' ? `máx. ${d.rango[1]}` : `mín. ${d.rango[0]}`
                return (
                  <span key={d.variable} className="badge-p tone-warn" title={d.origen === 'personal' ? 'Alerta personal' : 'Alerta de la especialidad'}>
                    <BellRing size={12} /> {m.label} {d.valor}{m.unidad ? ` ${m.unidad}` : ''} ({lim}){d.mensaje ? ` — ${d.mensaje}` : ''}
                  </span>
                )
              })}
            </div>
          </Bloque>
        )
      case 'diagnosticos': {
        const vistos = new Set()
        const diag = legibles.filter((e) => e.diagnostico && !vistos.has(e.diagnostico) && vistos.add(e.diagnostico)).slice(0, 4)
        return (
          <Bloque key={i} titulo={b.titulo || 'Problemas activos y diagnósticos'} vacio={!diag.length ? 'Sin diagnósticos registrados.' : null}>
            <ul className="dash-lista">
              {diag.map((e) => <li key={e.id}><b>{e.diagnostico}</b> <span className="text-muted small">· {e.especialidad} · {e.fecha}</span></li>)}
            </ul>
          </Bloque>
        )
      }
      case 'medicacion': {
        const ev = legibles.find((e) => e.medicacion?.length)
        return (
          <Bloque key={i} titulo="Medicación actual" vacio={!ev ? 'Sin medicación registrada.' : null}>
            {ev && <>
              {ev.medicacion.map((m) => <span key={m} className="med-chip">{m}</span>)}
              <div className="text-muted small mt-1">Según la evolución del {ev.fecha} ({ev.especialidad})</div>
            </>}
          </Bloque>
        )
      }
      case 'vitales': {
        const vars = (b.vars || []).filter((v) => ultimos[v])
        return (
          <Bloque key={i} titulo={b.titulo} vacio={!vars.length ? 'Sin registros.' : null}>
            <div className="dash-vitales">
              {vars.map((v) => {
                const m = metaDe(v)
                const u = ultimos[v]
                const r = reglaAplicable(v, reglas, viewer, sexo)
                const est = estadoValor(v, u.valor, r.rango)
                const regla = r.origen === 'personal' || r.origen === 'especialidad'
                const clase = claseValor(v, u.valor)
                return (
                  <div key={v} className="dash-vital">
                    <div className="small text-muted">{m.label}</div>
                    <div><b>{u.valor}</b>{m.unidad ? ` ${m.unidad}` : ''} {est && est !== 'ok' && <Badge tone={regla ? 'danger' : 'warn'}>{est === 'alto' ? 'Alto' : 'Bajo'}</Badge>}</div>
                    {clase && <div className="small" title={`Clasificación orientativa${m.fuente ? ` (${m.fuente})` : ''}`}>{clase}</div>}
                    <div className="small text-muted">{u.fecha}</div>
                  </div>
                )
              })}
            </div>
          </Bloque>
        )
      }
      case 'estudios': {
        const lista = (b.tipos ? estudios.filter((e) => b.tipos.includes(e.tipo)) : estudios)
          .slice().sort((a, b2) => String(b2.fecha || '').localeCompare(String(a.fecha || ''))).slice(0, 3)
        return (
          <Bloque key={i} titulo={b.titulo} vacio={!lista.length ? 'Sin estudios cargados.' : null}>
            <ul className="dash-lista">
              {lista.map((e) => <li key={e.id}><b>{e.tipo}</b> <span className="text-muted small">· {e.fecha || '—'} · {e.nombre}</span></li>)}
            </ul>
          </Bloque>
        )
      }
      case 'tabaquismo': {
        const ev = legibles.find((e) => e.datos?.tabaquismo?.estado)
        const t = ev?.datos.tabaquismo
        return (
          <Bloque key={i} titulo="Tabaquismo" vacio={!t ? 'Sin datos de tabaquismo.' : null}>
            {t && <div><b>{t.estado}</b>{t.paquetesAnio != null ? ` · ${t.paquetesAnio} paquetes/año` : ''} <span className="text-muted small">· {ev.fecha}</span></div>}
          </Bloque>
        )
      }
      case 'graficos': {
        const gs = graficos.filter((g) => !b.vars || g.series.some((s) => b.vars.includes(s.variable))).slice(0, 4)
        return (
          <Bloque key={i} titulo={b.titulo || 'Gráficos'} vacio={!gs.length ? 'Todavía no hay variables para graficar.' : null}>
            <div className="row g-3">
              {gs.map((g) => (
                <div className="col-md-6" key={g.key}>
                  <div className="graf-card"><GraficoEvolucion titulo={g.titulo} unidad={g.unidad} series={g.series} rango={g.rango} onAlerta={onAlerta} /></div>
                </div>
              ))}
            </div>
            {gs.length > 0 && <Button size="sm" variant="link" className="p-0 mt-2" onClick={onIrGraficos}>Ver todos los gráficos</Button>}
          </Bloque>
        )
      }
      case 'timeline':
        return (
          <Bloque key={i} titulo="Últimas evoluciones" vacio={!evols.length ? 'Sin evoluciones.' : null}>
            <ul className="dash-lista">
              {evols.slice(0, 3).map((e) => (
                <li key={e.id}><b>{e.fecha}</b> <span className="text-muted small">· {e.especialidad} · {profById[e.profId]?.nombre || 'Profesional'} · {e.motivo}</span></li>
              ))}
            </ul>
          </Bloque>
        )
      case 'controles': {
        const ev = legibles.find((e) => e.datos?.proximoControl)
        return (
          <Bloque key={i} titulo="Próximos controles" vacio={!ev ? 'Sin controles indicados.' : null}>
            {ev && <div><b>{ev.datos.proximoControl}</b> <span className="text-muted small">· indicado el {ev.fecha} ({ev.especialidad})</span></div>}
          </Bloque>
        )
      }
      default:
        return null
    }
  }

  return (
    <div>
      {/* Encabezado: última consulta, próximo turno y Nueva evolución */}
      <div className="dash-head">
        <div className="dash-head__dato">
          <div className="small text-muted">Última consulta</div>
          <div>{ultima ? <><b>{ultima.fecha}</b> · {ultima.especialidad}</> : '—'}</div>
        </div>
        <div className="dash-head__dato">
          <div className="small text-muted">Próximo turno</div>
          <div>{proximo ? <><CalendarClock size={14} /> <b>{fmtFechaCorta(proximo.fecha)} {proximo.hora}</b> · {proximo.especialidad || profById[proximo.profId]?.especialidad || ''}</> : '—'}</div>
        </div>
        <div className="dash-head__acciones">
          <Button size="sm" className="d-inline-flex align-items-center gap-1" onClick={onNuevaEvolucion}><Plus size={14} /> Nueva evolución</Button>
        </div>
      </div>

      {/* Especialidad del resumen: fija para el médico; a elegir (solo entre las del paciente) para el resto */}
      <div className="d-flex align-items-center gap-2 flex-wrap my-3">
        <span className="dash-titulo">Resumen de {nombre || '—'}</span>
        {!fijo && delPaciente.length > 1 && delPaciente.map(([k, n]) => (
          <button key={k} type="button" className={`tab-p ${familia === k ? 'active' : ''}`} style={{ padding: '4px 10px' }} onClick={() => setElegida(k)}>
            {n}
          </button>
        ))}
      </div>

      {!familia || !evols.length && !turnos.length && !estudios.length ? (
        <>
          {render({ tipo: 'alertas' }, 'alertas')}
          <div className="text-muted small py-3">
            {familia ? `Este paciente todavía no tiene registros de ${nombre}.` : 'Este paciente todavía no tiene registros clínicos.'}
          </div>
        </>
      ) : config.bloques.map(render)}
    </div>
  )
}
