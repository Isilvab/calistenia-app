import type { SVGProps, ReactNode } from "react"

type IconBaseProps = {
  size?: number
  stroke?: number
  className?: string
  children?: ReactNode
} & Omit<SVGProps<SVGSVGElement>, "stroke" | "children">

export type IconProps = Omit<IconBaseProps, "children">

function IconBase({ size = 22, stroke = 2, className = "", children, ...p }: IconBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...p}
    >
      {children}
    </svg>
  )
}

export const I = {
  home:      (p: IconProps) => <IconBase {...p}><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></IconBase>,
  dumbbell:  (p: IconProps) => <IconBase {...p}><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></IconBase>,
  play:      (p: IconProps) => <IconBase {...p}><polygon points="6 3 20 12 6 21 6 3"/></IconBase>,
  apple:     (p: IconProps) => <IconBase {...p}><path d="M12 7c0-1.5.5-3 2-4 0 1.5-.5 3-2 4z"/><path d="M19 13.5c0 4.5-3 7.5-5 7.5-2 0-2-1-3.5-1S9 21 7 21c-2 0-5-3-5-7.5C2 9 5 7 7 7c1.5 0 3 .8 4 .8.9 0 2.5-.8 4-.8 2 0 5 2 5 6.5z"/></IconBase>,
  trending:  (p: IconProps) => <IconBase {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></IconBase>,
  activity:  (p: IconProps) => <IconBase {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></IconBase>,
  settings:  (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></IconBase>,
  plus:      (p: IconProps) => <IconBase {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></IconBase>,
  minus:     (p: IconProps) => <IconBase {...p}><line x1="5" y1="12" x2="19" y2="12"/></IconBase>,
  check:     (p: IconProps) => <IconBase {...p} stroke={p.stroke ?? 2.5}><polyline points="20 6 9 17 4 12"/></IconBase>,
  x:         (p: IconProps) => <IconBase {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></IconBase>,
  chevR:     (p: IconProps) => <IconBase {...p}><polyline points="9 18 15 12 9 6"/></IconBase>,
  chevL:     (p: IconProps) => <IconBase {...p}><polyline points="15 18 9 12 15 6"/></IconBase>,
  chevD:     (p: IconProps) => <IconBase {...p}><polyline points="6 9 12 15 18 9"/></IconBase>,
  chevU:     (p: IconProps) => <IconBase {...p}><polyline points="18 15 12 9 6 15"/></IconBase>,
  arrowUp:   (p: IconProps) => <IconBase {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></IconBase>,
  arrowDown: (p: IconProps) => <IconBase {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></IconBase>,
  arrowR:    (p: IconProps) => <IconBase {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></IconBase>,
  timer:     (p: IconProps) => <IconBase {...p}><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/></IconBase>,
  flame:     (p: IconProps) => <IconBase {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></IconBase>,
  droplet:   (p: IconProps) => <IconBase {...p}><path d="M12 2.69 17.66 8.34a8 8 0 1 1-11.32 0z"/></IconBase>,
  scale:     (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="10"/><path d="M16 8 9 15"/><path d="M12 3v3"/></IconBase>,
  ruler:     (p: IconProps) => <IconBase {...p}><path d="M21.3 8.7 8.7 21.3a2.4 2.4 0 0 1-3.4 0L2.7 18.7a2.4 2.4 0 0 1 0-3.4L15.3 2.7a2.4 2.4 0 0 1 3.4 0l2.6 2.6a2.4 2.4 0 0 1 0 3.4z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></IconBase>,
  target:    (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></IconBase>,
  trash:     (p: IconProps) => <IconBase {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6 17.5 20a2 2 0 0 1-2 1.8H8.5A2 2 0 0 1 6.5 20L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></IconBase>,
  edit:      (p: IconProps) => <IconBase {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></IconBase>,
  bolt:      (p: IconProps) => <IconBase {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></IconBase>,
  calendar:  (p: IconProps) => <IconBase {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></IconBase>,
  notebook:  (p: IconProps) => <IconBase {...p}><path d="M4 4a2 2 0 0 1 2-2h12v20H6a2 2 0 0 1-2-2z"/><line x1="8" y1="6" x2="14" y2="6"/><line x1="8" y1="10" x2="14" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></IconBase>,
  award:     (p: IconProps) => <IconBase {...p}><circle cx="12" cy="8" r="6"/><polyline points="8.5 13 7 22 12 19 17 22 15.5 13"/></IconBase>,
  zap:       (p: IconProps) => <IconBase {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></IconBase>,
  refresh:   (p: IconProps) => <IconBase {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></IconBase>,
  user:      (p: IconProps) => <IconBase {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></IconBase>,
  pause:     (p: IconProps) => <IconBase {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></IconBase>,
  bell:      (p: IconProps) => <IconBase {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></IconBase>,
  drop:      (p: IconProps) => <IconBase {...p}><path d="M12 2.69 17.66 8.34a8 8 0 1 1-11.32 0z"/></IconBase>,
  meal:      (p: IconProps) => <IconBase {...p}><path d="M3 11h18"/><path d="M5 11V6.5A4.5 4.5 0 0 1 9.5 2h0A4.5 4.5 0 0 1 14 6.5V11"/><path d="M5 11s-1 4 .5 6.5S9 22 12 22s5-1.5 6.5-4.5S19 11 19 11"/></IconBase>,
  list:      (p: IconProps) => <IconBase {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></IconBase>,
  info:      (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></IconBase>,
  stretch:   (p: IconProps) => <IconBase {...p}><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M9 9l6 0"/><path d="M12 12l-3 5"/><path d="M12 12l3 5"/><path d="M9 17l-2 3"/><path d="M15 17l2 3"/></IconBase>,
}
