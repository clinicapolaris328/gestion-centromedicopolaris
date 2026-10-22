import { AlertTriangle, Check, Circle } from 'lucide-react'
import { REQUISITOS_PASSWORD } from '../../lib/password'
import '../../styles/ui.css'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ icon: Icon, tone = 'brand', label, value, hint }) {
  return (
    <div className="stat">
      <div className={`stat__icon tone-${tone}`}>{Icon && <Icon size={24} />}</div>
      <div>
        <div className="stat__label">{label}</div>
        <div className="stat__value">{value}</div>
        {hint && <div className="stat__hint">{hint}</div>}
      </div>
    </div>
  )
}

export function Badge({ tone = 'muted', children }) {
  return <span className={`badge-p tone-${tone}`}>{children}</span>
}

export function Card({ title, actions, children, bodyClass = '', className = '' }) {
  return (
    <div className={`card-p ${className}`}>
      {(title || actions) && (
        <div className="card-p__head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      <div className={`card-p__body ${bodyClass}`}>{children}</div>
    </div>
  )
}

export function Avatar({ nombre, apellido }) {
  const initials = `${(apellido || '?')[0]}${(nombre || '?')[0]}`.toUpperCase()
  return <div className="pac-avatar">{initials}</div>
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={40} />}
      <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{title}</div>
      {children && <div style={{ fontSize: 14 }}>{children}</div>}
    </div>
  )
}

export function Loader({ label = 'Cargando…' }) {
  return (
    <div className="empty">
      <div
        style={{
          width: 30, height: 30, borderRadius: '50%',
          border: '3px solid var(--line)', borderTopColor: 'var(--brand)',
          animation: 'spin .8s linear infinite',
        }}
      />
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10 }}>{label}</div>
    </div>
  )
}

export function ErrorState({ title = 'No se pudieron cargar los datos', children, onRetry }) {
  return (
    <div className="empty">
      <AlertTriangle size={40} color="var(--danger)" />
      <div style={{ fontWeight: 600, color: 'var(--navy)', margin: '4px 0' }}>{title}</div>
      {children && <div style={{ fontSize: 14 }}>{children}</div>}
      {onRetry && (
        <button className="btn btn-sm btn-outline-primary mt-2" onClick={onRetry}>Reintentar</button>
      )}
    </div>
  )
}

// Requisitos de la política de contraseñas, marcados en vivo mientras se escribe
// (espejo visual de supabase/functions/api/lib/password.ts).
export function PasswordRequisitos({ password }) {
  if (!password) return null
  return (
    <ul className="list-unstyled d-flex flex-wrap column-gap-3 row-gap-1 small mt-2 mb-0">
      {REQUISITOS_PASSWORD.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.id} className="d-inline-flex align-items-center gap-1"
            style={{ color: ok ? 'var(--ok)' : 'var(--muted)' }}>
            {ok ? <Check size={13} /> : <Circle size={11} />} {r.texto}
          </li>
        )
      })}
    </ul>
  )
}
