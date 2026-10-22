import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.webp'
import '../styles/login.css'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await login(usuario, password)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="login__aside">
        <img src={logo} alt="Polaris" className="login__logo" />
        <h2>Sistema de Gestión Clínica</h2>
        <p>Centro Médico Polaris</p>
        <span className="login__aside-foot">Acceso restringido · uso profesional</span>
      </div>

      <div className="login__panel">
        <form className="login__card" onSubmit={submit}>
          <h1>Iniciar sesión</h1>
          <p className="login__sub">Ingresá con tu cuenta autorizada.</p>

          {error && <div className="login__error">{error}</div>}

          <label className="login__field">
            <span>Usuario</span>
            <div className="login__input">
              <User size={17} />
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
          </label>

          <label className="login__field">
            <span>Contraseña</span>
            <div className="login__input">
              <Lock size={17} />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          <button type="submit" className="login__btn" disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 size={18} className="login__spin" /> Ingresando…
              </>
            ) : (
              <>
                <LogIn size={18} /> Ingresar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
