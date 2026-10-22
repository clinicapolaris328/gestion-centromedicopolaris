import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Envuelve una grilla ancha con scroll horizontal y agrega flechas ‹ › arriba a
 * la derecha, para no depender de la barra inferior del navegador. Las flechas
 * solo aparecen si hay desborde, y se deshabilitan en los extremos.
 * `deps` fuerza el re-chequeo cuando cambia el contenido (columnas/turnos).
 */
export default function GridScroll({ children, deps = [] }) {
  const ref = useRef(null)
  const [st, setSt] = useState({ hay: false, ini: true, fin: false })

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    const hay = el.scrollWidth > el.clientWidth + 4
    setSt({
      hay,
      ini: el.scrollLeft <= 2,
      fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    })
  }, [])

  // Re-chequeo al cambiar el contenido.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { check() }, deps)

  // Re-chequeo por resize del contenedor y al desplazar.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    el.addEventListener('scroll', check, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', check) }
  }, [check])

  const by = (dir) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  return (
    <div className="agenda-gridwrap">
      {st.hay && (
        <div className="agenda-scroll-nav">
          <button type="button" onClick={() => by(-1)} disabled={st.ini} aria-label="Desplazar a la izquierda"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => by(1)} disabled={st.fin} aria-label="Desplazar a la derecha"><ChevronRight size={18} /></button>
        </div>
      )}
      <div className="agenda-scroll" ref={ref}>{children}</div>
    </div>
  )
}
