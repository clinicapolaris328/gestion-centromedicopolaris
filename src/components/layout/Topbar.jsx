import { useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import { Bell, PanelLeft, Sun, Moon, LogOut, Stethoscope } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useVista } from '../../context/VistaContext'

export default function Topbar({ onOpenMobile, theme, onToggleTheme }) {
  const { logout } = useAuth()
  const { puedeAlternar, esProfesional, profesional, toggle } = useVista()
  const [confirmar, setConfirmar] = useState(false)
  const oscuro = theme === 'oscuro'

  return (
    <header className="topbar">
      <button className="icon-btn topbar__burger" onClick={onOpenMobile} aria-label="Abrir menú">
        <PanelLeft size={20} />
      </button>

      <div className="topbar__spacer" />

      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Cambiar a tema ${oscuro ? 'claro' : 'oscuro'}`}
        title="Cambiar tema"
      >
        {oscuro ? <Moon size={18} /> : <Sun size={18} />}
        <span>{oscuro ? 'Oscuro' : 'Claro'}</span>
      </button>

      {puedeAlternar && (
        <button
          className={`theme-toggle ${esProfesional ? 'vista-toggle--activo' : ''}`}
          onClick={toggle}
          title={esProfesional ? 'Volver a la vista de administración' : `Ver solo tu vista (${profesional.especialidad})`}
        >
          <Stethoscope size={18} />
          <span>Vista: {esProfesional ? profesional.especialidad : 'Admin'}</span>
        </button>
      )}

      <button className="icon-btn" aria-label="Notificaciones">
        <Bell size={20} />
      </button>

      <button
        className="icon-btn icon-btn--danger"
        onClick={() => setConfirmar(true)}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut size={20} />
      </button>

      <Modal show={confirmar} onHide={() => setConfirmar(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 18 }}>Cerrar sesión</Modal.Title>
        </Modal.Header>
        <Modal.Body>¿Querés cerrar la sesión?</Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setConfirmar(false)}>Cancelar</Button>
          <Button variant="danger" className="d-inline-flex align-items-center gap-2" onClick={logout}>
            <LogOut size={16} /> Cerrar sesión
          </Button>
        </Modal.Footer>
      </Modal>
    </header>
  )
}
