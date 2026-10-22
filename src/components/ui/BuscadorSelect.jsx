import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

/**
 * Select con buscador interno (combobox). Reemplaza a <Form.Select> en los filtros
 * con listas largas (especialidades, profesionales, pacientes): al abrirlo trae un
 * campo de búsqueda para no tener que recorrer toda la lista.
 *
 * Props:
 *  - value / onChange(value): controlado. '' = opción vacía ("todos").
 *  - opciones: array de { value, label } (o strings, que se usan como value y label).
 *  - placeholder: etiqueta de la opción vacía / sin selección.
 *  - className: ancho/estilo del contenedor (mismo lugar que tenía el <Form.Select>).
 */
export default function BuscadorSelect({ value = '', onChange, opciones = [], placeholder = 'Todos', className = '', disabled = false }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const items = opciones.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const sel = items.find((o) => String(o.value) === String(value))
  const qn = q.trim().toLowerCase()
  const filtrados = qn ? items.filter((o) => (o.label || '').toLowerCase().includes(qn)) : items

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  const elegir = (v) => { onChange(v); setOpen(false); setQ('') }

  return (
    <div className={`bsel ${className}`} ref={ref}>
      <button type="button" className={`bsel__btn ${sel ? '' : 'bsel__btn--ph'}`} disabled={disabled}
        onClick={() => setOpen((o) => !o)}>
        <span className="bsel__val">{sel ? sel.label : placeholder}</span>
        <span className="bsel__caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="bsel__pop">
          <div className="bsel__search">
            <Search size={14} />
            <input ref={inputRef} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="bsel__list" role="listbox">
            <button type="button" className={`bsel__opt ${value ? '' : 'is-sel'}`} onClick={() => elegir('')}>{placeholder}</button>
            {filtrados.map((o) => (
              <button type="button" key={o.value} className={`bsel__opt ${String(o.value) === String(value) ? 'is-sel' : ''}`}
                onClick={() => elegir(o.value)}>{o.label}</button>
            ))}
            {filtrados.length === 0 && <div className="bsel__empty">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  )
}
