import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { CORRECCION, ANTECEDENTES_OFT, ESTUDIOS_OFT, EXAMEN_OFT, avDecimal } from '../../data/hc/oftalmologia'
import '../../styles/hc.css'

const TABS = ['Motivo y antecedentes', 'Agudeza, refracción y PIO', 'Examen', 'Estudios y plan']
const OJOS = [['od', 'OD (ojo derecho)'], ['oi', 'OI (ojo izquierdo)']]

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

function Campo({ label, value, onChange, placeholder, type = 'text', inputMode, invalido, ayuda }) {
  return (
    <div className="col-6 col-md-3">
      <Form.Label className="small mb-1">{label}</Form.Label>
      <Form.Control size="sm" type={type} inputMode={inputMode} value={value} isInvalid={invalido}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {ayuda && <Form.Text className="text-muted">{ayuda}</Form.Text>}
    </div>
  )
}

/** Formulario de consulta de Oftalmología (spec §19). Componente controlado:
 *  `value` = estado del form (OFT_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaOftalmologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setAv = (ojo, k, v) => onChange({ av: { ...value.av, [ojo]: { ...value.av[ojo], [k]: v } } })
  const setRf = (ojo, k, v) => onChange({ refraccion: { ...value.refraccion, [ojo]: { ...value.refraccion[ojo], [k]: v } } })
  const setPio = (ojo, v) => onChange({ pio: { ...value.pio, [ojo]: v } })
  const setExamen = (k, v) => onChange({ examen: { ...value.examen, [k]: v } })
  // Feedback: AV cargada pero no interpretable (ni decimal ni Snellen).
  const avMal = (v) => !!String(v).trim() && avDecimal(v) == null
  const avAyuda = (v) => (String(v).includes('/') && avDecimal(v) != null ? `= ${avDecimal(v)}` : null)

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y antecedentes oftalmológicos */}
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
          <div className="col-md-6">
            <Form.Label>Uso de anteojos o lentes de contacto</Form.Label>
            <Form.Select value={value.correccion} onChange={(e) => onChange({ correccion: e.target.value })}>
              <option value="">—</option>
              {CORRECCION.map((c) => <option key={c}>{c}</option>)}
            </Form.Select>
          </div>
          <div className="col-12">
            <Form.Label>Antecedentes oftalmológicos</Form.Label>
            <Chks opciones={ANTECEDENTES_OFT} seleccion={value.antecedentes} onToggle={toggle('antecedentes')} />
          </div>
          <div className="col-12">
            <Form.Label>Detalle de antecedentes</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.antecedentesDesc}
              onChange={(e) => onChange({ antecedentesDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Agudeza visual, refracción y presión intraocular (por ojo) */}
      {tab === 1 && (
        <div className="row g-3">
          {OJOS.map(([ojo, titulo]) => (
            <div className="col-12" key={ojo}>
              <span className="hc-sub">{titulo}</span>
              <div className="row g-2 mt-1">
                <Campo label="AV sin corrección" placeholder="0.8 o 20/25" value={value.av[ojo].sc}
                  onChange={(v) => setAv(ojo, 'sc', v)} invalido={avMal(value.av[ojo].sc)} ayuda={avAyuda(value.av[ojo].sc)} />
                <Campo label="AV con corrección" placeholder="0.8 o 20/25" value={value.av[ojo].cc}
                  onChange={(v) => setAv(ojo, 'cc', v)} invalido={avMal(value.av[ojo].cc)} ayuda={avAyuda(value.av[ojo].cc)} />
                <Campo label="PIO" placeholder="mmHg" type="number" inputMode="decimal" value={value.pio[ojo]}
                  onChange={(v) => setPio(ojo, v)} />
                <div className="col-6 col-md-3" />
                <Campo label="Esfera" placeholder="Ej: -1.25" type="number" inputMode="decimal" value={value.refraccion[ojo].esfera}
                  onChange={(v) => setRf(ojo, 'esfera', v)} />
                <Campo label="Cilindro" placeholder="Ej: -0.50" type="number" inputMode="decimal" value={value.refraccion[ojo].cilindro}
                  onChange={(v) => setRf(ojo, 'cilindro', v)} />
                <Campo label="Eje" placeholder="0–180°" type="number" inputMode="numeric" value={value.refraccion[ojo].eje}
                  onChange={(v) => setRf(ojo, 'eje', v)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3) Examen */}
      {tab === 2 && (
        <div className="row g-3">
          {EXAMEN_OFT.map(([k, label]) => (
            <div className="col-md-6" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Control as="textarea" rows={1} value={value.examen[k]} onChange={(e) => setExamen(k, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* 4) Estudios, diagnóstico, tratamiento y próximo control */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Estudios</Form.Label>
            <Chks opciones={ESTUDIOS_OFT} seleccion={value.estudios} onToggle={toggle('estudios')} />
          </div>
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico} onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Tratamiento</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento} onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Medicación <span className="text-muted small">(separar con comas)</span></Form.Label>
            <Form.Control placeholder="Ej: Timolol 0.5% 1 gota c/12h OD" value={value.medicacion}
              onChange={(e) => onChange({ medicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl} onChange={(e) => onChange({ proximoControl: e.target.value })}
              placeholder="Ej: 6 meses" />
          </div>
        </div>
      )}
    </div>
  )
}
