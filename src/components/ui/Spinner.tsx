interface SpinnerProps {
  size?: number
}

export function Spinner({ size = 36 }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-[var(--line)] border-t-[var(--accent)] animate-spin motion-reduce:animate-none flex-shrink-0"
    />
  )
}
