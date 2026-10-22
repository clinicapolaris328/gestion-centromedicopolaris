import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { calcularIMC } from '../../data/hc/cardiologia'
import { ANTECEDENTES_CM, EXAMEN_CM, ESTUDIOS_CM } from '../../data/hc/clinica'
import { LAB_METABOLICO } from '../../data/hc/endocrino'
import '../../styles/hc.css'

const TABS = ['Motivo y enfermedad actual', 'Antecedentes', 'Examen y signos vitales', 'Evaluación y plan']

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

function Vital({ label, value, onChange, unidad, decimal }) {
  return (
    <div className="col-6 col-md-3">
      <Form.Label>{label}</Form.Label>
      <Form.Control type="number" inputMode={decimal ? 'decimal' : 'numeric'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={unidad} />
    </div>
  )
}

/** Formulario de consulta de Clínica Médica (spec §9). Componente controlado:
 *  `value` = estado del form (CLINICA_VACIO), `onChange(patch)` mergea cambios.
 *  `obesidad`: variante Clínica Médica (obesidad) → muestra la circunferencia de
 *  cintura y el laboratorio metabólico (opcional). */
export default function ConsultaClinica({ value, onChange, obesidad = false }) {
  const [tab, setTab] = useState(0)
  const set = (patch) => onChange(patch)
  const toggle = (field) => (item) => {
    const arr = value[field]
    onChange({ [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] })
  }
  const setVital = (k) => (v) => onChange({ vitales: { ...value.vitales, [k]: v } })
  const setExamen = (k, v) => onChange({ examen: { ...value.examen, [k]: v } })
  const setLab = (k) => (v) => onChange({ laboratorio: { ...value.laboratorio, [k]: v } })

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

      {/* 1) Motivo y enfermedad actual */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => set({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={4} value={value.enfermedadActual}
              onChange={(e) => set({ enfermedadActual: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Antecedentes por sistema */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Antecedentes</Form.Label>
            <Chks opciones={ANTECEDENTES_CM} seleccion={value.antecedentes} onToggle={toggle('antecedentes')} />
          </div>
          <div className="col-12">
            <Form.Label>Detalle de antecedentes</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.antecedentesDesc}
              onChange={(e) => set({ antecedentesDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Examen y signos vitales (§22) */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Signos vitales</span></div>
          <Vital label="TA sistólica" unidad="mmHg" value={value.vitales.taSist} onChange={setVital('taSist')} />
          <Vital label="TA diastólica" unidad="mmHg" value={value.vitales.taDiast} onChange={setVital('taDiast')} />
          <Vital label="FC" unidad="lpm" value={value.vitales.fc} onChange={setVital('fc')} />
          <Vital label="FR" unidad="rpm" value={value.vitales.fr} onChange={setVital('fr')} />
          <Vital label="Temperatura" unidad="°C" decimal value={value.vitales.temp} onChange={setVital('temp')} />
          <Vital label="Saturación" unidad="%" value={value.vitales.sat} onChange={setVital('sat')} />
          <Vital label="Peso" unidad="kg" decimal value={value.vitales.peso} onChange={setVital('peso')} />
          <Vital label="Talla" unidad="cm" value={value.vitales.talla} onChange={setVital('talla')} />
          <div className="col-6 col-md-3">
            <Form.Label>IMC</Form.Label>
            <div className="hc-imc">{imc != null ? `${imc} kg/m²` : '—'}</div>
          </div>
          {obesidad && (
            <Vital label="Cintura" unidad="cm" decimal value={value.vitales.cintura} onChange={setVital('cintura')} />
          )}
          {obesidad && (
            <>
              <div className="col-12"><span className="hc-sub">Laboratorio metabólico <span className="text-muted small fw-normal">(opcional, último disponible)</span></span></div>
              {LAB_METABOLICO.map(([k, label, unidad]) => (
                <Vital key={k} label={label} unidad={unidad} decimal value={value.laboratorio?.[k] ?? ''} onChange={setLab(k)} />
              ))}
            </>
          )}

          <div className="col-12"><span className="hc-sub">Examen físico</span></div>
          {EXAMEN_CM.map(([k, label]) => (
            <div className="col-md-6" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control as="textarea" rows={1} value={value.examen[k]}
                onChange={(e) => setExamen(k, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* 4) Evaluación y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-md-6">
            <Form.Label>Impresión diagnóstica</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => set({ diagnostico: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Diagnósticos diferenciales</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diferenciales}
              onChange={(e) => set({ diferenciales: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Estudios solicitados</Form.Label>
            <Chks opciones={ESTUDIOS_CM} seleccion={value.estudiosSolicitados} onToggle={toggle('estudiosSolicitados')} />
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento e indicaciones</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => set({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Metformina 850mg c/12h, Omeprazol 20mg/día" value={value.medicacion}
              onChange={(e) => set({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Seguimiento / próximo control</Form.Label>
            <Form.Control value={value.proximoControl}
              onChange={(e) => set({ proximoControl: e.target.value })} placeholder="Ej: 30 días" />
          </div>
        </div>
      )}
    </div>
  )
}
