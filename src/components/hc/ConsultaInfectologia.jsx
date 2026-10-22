import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { Plus, Trash2 } from 'lucide-react'
import {
  PATRON_FIEBRE, FOCOS, EPIDEMIOLOGIA, VIAS, MICRO_VACIA, ATB_VACIO,
} from '../../data/hc/infectologia'
import '../../styles/hc.css'

const TABS = ['Motivo y fiebre', 'Foco y epidemiología', 'Microbiología', 'Antibióticos y plan']

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

/** Lista de filas repetibles (microbiología / antibióticos). `campos`: [clave, etiqueta, tipo, opciones?]. */
function Filas({ titulo, filas, molde, campos, onChange, agregarLabel }) {
  const setCampo = (i, k, v) => onChange(filas.map((f, j) => (j === i ? { ...f, [k]: v } : f)))
  return (
    <div className="col-12">
      <Form.Label>{titulo}</Form.Label>
      {filas.length === 0 && <p className="text-muted small mb-2">Sin registros.</p>}
      {filas.map((f, i) => (
        <div className="row g-2 mb-2 pb-2" key={i} style={{ borderBottom: '1px solid var(--line)' }}>
          {campos.map(([k, label, tipo, opciones]) => (
            <div className="col-6 col-md-4" key={k}>
              <Form.Label className="small mb-1">{label}</Form.Label>
              {opciones ? (
                <Form.Select size="sm" value={f[k]} onChange={(e) => setCampo(i, k, e.target.value)}>
                  <option value="">—</option>
                  {opciones.map((o) => <option key={o}>{o}</option>)}
                </Form.Select>
              ) : (
                <Form.Control size="sm" type={tipo} value={f[k]} onChange={(e) => setCampo(i, k, e.target.value)} />
              )}
            </div>
          ))}
          <div className="col-12 col-md-4 d-flex align-items-end">
            <Button size="sm" variant="outline-danger" className="d-inline-flex align-items-center gap-1"
              onClick={() => onChange(filas.filter((_, j) => j !== i))}>
              <Trash2 size={14} /> Quitar
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
        onClick={() => onChange([...filas, { ...molde }])}>
        <Plus size={14} /> {agregarLabel}
      </Button>
    </div>
  )
}

const CAMPOS_MICRO = [
  ['muestra', 'Tipo de muestra', 'text'],
  ['fecha', 'Fecha', 'date'],
  ['microorganismo', 'Microorganismo', 'text'],
  ['sensibilidad', 'Sensibilidad', 'text'],
  ['resistencia', 'Resistencia', 'text'],
]
const CAMPOS_ATB = [
  ['antibiotico', 'Antibiótico', 'text'],
  ['dosis', 'Dosis', 'text'],
  ['via', 'Vía', 'text', VIAS],
  ['inicio', 'Inicio', 'date'],
  ['fin', 'Fin', 'date'],
  ['motivo', 'Motivo', 'text'],
]

/** Formulario de consulta de Infectología (spec §18). Componente controlado:
 *  `value` = estado del form (INFECTO_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaInfectologia({ value, onChange }) {
  const [tab, setTab] = useState(0)
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

      {/* 1) Motivo y síndrome infeccioso / fiebre */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Síndrome infeccioso / enfermedad actual</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.sindromeDesc}
              onChange={(e) => onChange({ sindromeDesc: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label>Temperatura actual</Form.Label>
            <Form.Control type="number" inputMode="decimal" value={value.temperatura}
              onChange={(e) => onChange({ temperatura: e.target.value })} placeholder="°C" />
          </div>
          <div className="col-6 col-md-3 d-flex align-items-end">
            <label className={`chk ${value.fiebre ? 'is-on' : ''}`} style={{ width: '100%' }}>
              <input type="checkbox" checked={value.fiebre} onChange={(e) => onChange({ fiebre: e.target.checked })} />
              <span>Fiebre</span>
            </label>
          </div>
          {value.fiebre && (
            <>
              <div className="col-6 col-md-4">
                <Form.Label>Fecha de inicio</Form.Label>
                <Form.Control type="date" value={value.fiebreInicio} onChange={(e) => onChange({ fiebreInicio: e.target.value })} />
              </div>
              <div className="col-6 col-md-4">
                <Form.Label>Temperatura máxima</Form.Label>
                <Form.Control type="number" inputMode="decimal" value={value.tempMax}
                  onChange={(e) => onChange({ tempMax: e.target.value })} placeholder="°C" />
              </div>
              <div className="col-12 col-md-4">
                <Form.Label>Patrón</Form.Label>
                <Form.Select value={value.patron} onChange={(e) => onChange({ patron: e.target.value })}>
                  <option value="">—</option>
                  {PATRON_FIEBRE.map((p) => <option key={p}>{p}</option>)}
                </Form.Select>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2) Foco probable y antecedentes epidemiológicos */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Foco probable</Form.Label>
            <Chks opciones={FOCOS} seleccion={value.focos} onToggle={toggle('focos')} />
          </div>
          <div className="col-12">
            <Form.Label>Antecedentes epidemiológicos</Form.Label>
            <Chks opciones={EPIDEMIOLOGIA} seleccion={value.epidemiologia} onToggle={toggle('epidemiologia')} />
          </div>
          <div className="col-12">
            <Form.Label>Detalle epidemiológico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.epidemiologiaDesc}
              onChange={(e) => onChange({ epidemiologiaDesc: e.target.value })} />
          </div>
        </div>
      )}

      {/* 3) Microbiología */}
      {tab === 2 && (
        <div className="row g-3">
          <Filas titulo="Muestras y resultados" filas={value.microbiologia} molde={MICRO_VACIA} campos={CAMPOS_MICRO}
            onChange={(microbiologia) => onChange({ microbiologia })} agregarLabel="Agregar muestra" />
        </div>
      )}

      {/* 4) Antibióticos, diagnóstico y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <Filas titulo="Antibióticos" filas={value.antibioticos} molde={ATB_VACIO} campos={CAMPOS_ATB}
            onChange={(antibioticos) => onChange({ antibioticos })} agregarLabel="Agregar antibiótico" />
          <div className="col-12">
            <Form.Label>Diagnóstico</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.diagnostico}
              onChange={(e) => onChange({ diagnostico: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Tratamiento / plan</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.tratamiento}
              onChange={(e) => onChange({ tratamiento: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Duración prevista</Form.Label>
            <Form.Control value={value.duracionPrevista} onChange={(e) => onChange({ duracionPrevista: e.target.value })}
              placeholder="Ej: 7 días" />
          </div>
          <div className="col-md-8">
            <Form.Label>Otra medicación <span className="text-muted small">(separar con comas; los antibióticos ya se registran)</span></Form.Label>
            <Form.Control value={value.otraMedicacion} onChange={(e) => onChange({ otraMedicacion: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Control</Form.Label>
            <Form.Control value={value.proximoControl}
              onChange={(e) => onChange({ proximoControl: e.target.value })} placeholder="Ej: 72 horas" />
          </div>
        </div>
      )}
    </div>
  )
}
