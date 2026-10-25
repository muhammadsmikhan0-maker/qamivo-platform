import { BriefcaseBusiness, RefreshCw } from 'lucide-react'
export function Feedback({
  error,
  loading,
  reload,
}: {
  error: string
  loading: boolean
  reload: () => unknown
}) {
  if (loading)
    return (
      <div role="status" className="loading-state">
        <span className="sr-only">Loading marketplace records…</span>
      </div>
    )
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        <button className="button secondary" onClick={() => void reload()}>
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    )
  return null
}
export function Empty({
  title,
  children,
  href,
  label,
}: {
  title: string
  children: React.ReactNode
  href?: string
  label?: string
}) {
  return (
    <div className="empty-state">
      <BriefcaseBusiness size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <a className="button" href={href}>
          {label}
        </a>
      )}
    </div>
  )
}
