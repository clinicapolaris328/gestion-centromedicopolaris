import { useMemo, useState } from 'react'
import { Offcanvas, Form } from 'react-bootstrap'
import { Search, Users } from 'lucide-react'
import { Avatar, EmptyState } from '../ui'
import { nombreCompleto } from '../../data/mock'

/**
 * Selector de paciente en panel (submódulo). Complementa la barra de búsqueda:
 * permite EXPLORAR todos los pacientes cuando no se recuerda nombre/DNI, con su
 * propio buscador y faceta de obra social. Al elegir uno, acota la agenda.
 *
 * Comparte la fuente de datos con el resto (los `pacientes` ya cargados) para no
 * duplicar listas; a futuro este mismo panel puede pasar a búsqueda paginada
 * server-side sin cambiar su interfaz.
 */
export default function PacientePicker({ show, onHide, pacientes = [], obras = [], seleccionado = '', onSelect }) {
  const [q, setQ] = useState('')
  const [os, setOs] = useState('')

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase()
    return pacientes
      .filter((p) => {
        if (os && p.obraSocial !== os) return false
        if (!s) return true
        const campos = [p.nombre, p.apellido, p.dni, p.telefono, p.email, p.obraSocial]
          .filter(Boolean).join(' ').toLowerCase()
        return campos.includes(s)
      })
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
  }, [pacientes, q, os])

  const elegir = (id) => { onSelect(id); onHide() }

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="pac-picker">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title style={{ fontSize: 18 }}>Seleccionar paciente</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="pac-picker__body">
        <div className="pac-picker__filtros">
          <div className="topbar__search">
            <Search size={16} />
            <input
              placeholder="Buscar por nombre, DNI, teléfono…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <Form.Select value={os} onChange={(e) => setOs(e.target.value)}>
            <option value="">Todas las obras sociales</option>
            {obras.map((o) => <option key={o}>{o}</option>)}
          </Form.Select>
        </div>

        <div className="pac-picker__count">
          {filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''}
        </div>

        <div className="pac-picker__list">
          <button
            type="button"
            className={`pac-row pac-row--todos ${!seleccionado ? 'is-sel' : ''}`}
            onClick={() => elegir('')}
          >
            <div className="pac-row__todos-ic"><Users size={16} /></div>
            <div className="pac-row__info"><strong>Todos los pacientes</strong><small>Quitar el filtro</small></div>
          </button>

          {filtrados.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`pac-row ${seleccionado === p.id ? 'is-sel' : ''}`}
              onClick={() => elegir(p.id)}
            >
              <Avatar {...p} />
              <div className="pac-row__info">
                <strong>{nombreCompleto(p)}</strong>
                <small>
                  DNI {p.dni}
                  {p.obraSocial ? ` · ${p.obraSocial}` : ''}
                  {p.telefono ? ` · ${p.telefono}` : ''}
                </small>
              </div>
            </button>
          ))}

          {filtrados.length === 0 && (
            <EmptyState icon={Users} title="Sin resultados">
              No se encontraron pacientes con esos criterios.
            </EmptyState>
          )}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
