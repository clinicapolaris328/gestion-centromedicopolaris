import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { calcularIMC } from '../../data/hc/cardiologia'
import {
  TIPO_PARTO, ALIMENTACION, ESQUEMA_VACUNAS, DESARROLLO_PED, EXAMEN_PED,
} from '../../data/hc/pediatria'
import '../../styles/hc.css'

const TABS = ['Motivo y datos de base', 'Alimentación y vacunas', 'Desarrollo y antropometría', 'Examen y plan']

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

/** Formulario de consulta de Pediatría (spec §10). Componente controlado:
 *  `value` = estado del form (PEDIA_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaPediatria({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setVital = (k) => (v) => onChange({ vitales: { ...value.vitales, [k]: v } })
  const setDes = (k, v) => onChange({ desarrollo: { ...value.desarrollo, [k]: v } })
  const setExamen = (k, v) => onChange({ examen: { ...value.examen, [k]: v } })
  const imc = calcularIMC(value.vitales.peso, value.vitales.talla)

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y datos de base (se precargan de la última consulta pediátrica) */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.enfermedadActual}
              onChange={(e) => onChange({ enfermedadActual: e.target.value })} />
          </div>
          <div className="col-12"><span className="hc-sub">Datos de base</span></div>
          <div className="col-md-6">
            <Form.Label>Madre / padre / tutor</Form.Label>
            <Form.Control value={value.tutorNombre} onChange={(e) => onChange({ tutorNombre: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Teléfono del tutor</Form.Label>
            <Form.Control inputMode="tel" value={value.tutorTelefono} onChange={(e) => onChange({ tutorTelefono: e.target.value })} />
          </div>
          <Num label="Edad gestacional" unidad="semanas" value={value.edadGestacional} onChange={set('edadGestacional')} />
          <div className="col-6 col-md-3">
            <Form.Label>Tipo de parto</Form.Label>
            <Form.Select value={value.tipoParto} onChange={(e) => onChange({ tipoParto: e.target.value })}>
              <option value="">—</option>
              {TIPO_PARTO.map((t) => <option key={t}>{t}</option>)}
            </Form.Select>
          </div>
          <Num label="Peso al nacer" unidad="gramos" value={value.pesoNacer} onChange={set('pesoNacer')} />
          <Num label="Talla al nacer" unidad="cm" decimal value={value.tallaNacer} onChange={set('tallaNacer')} />
          <div className="col-12">
            <Form.Label>Antecedentes perinatales</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.perinatales} onChange={(e) => onChange({ perinatales: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Alimentación y vacunación */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Alimentación</Form.Label>
            <Chks opciones={ALIMENTACION} seleccion={value.alimentacion} onToggle={toggle('alimentacion')} />
          </div>
          <div className="col-12">
            <Form.Label>Alimentación actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.alimentacionActual}
              onChange={(e) => onChange({ alimentacionActual: e.target.value })} />
          </div>
          <div className="col-md-5">
            <Form.Label>Esquema vacunatorio</Form.Label>
            <Form.Select value={value.esquemaVacunas} onChange={(e) => onChange({ esquemaVacunas: e.target.value })}>
              <option value="">—</option>
              {ESQUEMA_VACUNAS.map((t) => <option key={t}>{t}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-7">
            <Form.Label>Dosis pendientes / observaciones</Form.Label>
            <Form.Control value={value.vacunasPendientes} onChange={(e) => onChange({ vacunasPendientes: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Desarrollo y antropometría */}
      {tab === 2 && (
        <div className="row g-3">
          {DESARROLLO_PED.map(([k, label]) => (
            <div className="col-md-6" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control value={value.desarrollo[k]} onChange={(e) => setDes(k, e.target.value)} />
            </div>
          ))}
          <div className="col-12"><span className="hc-sub">Antropometría</span></div>
          <Num label="Peso" unidad="kg" decimal value={value.vitales.peso} onChange={setVital('peso')} />
          <Num label="Talla" unidad="cm" decimal value={value.vitales.talla} onChange={setVital('talla')} />
          <Num label="Perímetro cefálico" unidad="cm" decimal value={value.vitales.perimetroCefalico} onChange={setVital('perimetroCefalico')} />
          <div className="col-6 col-md-3">
            <Form.Label>IMC</Form.Label>
            <div className="hc-imc">{imc != null ? `${imc} kg/m²` : '—'}</div>
          </div>
        </div>
      )}

      {/* 4) Examen físico, diagnóstico e indicaciones */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Examen físico</span></div>
          {EXAMEN_PED.map(([k, label]) => (
            <div className="col-md-6" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control as="textarea" rows={1} value={value.examen[k]} onChange={(e) => setExamen(k, e.target.value)} />
            </div>
          ))}
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Indicaciones</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Ibuprofeno jarabe 5ml c/8h" value={value.medicacion}
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
