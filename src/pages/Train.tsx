import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { todayKey, fmtMMSS } from "@/lib/utils"
import { getSessionForDay } from "@/data"
import { Card, Button, ProgressBar, I, useToast } from "@/components/ui"
import type { RoutineState, Session, EjercicioEnSesion, SerieRealizada } from "@/types"

// TODO: integrar exercisedb cuando esté migrado
function DemoButton({ name: _name, className }: { name: string; className?: string }) {
  return (
    <button disabled className={`opacity-50 text-xs px-2 py-1 rounded border border-[var(--line)] text-[var(--muted)] ${className ?? ''}`}>
      GIF próximamente
    </button>
  )
}

interface SetInputProps {
  value: string
  placeholder: string
  onChange: (v: string) => void
  done: boolean
  small?: boolean
}

function SetInput({ value, placeholder, onChange, done, small }: SetInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`h-11 w-full rounded-xl border text-center text-[15px] font-mono outline-none transition-colors ${done ? 'bg-white border-[var(--line)] text-[var(--ink)]' : 'bg-white border-[var(--line)] focus:border-[var(--ink)]'} ${small ? 'text-sm' : ''}`}
    />
  )
}

function buildInitialSession(
  today: string,
  routine: RoutineState,
): Session {
  const todaySession = getSessionForDay(routine.bloque_actual, routine.dia_actual)
  const ejercicios: EjercicioEnSesion[] = todaySession.exercises.map(ex => ({
    nombre: ex.name,
    meta: { repsLabel: ex.repsLabel, rir: ex.rir, restSec: ex.restSec, note: ex.note },
    series: Array.from({ length: ex.sets }, (): SerieRealizada => ({ reps: '', peso: '', rir: '', completada: false })),
  }))
  return {
    fecha: today,
    tipo_sesion: todaySession.id,
    nombre_sesion: todaySession.name,
    bloque: routine.bloque_actual,
    semana: routine.semana_actual,
    dia: routine.dia_actual,
    duracion_min: 0,
    notas: '',
    draft: true,
    ejercicios,
  }
}

export default function Train() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const today = todayKey()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routine, setRoutine] = useState<RoutineState>({ bloque_actual: 1, semana_actual: 1, dia_actual: 1 })
  const [session, setSession] = useState<Session | null>(null)
  const [allSessions, setAllSessions] = useState<Record<string, Session>>({})

  const startTimeRef = useRef(Date.now())

  // Rest timer
  const [restSec, setRestSec] = useState(0)
  const [restRunning, setRestRunning] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [rout, stored, allSessionsList] = await Promise.all([
          storage.getRoutineState(),
          storage.getSession(today),
          storage.listSessions(),
        ])
        const activeRoutine = rout ?? { bloque_actual: 1, semana_actual: 1, dia_actual: 1 }
        setRoutine(activeRoutine)

        const sessMap: Record<string, Session> = {}
        for (const { date, session: s } of allSessionsList) {
          sessMap[date] = s
        }
        setAllSessions(sessMap)

        const todayDataSession = getSessionForDay(activeRoutine.bloque_actual, activeRoutine.dia_actual)
        const resumeMatches = stored && stored.tipo_sesion === todayDataSession.id && stored.draft === true
        if (resumeMatches) {
          setSession(stored)
        } else {
          setSession(buildInitialSession(today, activeRoutine))
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  // Persist draft on each change
  useEffect(() => {
    if (!session) return
    const storage = getStorage()
    void storage.saveSession(today, session).catch(e => console.error(e))
  }, [session, today])

  // Rest timer tick
  useEffect(() => {
    if (!restRunning) return
    tickRef.current = setInterval(() => {
      setRestSec(s => {
        if (s <= 1) {
          if (tickRef.current !== null) clearInterval(tickRef.current)
          setRestRunning(false)
          try { navigator.vibrate?.(120) } catch { /* unsupported */ }
          toast('Descanso completado')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current !== null) clearInterval(tickRef.current)
    }
  }, [restRunning, toast])

  const startRest = (sec: number) => { setRestSec(sec); setRestRunning(true) }
  const cancelRest = () => { setRestSec(0); setRestRunning(false) }

  const updateSet = (eIdx: number, sIdx: number, patch: Partial<SerieRealizada>) => {
    setSession(prev => {
      if (!prev) return prev
      const ej = prev.ejercicios.slice()
      const series = ej[eIdx].series.slice()
      series[sIdx] = { ...series[sIdx], ...patch }
      ej[eIdx] = { ...ej[eIdx], series }
      return { ...prev, ejercicios: ej }
    })
  }

  const toggleComplete = (eIdx: number, sIdx: number) => {
    if (!session) return
    const cur = session.ejercicios[eIdx].series[sIdx]
    const next = !cur.completada
    updateSet(eIdx, sIdx, { completada: next })
    if (next) {
      const rest = session.ejercicios[eIdx].meta.restSec || 60
      startRest(rest)
    }
  }

  const prevSession = useMemo(() => {
    if (!session) return null
    const keys = Object.keys(allSessions).filter(k => k !== today).sort()
    for (let i = keys.length - 1; i >= 0; i--) {
      const s = allSessions[keys[i]]
      if (s && s.tipo_sesion === session.tipo_sesion && !s.draft) return s
    }
    return null
  }, [allSessions, today, session])

  const finish = async () => {
    if (!session) return
    const storage = getStorage()
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
    const final: Session = { ...session, draft: false, duracion_min: duration }
    await storage.saveSession(today, final)

    // Advance routine
    const nextDay = routine.dia_actual + 1
    let next: RoutineState = { ...routine }
    if (nextDay > 7) {
      next = { ...next, dia_actual: 1, semana_actual: routine.semana_actual + 1 }
      if (next.semana_actual > routine.bloque_actual * 4) {
        next = { ...next, bloque_actual: Math.min(3, routine.bloque_actual + 1) }
      }
    } else {
      next = { ...next, dia_actual: nextDay }
    }
    await storage.setRoutineState(next)
    navigate('/')
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!session) return null

  const todayDataSession = getSessionForDay(routine.bloque_actual, routine.dia_actual)

  if (todayDataSession.rest) {
    return (
      <div className="px-4 pt-4 pb-28 anim-in">
        <button onClick={() => navigate('/')} className="press flex items-center gap-1 text-sm text-[var(--muted)] mb-3"><I.chevL size={16}/> Volver</button>
        <Card className="text-center !p-8">
          <div className="text-3xl mb-1">🌿</div>
          <div className="text-xl font-semibold">Día de descanso</div>
          <div className="text-sm text-[var(--muted)] mt-1">Recuperación activa. Te recomiendo movilidad y caminar 20 min.</div>
        </Card>
      </div>
    )
  }

  const completedSets = session.ejercicios.reduce((acc, ex) => acc + ex.series.filter(s => s.completada).length, 0)
  const totalSets = session.ejercicios.reduce((acc, ex) => acc + ex.series.length, 0)

  return (
    <div className="pb-40 anim-in">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/95 backdrop-blur border-b hairline">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate('/')} className="press w-9 h-9 rounded-full bg-white border border-[var(--line)] flex items-center justify-center">
              <I.chevL size={18}/>
            </button>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">B{session.bloque} · S{session.semana} · D{session.dia}</div>
            <button onClick={() => { void finish() }} className="press px-3 h-9 rounded-full bg-[var(--accent)] text-[var(--ink)] text-sm font-semibold flex items-center gap-1">
              Finalizar <I.check size={16}/>
            </button>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-[22px] font-semibold tracking-tight">{todayDataSession.name}</div>
            <div className="text-xs text-[var(--muted)] font-mono">{completedSets}/{totalSets} series</div>
          </div>
          <div className="mt-2"><ProgressBar value={completedSets} max={totalSets} color="var(--ink)"/></div>
        </div>
      </div>

      {/* Rest timer */}
      {(restRunning || restSec > 0) && (
        <div className="sticky top-[88px] z-10 px-4 pt-3">
          <div className="card !p-3 flex items-center gap-3 bg-[var(--ink)] !border-[var(--ink)] text-white anim-in">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <I.timer size={18}/>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-white/60">Descanso</div>
              <div className="text-2xl font-mono leading-none mt-0.5">{fmtMMSS(restSec)}</div>
            </div>
            <button onClick={() => setRestRunning(r => !r)} className="press w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {restRunning ? <I.pause size={16}/> : <I.play size={16}/>}
            </button>
            <button onClick={cancelRest} className="press w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <I.x size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* Exercises */}
      <div className="px-4 pt-4 flex flex-col gap-3">
        {session.ejercicios.map((ex, eIdx) => {
          const exName = ex.nombre || todayDataSession.exercises[eIdx]?.name || ''
          const prevEx = prevSession?.ejercicios?.find(p => (p.nombre || '') === exName)
          return (
            <Card key={eIdx} className="!p-0 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b hairline">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="text-[16px] font-semibold leading-snug flex-1 min-w-0">{exName}</div>
                      <DemoButton name={exName} className="mt-0.5"/>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1 flex items-center gap-2 flex-wrap">
                      <span>{ex.series.length} × {ex.meta.repsLabel}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--line-strong)]"/>
                      <span>RIR {ex.meta.rir}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--line-strong)]"/>
                      <span>desc {ex.meta.restSec}s</span>
                    </div>
                    {ex.meta.note && <div className="text-xs text-[var(--muted)] italic mt-1">{ex.meta.note}</div>}
                  </div>
                </div>
              </div>

              {/* Sets table */}
              <div>
                <div className="grid grid-cols-[24px_1fr_1fr_64px_44px] gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--muted)] font-medium">
                  <div>#</div>
                  <div>Reps</div>
                  <div>Peso</div>
                  <div>RIR</div>
                  <div></div>
                </div>
                {ex.series.map((s, sIdx) => {
                  const prevSet = prevEx?.series?.[sIdx]
                  return (
                    <div key={sIdx} className={`grid grid-cols-[24px_1fr_1fr_64px_44px] gap-2 px-4 py-2 items-center ${sIdx > 0 ? 'border-t hairline' : ''} ${s.completada ? 'bg-[var(--bg)]' : ''}`}>
                      <div className="text-sm text-[var(--muted)] font-mono">{sIdx + 1}</div>
                      <SetInput
                        value={s.reps}
                        placeholder={prevSet ? String(prevSet.reps || '–') : '0'}
                        onChange={v => updateSet(eIdx, sIdx, { reps: v })}
                        done={s.completada}
                      />
                      <SetInput
                        value={s.peso}
                        placeholder={prevSet ? String(prevSet.peso || '–') : 'kg'}
                        onChange={v => updateSet(eIdx, sIdx, { peso: v })}
                        done={s.completada}
                      />
                      <SetInput
                        value={s.rir}
                        placeholder="–"
                        onChange={v => updateSet(eIdx, sIdx, { rir: v })}
                        done={s.completada}
                        small
                      />
                      <button
                        onClick={() => toggleComplete(eIdx, sIdx)}
                        className={`press check ${s.completada ? 'on' : ''} mx-auto`}
                        aria-label="completada"
                      >
                        {s.completada && <I.check size={14}/>}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Quick rest */}
              <div className="flex items-center gap-2 px-4 py-3 border-t hairline bg-[var(--bg)]/50">
                <span className="text-xs text-[var(--muted)]">Iniciar descanso</span>
                <button className="chip press" onClick={() => startRest(60)}>60s</button>
                <button className="chip press" onClick={() => startRest(90)}>90s</button>
                <button className="chip press" onClick={() => startRest(120)}>2 min</button>
              </div>
            </Card>
          )
        })}

        {/* Notes */}
        <Card>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium mb-2">Notas de la sesión</div>
          <textarea
            value={session.notas}
            onChange={e => setSession(s => s ? { ...s, notas: e.target.value } : s)}
            placeholder="Cómo te sentiste, técnica, observaciones..."
            rows={3}
            className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--muted)] resize-none"
          />
        </Card>

        {/* Finalize repeated */}
        <Button variant="primary" size="block" iconRight={<I.check size={18}/>} onClick={() => { void finish() }}>
          Finalizar sesión
        </Button>
      </div>
    </div>
  )
}

