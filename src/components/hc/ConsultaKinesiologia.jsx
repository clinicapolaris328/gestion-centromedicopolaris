import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { ZONAS_KINE, EVAL_KINE, TRATAMIENTOS_KINE } from '../../data/hc/kinesiologia'
import EsquemaCorporal from './EsquemaCorporal'
import '../../styles/hc.css'

const TABS = ['Motivo y zona', 'Dolor', 'Evaluación funcional', 'Tratamiento y evolución']

function Txt({ label, value, onChange, rows = 1, col = 'col-md-6', placeholder }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control as={rows > 1 ? 'textarea' : 'input'} rows={rows > 1 ? rows : undefined}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function Num({ label, value, onChange, unidad, col = 'col-6 col-md-3' }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control type="number" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={unidad} />
    </div>
  )
}

/** Formulario de sesión de Kinesiología (spec §14). Componente controlado:
 *  `value` = estado del form (KINE_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaKinesiologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setEval = (k) => (v) => onChange({ evaluacion: { ...value.evaluacion, [k]: v } })

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo, derivación y zona afectada (esquema corporal) */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <Txt label="Diagnóstico médico de derivación" col="col-12" value={value.diagnosticoDerivacion} onChange={set('diagnosticoDerivacion')} />
          <div className="col-12">
            <Form.Label>Zona afectada</Form.Label>
            <EsquemaCorporal zonas={ZONAS_KINE} seleccion={value.zonas} onToggle={toggle('zonas')} />
          </div>
        </div>
      )}

      {/* 2) Dolor */}
      {tab === 1 && (
        <div className="row g-3">
          <Num label="Dolor (EVA)" unidad="0–10" value={value.dolorEva} onChange={set('dolorEva')} />
          <Txt label="Inicio" col="col-6 col-md-3" value={value.dolorInicio} onChange={set('dolorInicio')} placeholder="Ej: hace 2 semanas" />
          <Txt label="Tipo" value={value.dolorTipo} onChange={set('dolorTipo')} placeholder="Ej: punzante, mecánico" />
          <Txt label="Localización" value={value.dolorLocalizacion} onChange={set('dolorLocalizacion')} />
          <Txt label="Irradiación" value={value.dolorIrradiacion} onChange={set('dolorIrradiacion')} />
          <Txt label="Factores agravantes" value={value.agravantes} onChange={set('agravantes')} />
          <Txt label="Factores atenuantes" value={value.atenuantes} onChange={set('atenuantes')} />
        </div>
      )}

      {/* 3) Evaluación funcional */}
      {tab === 2 && (
        <div className="row g-3">
          {EVAL_KINE.map(([k, label]) => (
            <Txt key={k} label={label} value={value.evaluacion[k]} onChange={setEval(k)} />
          ))}
        </div>
      )}

      {/* 4) Tratamiento realizado, evolución y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <Num label="Sesión N.º" value={value.sesionNumero} onChange={set('sesionNumero')} />
          <Num label="De un total de" value={value.sesionTotal} onChange={set('sesionTotal')} />
          <div className="col-12">
            <Form.Label>Tratamiento realizado</Form.Label>
            <div className="chk-grid">
              {TRATAMIENTOS_KINE.map((op) => (
                <label key={op} className={`chk ${value.tratamientos.includes(op) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={value.tratamientos.includes(op)} onChange={() => toggle('tratamientos')(op)} />
                  <span>{op}</span>
                </label>
              ))}
            </div>
          </div>
          {value.tratamientos.includes('Otro') && (
            <Txt label="Otro tratamiento" col="col-12" value={value.tratamientoOtro} onChange={set('tratamientoOtro')} />
          )}
          <Txt label="Evolución de la sesión" col="col-12" rows={3} value={value.evolucionSesion} onChange={set('evolucionSesion')} />
          <Num label="Dolor post tratamiento (EVA)" unidad="0–10" col="col-md-4" value={value.dolorPost} onChange={set('dolorPost')} />
          <Txt label="Objetivos" col="col-md-8" value={value.objetivos} onChange={set('objetivos')} />
          <Txt label="Plan de rehabilitación" col="col-md-8" rows={2} value={value.plan} onChange={set('plan')} />
          <Txt label="Próxima sesión" col="col-md-4" value={value.proximoControl} onChange={set('proximoControl')} placeholder="Ej: en 48 h" />
        </div>
      )}
    </div>
  )
}
