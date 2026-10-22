import { useState } from 'react'
import { Form } from 'react-bootstrap'
import {
  MECANISMO, ZONAS_TRAUMA, SINTOMAS_TRAUMA, ANTECEDENTES_TRAUMA, EXAMEN_TRAUMA,
  ESTUDIOS_TRAUMA, CONDUCTA, INMOVILIZACION,
} from '../../data/hc/traumatologia'
import '../../styles/hc.css'

const TABS = ['Motivo y mecanismo', 'Síntomas y antecedentes', 'Examen', 'Diagnóstico y conducta']

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

/** Formulario de consulta de Traumatología. Componente controlado:
 *  `value` = estado del form (TRAUMA_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaTraumatologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setExamen = (k, v) => onChange({ examen: { ...value.examen, [k]: v } })

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo, mecanismo y zona */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Mecanismo</Form.Label>
            <Form.Select value={value.mecanismo} onChange={(e) => onChange({ mecanismo: e.target.value })}>
              <option value="">—</option>
              {MECANISMO.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </div>
          {value.mecanismo && (
            <>
              <div className="col-md-5">
                <Form.Label>Cómo ocurrió</Form.Label>
                <Form.Control value={value.mecanismoDesc} onChange={(e) => onChange({ mecanismoDesc: e.target.value })}
                  placeholder="Ej: caída de propia altura, torsión jugando al fútbol" />
              </div>
              <div className="col-md-3">
                <Form.Label>Fecha del evento</Form.Label>
                <Form.Control type="date" value={value.fechaEvento} onChange={(e) => onChange({ fechaEvento: e.target.value })} />
              </div>
            </>
          )}
          <div className="col-12">
            <Form.Label>Zona afectada</Form.Label>
            <Chks opciones={ZONAS_TRAUMA} seleccion={value.zonas} onToggle={toggle('zonas')} />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Dolor (EVA)</Form.Label>
            <Form.Control type="number" inputMode="numeric" value={value.dolorEva}
              onChange={(e) => onChange({ dolorEva: e.target.value })} placeholder="0–10" />
          </div>
          <div className="col-12">
            <Form.Label>Enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.enfermedadActual}
              onChange={(e) => onChange({ enfermedadActual: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Síntomas y antecedentes */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Síntomas</Form.Label>
            <Chks opciones={SINTOMAS_TRAUMA} seleccion={value.sintomas} onToggle={toggle('sintomas')} />
          </div>
          <div className="col-12">
            <Form.Label>Antecedentes</Form.Label>
            <Chks opciones={ANTECEDENTES_TRAUMA} seleccion={value.antecedentes} onToggle={toggle('antecedentes')} />
          </div>
          <div className="col-12">
            <Form.Label>Detalle de antecedentes</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.antecedentesDesc}
              onChange={(e) => onChange({ antecedentesDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Examen físico por ítem */}
      {tab === 2 && (
        <div className="row g-3">
          {EXAMEN_TRAUMA.map(([k, label]) => (
            <div className="col-md-6" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control as="textarea" rows={1} value={value.examen[k]} onChange={(e) => setExamen(k, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* 4) Diagnóstico, estudios y conducta */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Estudios solicitados</Form.Label>
            <Chks opciones={ESTUDIOS_TRAUMA} seleccion={value.estudiosSolicitados} onToggle={toggle('estudiosSolicitados')} />
          </div>
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Conducta</Form.Label>
            <Chks opciones={CONDUCTA} seleccion={value.conducta} onToggle={toggle('conducta')} />
          </div>
          <div className="col-md-4">
            <Form.Label>Inmovilización</Form.Label>
            <Form.Select value={value.inmovilizacion} onChange={(e) => onChange({ inmovilizacion: e.target.value })}>
              <option value="">—</option>
              {INMOVILIZACION.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento / indicaciones</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Ibuprofeno 600mg c/8h, Diclofenac gel" value={value.medicacion}
              onChange={(e) => onChange({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl}
              onChange={(e) => onChange({ proximoControl: e.target.value })} placeholder="Ej: 15 días" />
          </div>
        </div>
      )}
    </div>
  )
}
