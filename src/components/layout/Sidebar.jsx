import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileHeart,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useVista } from '../../context/VistaContext'
import logo from '../../assets/logo.webp'

const NAV = [
  { seccion: 'Gestión' },
  { to: '/', icon: LayoutDashboard, label: 'Panel', end: true },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { seccion: 'Clínico' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/historia-clinica', icon: FileHeart, label: 'Evoluciones' },
  { to: '/estudios', icon: FolderOpen, label: 'Estudios' },
  { seccion: 'Sistema' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

export default function Sidebar({ open, collapsed, onToggleCollapse, onNavigate, onOpenAccount }) {
  const { user } = useAuth()
  const { esProfesional } = useVista()
  // En modo profesional se oculta la sección Sistema (Configuración es de admin).
  const nav = NAV.filter((item) => !esProfesional || (item.to !== '/configuracion' && item.seccion !== 'Sistema'))
  const email = user?.email || ''
  const nombre = user?.nombre || user?.username || (email ? email.split('@')[0] : 'Mi cuenta')
  const iniciales = (nombre || 'AP').slice(0, 2).toUpperCase()
  const subtitulo = user?.username ? `@${user.username}` : 'Ver cuenta'

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <button
        className="sidebar__toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        title={collapsed ? 'Expandir' : 'Contraer'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar__brand">
        <img src={logo} alt="Polaris" className="sidebar__logo" />
        <div className="sidebar__brand-text">
          <strong>Polaris</strong>
          <span>Gestión Clínica</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {nav.map((item, i) =>
          item.seccion ? (
            <div key={i} className="sidebar__section">{item.seccion}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <item.icon size={19} />
              <span className="nav-item__label">{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      <button
        type="button"
        className="sidebar__user"
        onClick={onOpenAccount}
        title="Mi cuenta"
      >
        <div className="sidebar__user-avatar">{iniciales}</div>
        <div className="sidebar__user-info">
          <strong>{nombre}</strong>
          <span>{subtitulo}</span>
        </div>
      </button>
    </aside>
  )
}
