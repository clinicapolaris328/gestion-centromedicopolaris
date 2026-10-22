import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { SINTOMAS_REUMA, ARTICULACIONES, LAB_TEXTO, ACTIVIDAD } from '../../data/hc/reumatologia'
import '../../styles/hc.css'

const TABS = ['Motivo y dolor', 'Síntomas', 'Examen articular', 'Laboratorio y plan']

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

function Num({ label, value, onChange, unidad, decimal, col = 'col-6 col-md-3' }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control type="number" inputMode={decimal ? 'decimal' : 'numeric'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={unidad} />
    </div>
  )
}

/** Formulario de consulta de Reumatología (spec §16). Componente controlado:
 *  `value` = estado del form (REUMA_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaReumatologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setLab = (k, v) => onChange({ lab: { ...value.lab, [k]: v } })

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y dolor articular */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Localización del dolor</Form.Label>
            <Form.Control value={value.dolorLocalizacion} onChange={(e) => onChange({ dolorLocalizacion: e.target.value })} />
          </div>
          <Num label="Intensidad (EVA)" unidad="0–10" value={value.dolorEva} onChange={set('dolorEva')} />
          <div className="col-6 col-md-3">
            <Form.Label>Duración</Form.Label>
            <Form.Control value={value.dolorDuracion} onChange={(e) => onChange({ dolorDuracion: e.target.value })}
              placeholder="Ej: 3 meses" />
          </div>
          <Num label="Rigidez matinal" unidad="minutos" value={value.rigidezMatinal} onChange={set('rigidezMatinal')} />
        </div>
      )}

      {/* 2) Síntomas */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Síntomas</Form.Label>
            <Chks opciones={SINTOMAS_REUMA} seleccion={value.sintomas} onToggle={toggle('sintomas')} />
          </div>
          <div className="col-12">
            <Form.Label>Descripción / enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.sintomasDesc}
              onChange={(e) => onChange({ sintomasDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Examen articular */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Articulaciones afectadas</Form.Label>
            <Chks opciones={ARTICULACIONES} seleccion={value.articulaciones} onToggle={toggle('articulaciones')} />
          </div>
          <div className="col-12">
            <Form.Label>Examen articular (tumefacción, dolor a la palpación, movilidad…)</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.examen}
              onChange={(e) => onChange({ examen: e.target.value })} />
          </div>
        </div>
      )}

      {/* 4) Laboratorio, diagnóstico y tratamiento */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Laboratorio relevante</span></div>
          <Num label="PCR" unidad="mg/L" decimal value={value.pcr} onChange={set('pcr')} />
          <Num label="VSG" unidad="mm/h" value={value.vsg} onChange={set('vsg')} />
          {LAB_TEXTO.map(([k, label]) => (
            <div className="col-6 col-md-3" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control value={value.lab[k]} onChange={(e) => setLab(k, e.target.value)} />
            </div>
          ))}
          <div className="col-md-8">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Actividad de la enfermedad</Form.Label>
            <Form.Select value={value.actividad} onChange={(e) => onChange({ actividad: e.target.value })}>
              <option value="">—</option>
              {ACTIVIDAD.map((a) => <option key={a}>{a}</option>)}
            </Form.Select>
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento / plan</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Metotrexato 15mg/semana, Ácido fólico 5mg/semana" value={value.medicacion}
              onChange={(e) => onChange({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl}
              onChange={(e) => onChange({ proximoControl: e.target.value })} placeholder="Ej: 30 días" />
          </div>
        </div>
      )}
    </div>
  )
}
