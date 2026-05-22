import { createContext, useContext, useState, useCallback } from "react"
import type { ReactNode } from "react"

interface ToastItem {
  id: string
  msg: string
  duration?: number
}

interface ToastOptions {
  duration?: number
}

interface ToastContextValue {
  toast: (msg: string, opts?: ToastOptions) => void
}

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} })

export interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((msg: string, opts: ToastOptions = {}) => {
    const id = Math.random().toString(36).slice(2)
    setItems(xs => [...xs, { id, msg, ...opts }])
    setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), opts.duration ?? 2200)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed left-0 right-0 bottom-24 flex flex-col items-center gap-2 z-50 pointer-events-none px-4">
        {items.map(it => (
          <div key={it.id} className="toast anim-in pointer-events-auto">{it.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
