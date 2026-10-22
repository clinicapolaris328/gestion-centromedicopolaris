import { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'
import { usePref } from '../hooks/usePref'

const VistaContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useVista = () => useContext(VistaContext)

/**
 * Modo de vista del sistema: "admin" (visión general) o "profesional" (el usuario
 * ve solo lo suyo, según su especialidad). Solo se puede alternar si la cuenta
 * está vinculada a un profesional (lo trae /me). Es estado de UI, persistido.
 */
export function VistaProvider({ children }) {
  const { user } = useAuth()
  const profesional = user?.profesional || null
  // 'profesional': SIEMPRE en su vista (ve solo lo suyo), sin toggle.
  // 'dios' (dueño): acceso admin y, si está vinculado a su ficha, alterna a su
  //   vista de médico. El resto (administrador/asistente) NO tiene ese toggle.
  const rolProfesional = user?.rol === 'profesional'
  const esDios = user?.rol === 'dios'
  const [modoGuardado, setModo] = usePref('polaris:vista-modo', 'admin')

  const puedeAlternar = esDios && !!profesional
  const modo = rolProfesional ? 'profesional' : (puedeAlternar ? modoGuardado : 'admin')
  const esProfesional = rolProfesional || (puedeAlternar && modo === 'profesional')

  const value = {
    profesional,
    puedeAlternar,
    modo,
    esProfesional,
    profId: esProfesional ? (profesional?.id ?? null) : null,
    toggle: () => { if (puedeAlternar) setModo((m) => (m === 'profesional' ? 'admin' : 'profesional')) },
  }
  return <VistaContext.Provider value={value}>{children}</VistaContext.Provider>
}
