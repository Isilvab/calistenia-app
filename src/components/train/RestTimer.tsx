import { useState, useEffect, useRef } from "react"
import { I } from "@/components/ui"
import { playBell, playTick } from "@/lib/sound"

// SVG ring — centre 84,84  r=68  C≈427.3
const CX = 84
const CY = 84
const R  = 68
const C  = 2 * Math.PI * R

export interface RestTimerProps {
  totalSec: number
  autoStart?: boolean   // true = rest (auto-starts); false = trabajo por tiempo
  label?: string
  sounds?: boolean
  onComplete: () => void
  onSkip?: () => void
}

export function RestTimer({
  totalSec,
  autoStart = true,
  label = 'Descanso',
  sounds = true,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const totalMs = totalSec * 1000

  const [remainingMs, setRemainingMs] = useState(totalMs)
  const [running, setRunning]         = useState(autoStart)

  // Use refs so interval closure is never stale
  const endTimeRef          = useRef<number>(Date.now() + totalMs)
  const pausedRemainingRef  = useRef<number>(totalMs)
  const tickedRef           = useRef<Set<number>>(new Set())
  const completedRef        = useRef(false)
  const onCompleteRef       = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // Init
  useEffect(() => {
    if (autoStart) {
      endTimeRef.current = Date.now() + totalMs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown loop — timestamp-based, 80 ms tick corrects drift
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const r = Math.max(0, endTimeRef.current - Date.now())
      setRemainingMs(r)

      if (sounds) {
        const rSec = Math.ceil(r / 1000)
        if (rSec >= 1 && rSec <= 3 && !tickedRef.current.has(rSec)) {
          tickedRef.current.add(rSec)
          playTick()
        }
      }

      if (r <= 0 && !completedRef.current) {
        completedRef.current = true
        clearInterval(id)
        setRunning(false)
        if (sounds) playBell()
        onCompleteRef.current()
      }
    }, 80)
    return () => clearInterval(id)
  }, [running, sounds])

  // ── Controls ──────────────────────────────────────────────────────────────

  const pause = () => {
    pausedRemainingRef.current = remainingMs
    setRunning(false)
  }

  const resume = () => {
    if (completedRef.current) return
    endTimeRef.current = Date.now() + pausedRemainingRef.current
    tickedRef.current  = new Set()
    setRunning(true)
  }

  const adjust = (deltaSec: number) => {
    if (running) {
      // Shift endTime in-place — no restart needed
      endTimeRef.current = Math.max(Date.now() + 1000, endTimeRef.current + deltaSec * 1000)
    } else {
      const next = Math.max(1000, pausedRemainingRef.current + deltaSec * 1000)
      pausedRemainingRef.current = next
      setRemainingMs(next)
    }
  }

  // ── Display ───────────────────────────────────────────────────────────────

  const displaySec = Math.ceil(remainingMs / 1000)
  const progress   = Math.min(1, remainingMs / totalMs) // 1 = full ring, 0 = empty
  const dashOffset = C * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] font-medium">
        {label}
      </div>

      {/* SVG ring */}
      <div className="relative" style={{ width: 168, height: 168 }}>
        <svg
          width="168" height="168"
          viewBox="0 0 168 168"
          className="-rotate-90 motion-reduce:hidden"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--line)"
            strokeWidth={10}
          />
          {/* Progress arc */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
        </svg>
        {/* Centre number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[50px] font-mono font-bold text-[var(--ink)] leading-none tabular-nums select-none">
            {displaySec}
          </span>
        </div>
      </div>

      {/* ±15s  ·  Play/Pause  ·  ±15s */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => adjust(-15)}
          className="press w-14 h-14 rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-[13px] font-semibold"
          aria-label="Restar 15 segundos"
        >
          −15s
        </button>
        <button
          onClick={running ? pause : resume}
          className="press rounded-full bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-md"
          style={{ width: 72, height: 72 }}
          aria-label={running ? 'Pausar' : 'Reanudar'}
        >
          {running ? <I.pause size={26} /> : <I.play size={26} />}
        </button>
        <button
          onClick={() => adjust(15)}
          className="press w-14 h-14 rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-[13px] font-semibold"
          aria-label="Agregar 15 segundos"
        >
          +15s
        </button>
      </div>

      {onSkip && (
        <button
          onClick={onSkip}
          className="press text-[13px] text-[var(--muted)] px-5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
        >
          Saltar descanso →
        </button>
      )}
    </div>
  )
}
