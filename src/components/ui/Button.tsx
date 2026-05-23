import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react"

type ButtonVariant = "primary" | "accent" | "soft" | "ghost" | "outline" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "block"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  as?: ElementType
}

const sizes: Record<ButtonSize, string> = {
  sm:    "h-9 px-3 text-sm rounded-xl",
  md:    "h-11 px-4 text-[15px] rounded-2xl",
  lg:    "h-14 px-5 text-base rounded-2xl",
  block: "h-14 px-5 w-full text-base rounded-2xl",
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ink)] text-[var(--bg)] hover:brightness-95",
  accent:  "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-95",
  soft:    "bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]",
  ghost:   "bg-transparent text-[var(--ink)] hover:bg-[var(--line)]",
  outline: "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-strong)] hover:bg-[var(--bg)]",
  danger:  "bg-[var(--bad)] text-white hover:brightness-95",
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  onClick,
  className = "",
  disabled,
  type = "button",
  as,
  ...rest
}: ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const As = (as ?? "button") as any
  return (
    <As
      type={As === "button" ? type : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`press tap inline-flex items-center justify-center gap-2 font-medium ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </As>
  )
}
