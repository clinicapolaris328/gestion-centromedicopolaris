import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Pacientes from './pages/Pacientes'
import PacienteDetalle from './pages/PacienteDetalle'
import HistoriaClinica from './pages/HistoriaClinica'
import Estudios from './pages/Estudios'
import Configuracion from './pages/Configuracion'

function Cargando() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--brand)' }}>
      <Loader2 size={34} style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

// Puerta de acceso: verifica la sesión antes de mostrar la app.
function Protected({ children }) {
  const { user, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, cargando } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={cargando ? <Cargando /> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        {/* Turnero y Agenda se unificaron en /agenda; se conserva el redirect. */}
        <Route path="turnero" element={<Navigate to="/agenda" replace />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PacienteDetalle />} />
        <Route path="historia-clinica" element={<HistoriaClinica />} />
        <Route path="estudios" element={<Estudios />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
