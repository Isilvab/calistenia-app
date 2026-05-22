import type { InputHTMLAttributes, ReactNode } from "react"

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  hint?: string
  suffix?: ReactNode
  prefix?: ReactNode
  containerClass?: string
}

export function Input({ label, hint, suffix, prefix, className = "", containerClass = "", ...rest }: InputProps) {
  return (
    <label className={`block ${containerClass}`}>
      {label && (
        <div className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide">{label}</div>
      )}
      <div className="flex items-center bg-white border border-[var(--line)] rounded-xl px-3 h-12 focus-within:border-[var(--ink)] transition-colors">
        {prefix && <span className="text-[var(--muted)] text-sm pr-2">{prefix}</span>}
        <input
          className={`flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--muted)] ${className}`}
          {...rest}
        />
        {suffix && <span className="text-[var(--muted)] text-sm pl-2">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-[var(--muted)] mt-1.5">{hint}</div>}
    </label>
  )
}
