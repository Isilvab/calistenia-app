import type { ReactNode } from "react"

export interface SectionHeaderProps {
  kicker?: string
  title: string
  right?: ReactNode
}

export function SectionHeader({ kicker, title, right }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mt-6 mb-3 px-1">
      <div>
        {kicker && (
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">{kicker}</div>
        )}
        <div className="text-lg font-semibold tracking-tight">{title}</div>
      </div>
      {right}
    </div>
  )
}
