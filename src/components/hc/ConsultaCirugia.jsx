import { useState } from 'react'
import { Form } from 'react-bootstrap'
import {
  ETAPAS, RIESGO_ASA, ESTUDIOS_PREQX, CONSENTIMIENTO, ANESTESIA, HERIDA,
} from '../../data/hc/cirugia'
import '../../styles/hc.css'

const TABS = ['Motivo y preoperatorio', 'Cirugía', 'Postoperatorio', 'Diagnóstico y alta']

function Chks({ opciones, seleccion, onToggle }) {
  return (
    <div className="chk-grid">
      {opciones.map((op) => (
        <label key={op} className={`chk ${seleccion.includes(op) ? 'is-on' : ''}`}>
          <input type="checkbox" checked={seleccion.includes(op)} onChange={() => onToggle(op)} />
          <span>{op}</span>
        </label>
      ))}
    </div>
  )
}

function Sel({ label, value, opciones, onChange, col = 'col-md-4' }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {opciones.map((o) => <option key={o}>{o}</option>)}
      </Form.Select>
    </div>
  )
}

function Txt({ label, value, onChange, rows = 1, col = 'col-md-6', type, placeholder }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control as={rows > 1 ? 'textarea' : 'input'} rows={rows > 1 ? rows : undefined} type={type}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

/** Formulario de Cirugía (spec §17). Componente controlado:
 *  `value` = estado del form (CX_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaCirugia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo, antecedentes y evaluación preoperatoria */}
      {tab === 0 && (
        <div className="row g-3">
          <Sel label="Etapa" value={value.etapa} opciones={ETAPAS} onChange={set('etapa')} />
          <div className="col-md-8">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <Txt label="Enfermedad actual" col="col-12" rows={2} value={value.enfermedadActual} onChange={set('enfermedadActual')} />
          <Txt label="Antecedentes quirúrgicos" col="col-12" rows={2} value={value.antecedentesQx} onChange={set('antecedentesQx')} />
          <div className="col-12"><span className="hc-sub">Evaluación preoperatoria</span></div>
          <Sel label="Riesgo (ASA)" value={value.riesgo} opciones={RIESGO_ASA} onChange={set('riesgo')} />
          <Sel label="Consentimiento informado" value={value.consentimiento} opciones={CONSENTIMIENTO} onChange={set('consentimiento')} />
          <div className="col-12">
            <Form.Label>Estudios, laboratorio, imágenes</Form.Label>
            <Chks opciones={ESTUDIOS_PREQX} seleccion={value.estudiosPreqx} onToggle={toggle('estudiosPreqx')} />
          </div>
          <Txt label="Resultados / observaciones de estudios" col="col-12" rows={2} value={value.estudiosDesc} onChange={set('estudiosDesc')} />
          <Txt label="Procedimiento propuesto" col="col-12" value={value.procedimientoPropuesto} onChange={set('procedimientoPropuesto')} />
        </div>
      )}

      {/* 2) Cirugía */}
      {tab === 1 && (
        <div className="row g-3">
          <Txt label="Fecha de la cirugía" col="col-md-4" type="date" value={value.fechaCirugia} onChange={set('fechaCirugia')} />
          <Txt label="Procedimiento realizado" col="col-md-8" value={value.procedimientoRealizado} onChange={set('procedimientoRealizado')} />
          <Txt label="Cirujano" value={value.cirujano} onChange={set('cirujano')} />
          <Txt label="Ayudantes" value={value.ayudantes} onChange={set('ayudantes')} />
          <Sel label="Anestesia" value={value.anestesia} opciones={ANESTESIA} onChange={set('anestesia')} />
        </div>
      )}

      {/* 3) Evolución postoperatoria */}
      {tab === 2 && (
        <div className="row g-3">
          <Sel label="Herida" value={value.herida} opciones={HERIDA} onChange={set('herida')} />
          <Txt label="Drenajes" col="col-md-8" value={value.drenajes} onChange={set('drenajes')} />
          <div className="col-6 col-md-3">
            <Form.Label>Dolor (EVA)</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.dolorEva}
              onChange={(e) => onChange({ dolorEva: e.target.value })} placeholder="0–10" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Temperatura</Form.Label>
            <Form.Control type="number" inputMode="decimal" value={value.temperatura}
              onChange={(e) => onChange({ temperatura: e.target.value })} placeholder="°C" />
          </div>
          <div className="col-12 col-md-3 d-flex align-items-end">
            <label className={`chk ${value.fiebre ? 'is-on' : ''}`} style={{ width: '100%' }}>
              <input type="checkbox" checked={value.fiebre} onChange={(e) => onChange({ fiebre: e.target.checked })} />
              <span>Fiebre</span>
            </label>
          </div>
          <Txt label="Complicaciones" col="col-12" rows={2} value={value.complicaciones} onChange={set('complicaciones')} />
        </div>
      )}

      {/* 4) Diagnóstico, curaciones, indicaciones y alta */}
      {tab === 3 && (
        <div className="row g-3">
          <Txt label="Diagnóstico quirúrgico" col="col-12" rows={2} value={value.diagnostico} onChange={set('diagnostico')} />
          <Txt label="Curaciones" value={value.curaciones} onChange={set('curaciones')} />
          <Txt label="Retiro de puntos" value={value.retiroPuntos} onChange={set('retiroPuntos')} placeholder="Ej: a los 10 días" />
          <Txt label="Indicaciones" col="col-12" rows={2} value={value.tratamiento} onChange={set('tratamiento')} />
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Ketorolac 10mg c/8h, Cefalexina 500mg c/6h" value={value.medicacion}
              onChange={(e) => onChange({ medicacion: e.target.value })} />
          </div>
          <Txt label="Próximo control" col="col-md-4" value={value.proximoControl} onChange={set('proximoControl')} placeholder="Ej: 7 días" />
          <div className="col-12">
            <label className={`chk ${value.alta ? 'is-on' : ''}`}>
              <input type="checkbox" checked={value.alta} onChange={(e) => onChange({ alta: e.target.checked })} />
              <span>Alta quirúrgica</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
