import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { I, Spinner } from "@/components/ui"
import type { Rutina, RutinaEjercicio } from "@/types"
// PLAN FIJO DESACTIVADO — reactivable
// import type { RoutineState } from "@/types"
// import type { Session as DataSession, SessionId } from "@/data/routines"
// import { TRAINING_PROGRAM, getSessionForDay, DAY_ORDER } from "@/data"
import RutinaGuiada from "@/components/train/RutinaGuiada"

function estimarMinutos(ejercicios: RutinaEjercicio[]): number {
  let totalSeg = 0
  for (const ex of ejercicios) {
    const series = ex.series_objetivo ?? 0
    if (series <= 0) continue
    const descanso = ex.descanso_seg ?? 45
    if ((ex.modo ?? 'reps') === 'tiempo') {
      if (ex.duracion_seg) totalSeg += series * ex.duracion_seg
      totalSeg += series * descanso
    } else {
      const repsStr = ex.reps_objetivo ?? ''
      const rangeMatch = repsStr.match(/(\d+)\s*[-–]\s*(\d+)/)
      const reps = rangeMatch
        ? (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2
        : parseFloat(repsStr) || 0
      if (reps > 0) totalSeg += series * reps * 3
      totalSeg += series * descanso
    }
  }
  return Math.max(1, Math.round(totalSeg / 60))
}
// import { sessionToRutina } from "@/lib/train/programToRutina"

export default function Train() {
  const navigate = useNavigate()

  const [loading, setLoading]                       = useState(true)
  const [error, setError]                           = useState<string | null>(null)
  // PLAN FIJO DESACTIVADO — reactivable
  // const [routine, setRoutine] = useState<RoutineState>({ bloque_actual: 1, semana_actual: 1, dia_actual: 1 })
  // const [selectedDataSession, setSelectedDataSession] = useState<DataSession | null>(null)
  // const routineRef = useRef(routine)
  // useEffect(() => { routineRef.current = routine }, [routine])
  const [apiKey, setApiKey]   = useState('')
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [mode, setMode]       = useState<'selector' | 'custom'>('selector')
  const [customRutina, setCustomRutina] = useState<Rutina | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [settings, rutinasList] = await Promise.all([
          storage.getSettings(),
          storage.listRutinas(),
        ])
        setApiKey(settings.apiKeys?.exercisedb ?? '')
        setRutinas(rutinasList)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // PLAN FIJO DESACTIVADO — reactivable
  // const advanceRoutine = async () => {
  //   const cur      = routineRef.current
  //   const nextDay  = cur.dia_actual + 1
  //   let next: RoutineState = { ...cur }
  //   if (nextDay > 7) {
  //     next = { ...next, dia_actual: 1, semana_actual: cur.semana_actual + 1 }
  //     if (next.semana_actual > cur.bloque_actual * 4) {
  //       next = { ...next, bloque_actual: Math.min(3, cur.bloque_actual + 1) }
  //     }
  //   } else {
  //     next = { ...next, dia_actual: nextDay }
  //   }
  //   await getStorage().setRoutineState(next)
  //   setRoutine(next)
  // }
  // const startProgramSession = (dataSession: DataSession) => {
  //   setSelectedDataSession(dataSession)
  //   setMode('programa')
  // }

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size={36}/></div>
  if (error)   return <div className="p-4 text-red-600">{error}</div>

  // ── Custom guided flow ──────────────────────────────────────────────────────
  if (mode === 'custom' && customRutina) {
    return (
      <RutinaGuiada
        rutina={customRutina}
        apiKey={apiKey}
        onBack={() => setMode('selector')}
      />
    )
  }

  // PLAN FIJO DESACTIVADO — reactivable
  // if (mode === 'programa' && selectedDataSession) {
  //   const rutina    = sessionToRutina(selectedDataSession)
  //   const diaIdx    = DAY_ORDER.indexOf(selectedDataSession.id as SessionId)
  //   const programaMeta = {
  //     tipo_sesion:   selectedDataSession.id,
  //     nombre_sesion: selectedDataSession.name,
  //     bloque:        routine.bloque_actual,
  //     semana:        routine.semana_actual,
  //     dia:           diaIdx >= 0 ? diaIdx + 1 : routine.dia_actual,
  //   }
  //   return (
  //     <RutinaGuiada rutina={rutina} apiKey={apiKey} programaMeta={programaMeta}
  //       onBack={() => setMode('selector')} onSaved={() => { void advanceRoutine() }}/>
  //   )
  // }
  // const todayDataSession = getSessionForDay(routine.bloque_actual, routine.dia_actual)
  // const currentBlock     = TRAINING_PROGRAM.find(b => b.id === routine.bloque_actual) ?? TRAINING_PROGRAM[0]
  // const workoutSessions  = currentBlock.sessions.filter(s => !s.rest)

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Entrenar</div>
      <div className="text-[26px] font-semibold tracking-tight mb-5">¿Qué entrenamos hoy?</div>

      {/* PLAN FIJO DESACTIVADO — reactivable
      <div className="mb-5">
        <div className="text-[11px] ...">Sugerido · B · S</div>
        ...sesión sugerida del día y grilla de las 6 sesiones del bloque...
      </div>
      */}

      {/* ── Custom routines ─────────────────────────────────────────────────── */}
      {rutinas.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium mb-2">
            Mis rutinas custom
          </div>
          <div className="flex flex-col gap-2">
            {rutinas.map(r => (
              <button
                key={r.id}
                onClick={() => { setCustomRutina(r); setMode('custom') }}
                className="press w-full text-left card p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-tight truncate">{r.nombre}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    ~{estimarMinutos(r.ejercicios)} min · {r.ejercicios.length} ejercicio{r.ejercicios.length !== 1 ? 's' : ''}
                    {r.descripcion ? ` · ${r.descripcion}` : ''}
                  </div>
                </div>
                <I.chevR size={16} className="text-[var(--muted)] flex-shrink-0 ml-3"/>
              </button>
            ))}
          </div>
        </>
      )}

      {rutinas.length === 0 && (
        <div className="text-sm text-[var(--muted)] text-center py-4">
          No hay rutinas custom.{' '}
          <button className="underline text-[var(--ink)]" onClick={() => navigate('/mis-rutinas')}>
            Crear una
          </button>
        </div>
      )}
    </div>
  )
}
