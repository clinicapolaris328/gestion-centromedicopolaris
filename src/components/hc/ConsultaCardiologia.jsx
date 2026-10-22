import { useState } from 'react'
import { Form } from 'react-bootstrap'
import {
  SINTOMAS_CV, ANTECEDENTES_CV, ESTUDIOS_CV, NYHA, RIESGO_CV, FA_MARCADOR, calcularIMC,
} from '../../data/hc/cardiologia'
import '../../styles/hc.css'

const TABS = ['Motivo y síntomas', 'Antecedentes', 'Examen y signos vitales', 'Evaluación y plan']

/** Formulario de consulta de Cardiología. Componente controlado:
 *  `value` = estado del form (CARDIO_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaCardiologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (patch) => onChange(patch)
  const toggle = (field, item) => {
    const arr = value[field]
    onChange({ [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] })
  }
  const setVital = (k, v) => onChange({ vitales: { ...value.vitales, [k]: v } })

  const imc = calcularIMC(value.vitales.peso, value.vitales.talla)
  const fa = value.antecedentes.includes(FA_MARCADOR)

  const Chks = ({ field, opciones }) => (
    <div className="chk-grid">
      {opciones.map((op) => (
        <label key={op} className={`chk ${value[field].includes(op) ? 'is-on' : ''}`}>
          <input type="checkbox" checked={value[field].includes(op)} onChange={() => toggle(field, op)} />
          <span>{op}</span>
        </label>
      ))}
    </div>
  )

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
            <Form.Control required value={value.motivo} onChange={(e) => set({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Síntomas cardiovasculares</Form.Label>
            <Chks field="sintomas" opciones={SINTOMAS_CV} />
          </div>
          <div className="col-12">
            <Form.Label>Descripción / enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.sintomasDesc}
              onChange={(e) => set({ sintomasDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Antecedentes */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Antecedentes cardiovasculares</Form.Label>
            <Chks field="antecedentes" opciones={ANTECEDENTES_CV} />
          </div>
        </div>
      )}

      {/* 3) Examen y signos vitales */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Signos vitales</span></div>
          <div className="col-6 col-md-3">
            <Form.Label>TA sistólica</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.vitales.taSist}
              onChange={(e) => setVital('taSist', e.target.value)} placeholder="mmHg" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>TA diastólica</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.vitales.taDiast}
              onChange={(e) => setVital('taDiast', e.target.value)} placeholder="mmHg" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>FC</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.vitales.fc}
              onChange={(e) => setVital('fc', e.target.value)} placeholder="lpm" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Saturación</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.vitales.sat}
              onChange={(e) => setVital('sat', e.target.value)} placeholder="%" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Peso</Form.Label>
            <Form.Control type="number" inputMode="decimal" value={value.vitales.peso}
              onChange={(e) => setVital('peso', e.target.value)} placeholder="kg" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Talla</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.vitales.talla}
              onChange={(e) => setVital('talla', e.target.value)} placeholder="cm" />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>IMC</Form.Label>
            <div className="hc-imc">{imc != null ? `${imc} kg/m²` : '—'}</div>
          </div>
          <div className="col-12">
            <Form.Label>Examen físico (ritmo, soplos, ruidos, pulsos, auscultación…)</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.examen}
              onChange={(e) => set({ examen: e.target.value })} />
          </div>
        </div>
      )}

      {/* 4) Evaluación y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-md-6">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => set({ diagnostico: e.target.value })} />
          </div>
          <div className="col-md-3">
            <Form.Label>Riesgo CV</Form.Label>
            <Form.Select value={value.riesgoCV} onChange={(e) => set({ riesgoCV: e.target.value })}>
              <option value="">—</option>
              {RIESGO_CV.map((r) => <option key={r}>{r}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Label>Clase funcional NYHA</Form.Label>
            <Form.Select value={value.nyha} onChange={(e) => set({ nyha: e.target.value })}>
              <option value="">—</option>
              {NYHA.map((n) => <option key={n}>{n}</option>)}
            </Form.Select>
          </div>
          {/* Campo condicional: solo si se marcó Fibrilación auricular */}
          {fa && (
            <div className="col-md-4">
              <Form.Label>CHA₂DS₂-VASc</Form.Label>
              <Form.Control type="number" inputMode="numeric" value={value.cha2ds2}
                onChange={(e) => set({ cha2ds2: e.target.value })} placeholder="0–9" />
            </div>
          )}
          <div className="col-12">
            <Form.Label>Estudios solicitados</Form.Label>
            <Chks field="estudiosSolicitados" opciones={ESTUDIOS_CV} />
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento / plan</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => set({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Enalapril 10mg c/12h, Bisoprolol 2.5mg/día" value={value.medicacion}
              onChange={(e) => set({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl}
              onChange={(e) => set({ proximoControl: e.target.value })} placeholder="Ej: 30 días" />
          </div>
        </div>
      )}
    </div>
  )
}
