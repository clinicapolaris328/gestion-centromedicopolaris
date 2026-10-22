import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { List } from 'lucide-react'

/* Esquema corporal (vista de frente) para seleccionar zonas afectadas (spec §14).
 * Pieza común: usa la nomenclatura de zonas de Traumatología ("Rodilla der.",
 * "Columna lumbar"…), así las zonas son las mismas en todas las especialidades.
 * Vista de frente: el lado DERECHO del paciente queda a la IZQUIERDA del dibujo.
 * Accesible: cada zona es un botón (Tab + Enter/Espacio) y hay una lista
 * alternativa para elegir con precisión. Colores por variables del tema
 * (claro/oscuro). */

// Formas por zona (viewBox 0 0 200 370). Lado der. (x < 100) e izq. (espejado).
const FORMAS = [
  ['Columna cervical', { t: 'rect', x: 94, y: 49, w: 12, h: 13 }],
  ['Columna dorsal', { t: 'rect', x: 94, y: 66, w: 12, h: 58 }],
  ['Columna lumbar', { t: 'rect', x: 94, y: 128, w: 12, h: 32 }],
  ['Pelvis', { t: 'rect', x: 72, y: 164, w: 56, h: 18 }],
  ...lado('der.', false),
  ...lado('izq.', true),
]

// Espejado respecto del eje central (x = 100) para el lado izquierdo del paciente.
function lado(sufijo, espejo) {
  // Formas definidas para el lado derecho del paciente (izquierda del dibujo).
  const base = [
    ['Hombro', { t: 'circle', cx: 63, cy: 72, r: 9 }],
    ['Brazo', { t: 'rect', x: 50, y: 83, w: 14, h: 40 }],
    ['Codo', { t: 'circle', cx: 56, cy: 129, r: 7 }],
    ['Antebrazo', { t: 'rect', x: 46, y: 137, w: 14, h: 34 }],
    ['Muñeca', { t: 'rect', x: 44, y: 173, w: 15, h: 7 }],
    ['Mano', { t: 'rect', x: 42, y: 182, w: 17, h: 18 }],
    ['Cadera', { t: 'circle', cx: 80, cy: 192, r: 8 }],
    ['Muslo', { t: 'rect', x: 71, y: 202, w: 19, h: 54 }],
    ['Rodilla', { t: 'circle', cx: 80, cy: 265, r: 8 }],
    ['Pierna', { t: 'rect', x: 73, y: 275, w: 15, h: 50 }],
    ['Tobillo', { t: 'rect', x: 73, y: 327, w: 15, h: 7 }],
    ['Pie', { t: 'rect', x: 66, y: 336, w: 22, h: 12 }],
  ]
  return base.map(([nombre, f]) => [
    `${nombre} ${sufijo}`,
    !espejo ? f : f.t === 'circle' ? { ...f, cx: 200 - f.cx } : { ...f, x: 200 - f.x - f.w },
  ])
}

export default function EsquemaCorporal({ zonas, seleccion, onToggle }) {
  const [verLista, setVerLista] = useState(false)
  const disponibles = new Set(zonas)
  const onKey = (zona) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(zona) }
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-start">
        <svg viewBox="0 0 200 370" width="190" role="group" aria-label="Esquema corporal: seleccioná las zonas afectadas"
          style={{ maxWidth: '100%', height: 'auto', flex: '0 0 auto' }}>
          <text x="22" y="16" fontSize="10" fill="var(--muted)">Der.</text>
          <text x="160" y="16" fontSize="10" fill="var(--muted)">Izq.</text>
          {/* Silueta (no seleccionable) */}
          <circle cx="100" cy="28" r="18" fill="var(--soft)" stroke="var(--line)" />
          <rect x="70" y="62" width="60" height="102" rx="12" fill="var(--soft)" stroke="var(--line)" />
          {FORMAS.filter(([z]) => disponibles.has(z)).map(([zona, f]) => {
            const on = seleccion.includes(zona)
            const props = {
              role: 'button', tabIndex: 0, 'aria-pressed': on, 'aria-label': zona,
              onClick: () => onToggle(zona), onKeyDown: onKey(zona),
              fill: on ? 'var(--brand)' : 'var(--surface)',
              stroke: on ? 'var(--brand)' : 'var(--muted)', strokeWidth: 1,
              style: { cursor: 'pointer' },
            }
            return f.t === 'circle'
              ? <circle key={zona} cx={f.cx} cy={f.cy} r={f.r} {...props}><title>{zona}</title></circle>
              : <rect key={zona} x={f.x} y={f.y} width={f.w} height={f.h} rx="3" {...props}><title>{zona}</title></rect>
          })}
        </svg>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div className="small text-muted mb-1">Zonas seleccionadas</div>
          {seleccion.length === 0
            ? <p className="text-muted small mb-2">Ninguna. Tocá una zona del dibujo.</p>
            : (
              <div className="d-flex flex-wrap gap-1 mb-2">
                {zonas.filter((z) => seleccion.includes(z)).map((z) => (
                  <button key={z} type="button" className="med-chip border-0" onClick={() => onToggle(z)} title="Quitar">
                    {z} ×
                  </button>
                ))}
              </div>
            )}
          <Button size="sm" variant="outline-secondary" className="d-inline-flex align-items-center gap-1"
            onClick={() => setVerLista((v) => !v)}>
            <List size={14} /> {verLista ? 'Ocultar lista' : 'Elegir de la lista'}
          </Button>
        </div>
      </div>
      {verLista && (
        <div className="chk-grid mt-2">
          {zonas.map((z) => (
            <label key={z} className={`chk ${seleccion.includes(z) ? 'is-on' : ''}`}>
              <input type="checkbox" checked={seleccion.includes(z)} onChange={() => onToggle(z)} />
              <span>{z}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
