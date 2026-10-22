import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { Plus, Trash2, Paperclip } from 'lucide-react'
import { TIPOS_ECO, MEDICION_VACIA, UNIDADES_ECO } from '../../data/hc/ecografia'
import '../../styles/hc.css'

const TABS = ['Indicación y estudio', 'Hallazgos y mediciones', 'Conclusión']

/** Informe ecográfico estructurado. Componente controlado:
 *  `value` = estado del form (ECO_VACIO), `onChange(patch)` mergea cambios. */
export default function ConsultaEcografia({ value, onChange }) {
  const [tab, setTab] = useState(0)
  const setMed = (i, k, v) => onChange({ mediciones: value.mediciones.map((m, j) => (j === i ? { ...m, [k]: v } : m)) })

  return (
    <div className="hc-form">
      <div className="tabs-p hc-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`tab-p ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* 1) Indicación y tipo de estudio */}
      {tab === 0 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Indicación / motivo del estudio *</Form.Label>
            <Form.Control required value={value.motivo} onChange={(e) => onChange({ motivo: e.target.value })} />
          </div>
          <div className="col-md-6">
            <Form.Label>Tipo de ecografía</Form.Label>
            <Form.Select value={value.tipoEstudio} onChange={(e) => onChange({ tipoEstudio: e.target.value })}>
              <option value="">Seleccionar...</option>
              {TIPOS_ECO.map((t) => <option key={t}>{t}</option>)}
            </Form.Select>
          </div>
          {value.tipoEstudio === 'Otra' && (
            <div className="col-md-6">
              <Form.Label>Especificar</Form.Label>
              <Form.Control value={value.tipoOtro} onChange={(e) => onChange({ tipoOtro: e.target.value })} />
            </div>
          )}
          <div className="col-md-6">
            <Form.Label>Solicitado por</Form.Label>
            <Form.Control value={value.derivante} onChange={(e) => onChange({ derivante: e.target.value })}
              placeholder="Profesional que lo indicó" />
          </div>
          <div className="col-12">
            <Form.Label>Técnica / condiciones del estudio</Form.Label>
            <Form.Control value={value.tecnica} onChange={(e) => onChange({ tecnica: e.target.value })}
              placeholder="Ej: transductor convexo, paciente en ayunas" />
          </div>
        </div>
      )}

      {/* 2) Hallazgos y mediciones */}
      {tab === 1 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Hallazgos</Form.Label>
            <Form.Control as="textarea" rows={5} value={value.hallazgos}
              onChange={(e) => onChange({ hallazgos: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Mediciones</Form.Label>
            {value.mediciones.length === 0 && <p className="text-muted small mb-2">Sin mediciones.</p>}
            {value.mediciones.map((m, i) => (
              <div className="row g-2 mb-2" key={i}>
                <div className="col-12 col-md-6">
                  <Form.Control size="sm" placeholder="Estructura (ej: Hígado, lóbulo derecho)" value={m.estructura}
                    onChange={(e) => setMed(i, 'estructura', e.target.value)} />
                </div>
                <div className="col-5 col-md-2">
                  <Form.Control size="sm" placeholder="Valor" value={m.valor} onChange={(e) => setMed(i, 'valor', e.target.value)} />
                </div>
                <div className="col-4 col-md-2">
                  <Form.Select size="sm" value={m.unidad} onChange={(e) => setMed(i, 'unidad', e.target.value)}>
                    {UNIDADES_ECO.map((u) => <option key={u}>{u}</option>)}
                  </Form.Select>
                </div>
                <div className="col-3 col-md-2">
                  <Button size="sm" variant="outline-danger" className="w-100" title="Quitar"
                    onClick={() => onChange({ mediciones: value.mediciones.filter((_, j) => j !== i) })}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
              onClick={() => onChange({ mediciones: [...value.mediciones, { ...MEDICION_VACIA }] })}>
              <Plus size={14} /> Agregar medición
            </Button>
          </div>
        </div>
      )}

      {/* 3) Conclusión y recomendaciones */}
      {tab === 2 && (
        <div className="row g-3">
          <div className="col-12">
            <Form.Label>Conclusión / impresión diagnóstica</Form.Label>
            <Form.Control as="textarea" rows={3} value={value.conclusion}
              onChange={(e) => onChange({ conclusion: e.target.value })} />
          </div>
          <div className="col-12">
            <Form.Label>Recomendaciones</Form.Label>
            <Form.Control as="textarea" rows={2} value={value.recomendaciones}
              onChange={(e) => onChange({ recomendaciones: e.target.value })} />
          </div>
          <div className="col-12 text-muted small d-flex align-items-center gap-1">
            <Paperclip size={14} /> Las imágenes o el PDF del estudio se cargan en la pestaña Estudios y se adjuntan a esta evolución.
          </div>
        </div>
      )}
    </div>
  )
}
