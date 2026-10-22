import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AccountModal from './AccountModal'
import { usePref } from '../../hooks/usePref'
import { VistaProvider } from '../../context/VistaContext'
import '../../styles/layout.css'

export default function Layout() {
  const [collapsed, setCollapsed] = usePref('polaris:sidebar-collapsed', false)
  const [theme, setTheme] = usePref('polaris:theme', 'light')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // Aplica el tema (tokens propios + Bootstrap 5.3) a la raíz del documento.
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-bs-theme', theme === 'oscuro' ? 'dark' : 'light')
  }, [theme])

  return (
    <VistaProvider>
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar
        open={mobileOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onNavigate={() => setMobileOpen(false)}
        onOpenAccount={() => setAccountOpen(true)}
      />
      <div
        className={`sidebar__backdrop ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className="main">
        <Topbar
          onOpenMobile={() => setMobileOpen((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'oscuro' ? 'light' : 'oscuro'))}
        />
        <main className="content">
          <Outlet />
        </main>
      </div>

      <AccountModal show={accountOpen} onHide={() => setAccountOpen(false)} />
    </div>
    </VistaProvider>
  )
}
