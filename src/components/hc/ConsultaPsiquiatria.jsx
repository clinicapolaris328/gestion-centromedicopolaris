import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { EXAMEN_MENTAL, RIESGOS, NIVEL_RIESGO, MED_VACIA } from '../../data/hc/psiquiatria'
import '../../styles/hc.css'

const TABS = ['Motivo y antecedentes', 'Medicación', 'Examen mental', 'Riesgo y plan']

function Txt({ label, value, onChange, rows = 1, col = 'col-12', placeholder }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control as={rows > 1 ? 'textarea' : 'input'} rows={rows > 1 ? rows : undefined}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

/** Formulario de consulta de Psiquiatría (spec §13). Componente controlado:
 *  `value` = estado del form (PSQ_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaPsiquiatria({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const setExamen = (k) => (v) => onChange({ examen: { ...value.examen, [k]: v } })
  const setRiesgo = (k, v) => onChange({ riesgo: { ...value.riesgo, [k]: v } })
  const setMed = (i, k, v) => onChange({ medicacion: value.medicacion.map((m, j) => (j === i ? { ...m, [k]: v } : m)) })

  return (
    <div className="hc-form">
      {/* Confidencialidad (§26/27): visible siempre, arriba de las pestañas (igual que Psicología) */}
      <label className={`chk mb-3 ${value.confidencial ? 'is-on' : ''}`} style={{ width: '100%' }}>
        <input type="checkbox" checked={value.confidencial} onChange={(e) => onChange({ confidencial: e.target.checked })} />
        <span className="d-inline-flex align-items-center gap-1">
          <Lock size={14} /> Nota confidencial — solo la ve el profesional tratante; el resto ve que existe, sin su contenido
        </span>
      </label>

      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo, enfermedad actual y antecedentes psiquiátricos */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <Txt label="Enfermedad actual" rows={3} value={value.enfermedadActual} onChange={set('enfermedadActual')} />
          <div className="col-12"><span className="hc-sub">Antecedentes psiquiátricos</span></div>
          <Txt label="Diagnósticos previos" col="col-md-6" value={value.diagnosticosPrevios} onChange={set('diagnosticosPrevios')} />
          <Txt label="Internaciones" col="col-md-6" value={value.internaciones} onChange={set('internaciones')} />
          <div className="col-md-4 d-flex align-items-end">
            <label className={`chk ${value.intentosAutolesivos ? 'is-on' : ''}`} style={{ width: '100%' }}>
              <input type="checkbox" checked={value.intentosAutolesivos}
                onChange={(e) => onChange({ intentosAutolesivos: e.target.checked })} />
              <span>Intentos autolesivos previos</span>
            </label>
          </div>
          {value.intentosAutolesivos && (
            <Txt label="Detalle de intentos autolesivos" col="col-md-8" value={value.intentosDetalle} onChange={set('intentosDetalle')} />
          )}
          <Txt label="Tratamientos anteriores" rows={2} value={value.tratamientosAnteriores} onChange={set('tratamientosAnteriores')} />
        </div>
      )}

      {/* 2) Medicación psiquiátrica (filas) */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Medicación psiquiátrica</Form.Label>
            {value.medicacion.length === 0 && <p className="text-muted small mb-2">Sin medicación registrada.</p>}
            {value.medicacion.map((m, i) => (
              <div className="row g-2 mb-2" key={i}>
                <div className="col-12 col-md-5">
                  <Form.Control size="sm" placeholder="Medicamento" value={m.medicamento} onChange={(e) => setMed(i, 'medicamento', e.target.value)} />
                </div>
                <div className="col-5 col-md-3">
                  <Form.Control size="sm" placeholder="Dosis" value={m.dosis} onChange={(e) => setMed(i, 'dosis', e.target.value)} />
                </div>
                <div className="col-4 col-md-2">
                  <Form.Control size="sm" placeholder="Horario" value={m.horario} onChange={(e) => setMed(i, 'horario', e.target.value)} />
                </div>
                <div className="col-3 col-md-2">
                  <Button size="sm" variant="outline-danger" className="w-100" title="Quitar"
                    onClick={() => onChange({ medicacion: value.medicacion.filter((_, j) => j !== i) })}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
              onClick={() => onChange({ medicacion: [...value.medicacion, { ...MED_VACIA }] })}>
              <Plus size={14} /> Agregar medicamento
            </Button>
          </div>
          <Txt label="Respuesta y efectos adversos" rows={2} value={value.respuestaEfectos} onChange={set('respuestaEfectos')} />
        </div>
      )}

      {/* 3) Examen mental (campos estructurados) */}
      {tab === 2 && (
        <div className="row g-3">
          {EXAMEN_MENTAL.map(([k, label]) => (
            <Txt key={k} label={label} col="col-md-6" value={value.examen[k]} onChange={setExamen(k)} />
          ))}
        </div>
      )}

      {/* 4) Evaluación de riesgo, diagnóstico, plan y seguimiento */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Evaluación de riesgo</span></div>
          {RIESGOS.map(([k, label]) => (
            <div className="col-md-4" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Select value={value.riesgo[k]} onChange={(e) => setRiesgo(k, e.target.value)}>
                <option value="">No evaluado</option>
                {NIVEL_RIESGO.map((n) => <option key={n}>{n}</option>)}
              </Form.Select>
            </div>
          ))}
          <Txt label="Diagnóstico" rows={2} value={value.diagnostico} onChange={set('diagnostico')} />
          <Txt label="Plan terapéutico" rows={2} value={value.plan} onChange={set('plan')} />
          <Txt label="Indicaciones" col="col-md-8" value={value.indicaciones} onChange={set('indicaciones')} />
          <Txt label="Seguimiento" col="col-md-4" value={value.seguimiento} onChange={set('seguimiento')} placeholder="Ej: 15 días" />
        </div>
      )}
    </div>
  )
}
