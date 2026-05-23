import type { ReactElement } from "react"
import { NavLink } from "react-router-dom"
import { I } from "@/components/ui"
import type { IconProps } from "@/components/ui/icons"

interface NavItem {
  to: string
  label: string
  icon: (p: IconProps) => ReactElement
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',         label: 'Inicio',   icon: I.home },
  { to: '/entrenar', label: 'Entrenar', icon: I.dumbbell },
  { to: '/progreso', label: 'Progreso', icon: I.trending },
  { to: '/ajustes',  label: 'Ajustes',  icon: I.settings },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                isActive ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6}/>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
