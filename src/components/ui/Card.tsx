import type { ElementType, HTMLAttributes } from "react"

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
}

export interface CardFlatProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className = "", as, ...rest }: CardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const As = (as ?? "div") as any
  return (
    <As className={`card p-4 ${className}`} {...rest}>
      {children}
    </As>
  )
}

export function CardFlat({ children, className = "", ...rest }: CardFlatProps) {
  return (
    <div className={`card-flat p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
}
