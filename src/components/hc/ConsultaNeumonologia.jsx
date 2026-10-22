import { useState } from 'react'
import { Form } from 'react-bootstrap'
import {
  SINTOMAS_NEUMO, ANTECEDENTES_NEUMO, TABAQUISMO, ESTUDIOS_NEUMO, MMRC, calcularPaquetesAnio,
} from '../../data/hc/neumonologia'
import '../../styles/hc.css'

const TABS = ['Motivo y síntomas', 'Antecedentes', 'Examen y función respiratoria', 'Evaluación y plan']

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

/** Formulario de consulta de Neumonología (spec §15). Componente controlado:
 *  `value` = estado del form (NEUMO_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaNeumonologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const arr = value[field]
    onChange({ [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] })
  }
  const setVital = (k) => (v) => onChange({ vitales: { ...value.vitales, [k]: v } })

  const fumo = value.tabaquismo === 'Fumador' || value.tabaquismo === 'Ex fumador'
  const paquetes = fumo ? calcularPaquetesAnio(value.cigarrillosDia, value.aniosFumando) : null

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y síntomas */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Síntomas respiratorios</Form.Label>
            <Chks opciones={SINTOMAS_NEUMO} seleccion={value.sintomas} onToggle={toggle('sintomas')} />
          </div>
          <div className="col-12">
            <Form.Label>Descripción / enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.sintomasDesc}
              onChange={(e) => onChange({ sintomasDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Antecedentes (tabaquismo con paquetes/año automático) */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-md-4">
            <Form.Label>Tabaquismo</Form.Label>
            <Form.Select value={value.tabaquismo} onChange={(e) => onChange({ tabaquismo: e.target.value })}>
              <option value="">—</option>
              {TABAQUISMO.map((t) => <option key={t}>{t}</option>)}
            </Form.Select>
          </div>
          {fumo && (
            <>
              <Num label="Cigarrillos por día" col="col-6 col-md-3" value={value.cigarrillosDia} onChange={set('cigarrillosDia')} />
              <Num label="Años fumando" col="col-6 col-md-3" value={value.aniosFumando} onChange={set('aniosFumando')} />
              <div className="col-md-2">
                <Form.Label>Paquetes/año</Form.Label>
                <div className="hc-imc">{paquetes != null ? paquetes : '—'}</div>
              </div>
            </>
          )}
          <div className="col-12">
            <Form.Label>Antecedentes respiratorios</Form.Label>
            <Chks opciones={ANTECEDENTES_NEUMO} seleccion={value.antecedentes} onToggle={toggle('antecedentes')} />
          </div>
          <div className="col-md-6">
            <Form.Label>Exposición laboral</Form.Label>
            <Form.Control value={value.exposicionLaboral} onChange={(e) => onChange({ exposicionLaboral: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Alergias</Form.Label>
            <Form.Control value={value.alergias} onChange={(e) => onChange({ alergias: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Examen y función respiratoria (§15 + §22/§23) */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Signos vitales y espirometría</span></div>
          <Num label="FR" unidad="rpm" value={value.vitales.fr} onChange={setVital('fr')} />
          <Num label="Saturación" unidad="%" value={value.vitales.sat} onChange={setVital('sat')} />
          <Num label="FEV1" unidad="L" decimal value={value.vitales.fev1} onChange={setVital('fev1')} />
          <Num label="FEV1 % del predicho" unidad="%" value={value.vitales.fev1Pct} onChange={setVital('fev1Pct')} />
          <div className="col-12">
            <Form.Label>Auscultación pulmonar</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.auscultacion}
              onChange={(e) => onChange({ auscultacion: e.target.value })} />
          </div>
        </div>
      )}

      {/* 4) Evaluación y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Escalas (opcionales)</span></div>
          <div className="col-6 col-md-4">
            <Form.Label>Disnea mMRC</Form.Label>
            <Form.Select value={value.mmrc} onChange={(e) => onChange({ mmrc: e.target.value })}>
              <option value="">—</option>
              {MMRC.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </div>
          <Num label="CAT" unidad="0–40" col="col-6 col-md-4" value={value.cat} onChange={set('cat')} />
          <Num label="STOP-BANG" unidad="0–8" col="col-6 col-md-4" value={value.stopBang} onChange={set('stopBang')} />
          <div className="col-12">
            <Form.Label>Estudios solicitados</Form.Label>
            <Chks opciones={ESTUDIOS_NEUMO} seleccion={value.estudiosSolicitados} onToggle={toggle('estudiosSolicitados')} />
          </div>
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento / plan</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Salbutamol 2 puff c/6h, Budesonide/Formoterol 160/4.5" value={value.medicacion}
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
