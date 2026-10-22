import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al montar, consulta la sesión vigente (cookie).
  useEffect(() => {
    authApi
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setCargando(false))
  }, [])

  const login = async (usuario, password) => {
    await authApi.login(usuario, password)
    // El login básico no trae rol/profesión; /me sí (necesario para la vista por rol).
    const d = await authApi.me()
    setUser(d.user)
  }

  const logout = async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
  }

  const updateAccount = async (payload) => {
    const d = await authApi.updateAccount(payload)
    // Merge para preservar rol/profesional (la respuesta de cuenta no los incluye).
    setUser((prev) => ({ ...prev, ...d.user }))
    return d.message
  }

  return (
    <AuthContext.Provider value={{ user, cargando, login, logout, updateAccount }}>
      {children}
    </AuthContext.Provider>
  )
}
