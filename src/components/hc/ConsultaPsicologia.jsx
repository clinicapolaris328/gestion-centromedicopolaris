import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { Lock } from 'lucide-react'
import { EVALUACION_PSI } from '../../data/hc/psicologia'
import '../../styles/hc.css'

const TABS = ['Motivo y contexto', 'Antecedentes', 'Evaluación', 'Seguimiento']

function Texto({ label, value, onChange, rows = 2, required, col = 'col-12' }) {
  return (
    <div className={col}>
      <Form.Label>{label}{required && ' *'}</Form.Label>
      <Form.Control as={rows > 1 ? 'textarea' : 'input'} rows={rows > 1 ? rows : undefined} required={required}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Formulario de consulta de Psicología (spec §12). Componente controlado:
 *  `value` = estado del form (PSICO_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaPsicologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const setEval = (k) => (v) => onChange({ evaluacion: { ...value.evaluacion, [k]: v } })

  return (
    <div className="hc-form">
      {/* Confidencialidad (§26/27): visible siempre, arriba de las pestañas */}
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

      {/* 1) Motivo de consulta y contexto */}
      {tab === 0 && (
        <div className="row g-3">
          <Texto label="Demanda principal (motivo de consulta)" rows={1} required value={value.motivo} onChange={set('motivo')} />
          <Texto label="Contexto familiar" col="col-md-6" value={value.contextoFamiliar} onChange={set('contextoFamiliar')} />
          <Texto label="Contexto laboral / escolar" col="col-md-6" value={value.contextoLaboral} onChange={set('contextoLaboral')} />
        </div>
      )}

      {/* 2) Antecedentes psicológicos */}
      {tab === 1 && (
        <div className="row g-3">
          <Texto label="Tratamientos previos" value={value.tratamientosPrevios} onChange={set('tratamientosPrevios')} />
          <Texto label="Situaciones relevantes" value={value.situacionesRelevantes} onChange={set('situacionesRelevantes')} />
        </div>
      )}

      {/* 3) Evaluación */}
      {tab === 2 && (
        <div className="row g-3">
          {EVALUACION_PSI.map(([k, label]) => (
            <Texto key={k} label={label} col="col-md-6" rows={1} value={value.evaluacion[k]} onChange={setEval(k)} />
          ))}
        </div>
      )}

      {/* 4) Seguimiento */}
      {tab === 3 && (
        <div className="row g-3">
          <Texto label="Objetivos terapéuticos" value={value.objetivos} onChange={set('objetivos')} />
          <Texto label="Evolución de la sesión" rows={5} value={value.evolucionSesion} onChange={set('evolucionSesion')} />
          <Texto label="Intervenciones realizadas" value={value.intervenciones} onChange={set('intervenciones')} />
          <Texto label="Plan terapéutico" col="col-md-8" value={value.plan} onChange={set('plan')} />
          <div className="col-md-4">
            <Form.Label>Próxima sesión</Form.Label>
            <Form.Control value={value.proximaSesion} onChange={(e) => onChange({ proximaSesion: e.target.value })}
              placeholder="Ej: 7 días" />
          </div>
        </div>
      )}
    </div>
  )
}
