import type { ReactNode, MouseEvent } from "react"

export interface ModalProps {
  open: boolean
  onClose: () => void
  children?: ReactNode
  title?: string
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 anim-in"
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        {children}
      </div>
    </div>
  )
}
