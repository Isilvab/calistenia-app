export interface ProgressBarProps {
  value: number
  max: number
  color?: string
}

export function ProgressBar({ value, max, color = "var(--ink)" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="pbar h-2">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
