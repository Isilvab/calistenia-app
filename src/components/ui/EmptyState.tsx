import type { ReactNode } from "react"

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="card-flat p-6 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] mb-3">
        {icon}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      {body && <div className="text-sm text-[var(--muted)] mb-3">{body}</div>}
      {action}
    </div>
  )
}
