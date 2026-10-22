import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { calcularIMC } from '../../data/hc/cardiologia'
import { OBJETIVOS_NUTRI, COMIDAS, FRECUENCIA, CONSUMOS, calcularICC } from '../../data/hc/nutricion'
import '../../styles/hc.css'

const TABS = ['Motivo y objetivos', 'Antropometría', 'Historia alimentaria', 'Evaluación y plan']

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
      <Form.Control type="number" inputMode="decimal" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={unidad} />
    </div>
  )
}

function Calc({ label, valor, col = 'col-6 col-md-3' }) {
  return (
    <div className={col}>
      <Form.Label>{label}</Form.Label>
      <div className="hc-imc">{valor ?? '—'}</div>
    </div>
  )
}

/** Formulario de consulta de Nutrición (spec §8). Componente controlado:
 *  `value` = estado del form (NUTRI_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaNutricion({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const set = (k) => (v) => onChange({ [k]: v })
  const toggle = (field) => (item) => {
    const a = value[field]
    onChange({ [field]: a.includes(item) ? a.filter((x) => x !== item) : [...a, item] })
  }
  const setAntro = (k) => (v) => onChange({ antro: { ...value.antro, [k]: v } })
  const setConsumo = (k, v) => onChange({ consumos: { ...value.consumos, [k]: v } })
  const a = value.antro
  const imc = calcularIMC(a.peso, a.talla)
  const icc = calcularICC(a.cintura, a.cadera)

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Motivo y objetivo del paciente */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Motivo de consulta *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Objetivo del paciente</Form.Label>
            <Chks opciones={OBJETIVOS_NUTRI} seleccion={value.objetivosPaciente} onToggle={toggle('objetivosPaciente')} />
          </div>
          <div className="col-12">
            <Form.Label>Enfermedad actual / contexto</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.enfermedadActual}
              onChange={(e) => onChange({ enfermedadActual: e.target.value })} />
          </div>
        </div>
      )}

      {/* 2) Antropometría */}
      {tab === 1 && (
        <div className="row g-3">
          <Num label="Peso" unidad="kg" value={a.peso} onChange={setAntro('peso')} />
          <Num label="Talla" unidad="cm" value={a.talla} onChange={setAntro('talla')} />
          <Calc label="IMC" valor={imc != null ? `${imc} kg/m²` : null} />
          <Num label="Peso objetivo" unidad="kg" value={a.pesoObjetivo} onChange={setAntro('pesoObjetivo')} />
          <Num label="Peso habitual" unidad="kg" value={a.pesoHabitual} onChange={setAntro('pesoHabitual')} />
          <Num label="Peso máximo" unidad="kg" value={a.pesoMaximo} onChange={setAntro('pesoMaximo')} />
          <Num label="Peso mínimo" unidad="kg" value={a.pesoMinimo} onChange={setAntro('pesoMinimo')} />
          <div className="col-12"><span className="hc-sub">Circunferencias y composición corporal</span></div>
          <Num label="Circunferencia abdominal" unidad="cm" value={a.cintura} onChange={setAntro('cintura')} />
          <Num label="Circunferencia de cadera" unidad="cm" value={a.cadera} onChange={setAntro('cadera')} />
          <Calc label="Relación cintura/cadera" valor={icc} />
          <Num label="% de grasa" unidad="%" value={a.grasaPct} onChange={setAntro('grasaPct')} />
          <Num label="Masa muscular" unidad="kg" value={a.masaMuscular} onChange={setAntro('masaMuscular')} />
        </div>
      )}

      {/* 3) Historia alimentaria y actividad física */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Comidas que realiza</Form.Label>
            <Chks opciones={COMIDAS} seleccion={value.comidas} onToggle={toggle('comidas')} />
          </div>
          <div className="col-md-8">
            <Form.Label>Horarios</Form.Label>
            <Form.Control value={value.horarios} onChange={(e) => onChange({ horarios: e.target.value })}
              placeholder="Ej: desayuno 8 h, almuerzo 13 h…" />
          </div>
          <Num label="Agua por día" unidad="litros" col="col-md-4" value={value.aguaLitros} onChange={set('aguaLitros')} />
          <div className="col-12"><span className="hc-sub">Frecuencia de consumo</span></div>
          {CONSUMOS.map(([k, label]) => (
            <div className="col-6 col-md-3" key={k}>
              <Form.Label>{label}</Form.Label>
              <Form.Select value={value.consumos[k]} onChange={(e) => setConsumo(k, e.target.value)}>
                <option value="">—</option>
                {FRECUENCIA.map((f) => <option key={f}>{f}</option>)}
              </Form.Select>
            </div>
          ))}
          <div className="col-12"><span className="hc-sub">Actividad física</span></div>
          <div className="col-md-6">
            <Form.Label>Tipo</Form.Label>
            <Form.Control value={value.actividadTipo} onChange={(e) => onChange({ actividadTipo: e.target.value })}
              placeholder="Ej: caminata, gimnasio, ninguna" />
          </div>
          <Num label="Frecuencia" unidad="veces/semana" value={value.actividadFrecuencia} onChange={set('actividadFrecuencia')} />
          <Num label="Duración" unidad="minutos" value={value.actividadDuracion} onChange={set('actividadDuracion')} />
        </div>
      )}

      {/* 4) Evaluación y plan */}
      {tab === 3 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Evaluación nutricional</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.evaluacion} onChange={(e) => onChange({ evaluacion: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Objetivos</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.objetivos} onChange={(e) => onChange({ objetivos: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Plan alimentario</Form.Label>
            <Form.Control as="textarea" rows={3} value={value.planAlimentario} onChange={(e) => onChange({ planAlimentario: e.target.value })} />
          </div>
          <div className="col-md-8">
            <Form.Label>Indicaciones</Form.Label>
            <Form.Control value={value.indicaciones} onChange={(e) => onChange({ indicaciones: e.target.value })} />
          </div>
          <div className="col-md-4">
            <Form.Label>Próximo control</Form.Label>
            <Form.Control value={value.proximoControl} onChange={(e) => onChange({ proximoControl: e.target.value })}
              placeholder="Ej: 30 días" />
          </div>
        </div>
      )}
    </div>
  )
}
