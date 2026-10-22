import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { ANTICONCEPCION, ANTECEDENTES_GINE, ESTUDIOS_GINE, GESTACIONES } from '../../data/hc/ginecologia'
import '../../styles/hc.css'

const TABS = ['Motivo y antecedentes', 'Gestaciones y anticoncepción', 'Estudios', 'Examen y conducta']

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

function Num({ label, value, onChange, unidad, col = 'col-6 col-md-3' }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <Form.Control type="number" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={unidad} />
    </div>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className={`chk ${checked ? 'is-on' : ''}`} style={{ width: '100%' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** Formulario de consulta de Ginecología (spec §11). Componente controlado:
 *  `value` = estado del form (GINE_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaGinecologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setGest = (k) => (v) => onChange({ gestaciones: { ...value.gestaciones, [k]: v } })

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y antecedentes gineco-obstétricos */}
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
          <div className="col-12"><span className="hc-sub">Antecedentes gineco-obstétricos</span></div>
          <Num label="Menarca" unidad="edad" value={value.menarca} onChange={set('menarca')} />
          <div className="col-6 col-md-3">
            <Form.Label>FUM</Form.Label>
            <Form.Control type="date" value={value.fum} onChange={(e) => onChange({ fum: e.target.value })} />
          </div>
          <Num label="Ritmo: ciclo" unidad="días" value={value.cicloDias} onChange={set('cicloDias')} />
          <Num label="Ritmo: duración" unidad="días" value={value.duracionDias} onChange={set('duracionDias')} />
          <div className="col-6 col-md-3 d-flex align-items-end">
            <Check label="Dismenorrea" checked={value.dismenorrea} onChange={set('dismenorrea')} />
          </div>
          <div className="col-6 col-md-3 d-flex align-items-end">
            <Check label="Menopausia" checked={value.menopausia} onChange={set('menopausia')} />
          </div>
          {value.menopausia && <Num label="Edad de menopausia" unidad="edad" value={value.edadMenopausia} onChange={set('edadMenopausia')} />}
          <Num label="Inicio de relaciones sexuales" unidad="edad" value={value.inicioRelaciones} onChange={set('inicioRelaciones')} />
          <div className="col-12">
            <Form.Label>Antecedentes</Form.Label>
            <Chks opciones={ANTECEDENTES_GINE} seleccion={value.antecedentes} onToggle={toggle('antecedentes')} />
          </div>
          <div className="col-12">
            <Form.Label>Detalle de antecedentes</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.antecedentesDesc}
              onChange={(e) => onChange({ antecedentesDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Gestaciones y anticoncepción */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12"><span className="hc-sub">Gestaciones</span></div>
          {GESTACIONES.map(([k, label]) => (
            <Num key={k} label={label} col="col-4 col-md-2" value={value.gestaciones[k]} onChange={setGest(k)} />
          ))}
          <div className="col-md-5">
            <Form.Label>Anticoncepción</Form.Label>
            <Form.Select value={value.anticoncepcion} onChange={(e) => onChange({ anticoncepcion: e.target.value })}>
              <option value="">—</option>
              {ANTICONCEPCION.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </div>
          {value.anticoncepcion === 'Otro' && (
            <div className="col-md-7">
              <Form.Label>Especificar</Form.Label>
              <Form.Control value={value.anticoncepcionOtro} onChange={(e) => onChange({ anticoncepcionOtro: e.target.value })} />
            </div>
          )}
        </div>
      )}

      {/* 3) Estudios */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Estudios</Form.Label>
            <Chks opciones={ESTUDIOS_GINE} seleccion={value.estudios} onToggle={toggle('estudios')} />
          </div>
          <div className="col-12">
            <Form.Label>Resultados / observaciones</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.estudiosDesc}
              onChange={(e) => onChange({ estudiosDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 4) Examen, diagnóstico y conducta */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-md-6">
            <Form.Label>Examen mamario</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.examenMamario}
              onChange={(e) => onChange({ examenMamario: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Examen ginecológico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.examenGinecologico}
              onChange={(e) => onChange({ examenGinecologico: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Conducta</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.conducta}
              onChange={(e) => onChange({ conducta: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control value={value.medicacion} onChange={(e) => onChange({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl} onChange={(e) => onChange({ proximoControl: e.target.value })}
              placeholder="Ej: 1 año" />
          </div>
        </div>
      )}
    </div>
  )
}
