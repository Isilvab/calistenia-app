import { useState, useEffect, useRef, useCallback } from "react"
import { ProgressBar, I } from "@/components/ui"
import { getStorage } from "@/lib/storage"
import { todayKey } from "@/lib/utils"
import { RestTimer } from "./RestTimer"
import { EjercicioGif } from "./EjercicioGif"
import type { Rutina, SerieRealizada, Session, EjercicioEnSesion } from "@/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// ─── Performance helpers ──────────────────────────────────────────────────────

/** Formato de performance previa para mostrar al lado de los inputs */
function formatPrev(s: SerieRealizada | null, modo: 'reps' | 'tiempo'): string {
  if (!s || (!s.reps && !s.peso)) return 'Primera vez'
  if (modo === 'tiempo') return s.reps ? `Ant: ${s.reps}s` : '—'
  const parts: string[] = []
  if (s.reps)  parts.push(s.reps)
  if (s.peso)  parts.push(`× ${s.peso} kg`)
  return parts.length ? `Ant: ${parts.join(' ')}` : '—'
}

// ─── Phase state machine ──────────────────────────────────────────────────────

type Phase =
  | { kind: 'ejercicio'; ejIdx: number; serIdx: number }
  | { kind: 'descanso';  ejIdx: number; serIdx: number }   // índices del set recién completado
  | { kind: 'completado'; duracion_min: number; totalSeries: number }

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProgramaMeta {
  tipo_sesion:   string
  nombre_sesion: string
  bloque:        number
  semana:        number
  dia:           number
}

interface Props {
  rutina: Rutina
  apiKey: string
  onBack: () => void
  /** Present when training a fixed-program session; overrides session metadata on save. */
  programaMeta?: ProgramaMeta
  /** Called immediately after a successful saveSession (before showing the completion screen). */
  onSaved?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RutinaGuiada({ rutina, apiKey, onBack, programaMeta, onSaved }: Props) {
  const ejercicios = rutina.ejercicios
  const total      = ejercicios.length

  // Todas las series de todos los ejercicios, pre-inicializadas
  const [ejerciciosState, setEjerciciosState] = useState<SerieRealizada[][]>(() =>
    ejercicios.map(ex =>
      Array.from({ length: Math.max(ex.series_objetivo ?? 1, 1) }, (): SerieRealizada => ({
        reps: '', peso: '', rir: '', completada: false,
      }))
    )
  )

  const [phase, setPhase]               = useState<Phase>({ kind: 'ejercicio', ejIdx: 0, serIdx: 0 })
  const [sesionPrevia, setSesionPrevia] = useState<Session | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [overwriteWarning, setOverwriteWarning] = useState(false)

  const startTimeRef      = useRef<number>(Date.now())
  const pendingSessionRef = useRef<Session | null>(null)
  const topRef            = useRef<HTMLDivElement>(null)

  // Cargar sesión previa: por tipo_sesion para programa, por rutina_id para custom
  useEffect(() => {
    if (programaMeta) {
      getStorage()
        .listSessions()
        .then(all => {
          const prev = all
            .filter(({ session: s }) => s.tipo_sesion === programaMeta.tipo_sesion && !s.draft)
            .sort((a, b) => b.date.localeCompare(a.date))[0]
          setSesionPrevia(prev?.session ?? null)
        })
        .catch(() => setSesionPrevia(null))
    } else {
      getStorage()
        .getUltimaSesionDeRutina(rutina.id)
        .then(s => setSesionPrevia(s))
        .catch(() => setSesionPrevia(null))
    }
  }, [rutina.id, programaMeta?.tipo_sesion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every phase change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [phase])

  // ── Series state helpers ──────────────────────────────────────────────────

  /** Immutable update — returns new full state */
  const patchSerie = (
    state: SerieRealizada[][],
    ejIdx: number,
    serIdx: number,
    patch: Partial<SerieRealizada>
  ): SerieRealizada[][] =>
    state.map((series, ei) =>
      ei !== ejIdx ? series : series.map((s, si) => si !== serIdx ? s : { ...s, ...patch })
    )

  // ── Performance previa ────────────────────────────────────────────────────

  const getPrevSerie = (ejNombre: string, serIdx: number): SerieRealizada | null => {
    if (!sesionPrevia) return null
    const prevEj = sesionPrevia.ejercicios.find(e => e.nombre === ejNombre)
    return prevEj?.series[serIdx] ?? null
  }

  // ── Session building ──────────────────────────────────────────────────────

  const buildSession = (state: SerieRealizada[][], duracion_min: number): Session => {
    const ejs: EjercicioEnSesion[] = ejercicios.map((ex, i) => ({
      nombre: ex.nombre,
      meta: {
        repsLabel: ex.modo === 'tiempo'
          ? `${ex.duracion_seg ?? 30}s`
          : (ex.reps_objetivo ?? ''),
        rir:     '',
        restSec: ex.descanso_seg ?? 45,
        note:    ex.nota,
      },
      series: state[i] ?? [],
    }))
    if (programaMeta) {
      return {
        fecha:         todayKey(),
        tipo_sesion:   programaMeta.tipo_sesion,
        nombre_sesion: programaMeta.nombre_sesion,
        bloque:        programaMeta.bloque,
        semana:        programaMeta.semana,
        dia:           programaMeta.dia,
        duracion_min,
        notas:         '',
        draft:         false,
        ejercicios:    ejs,
      }
    }
    return {
      fecha:          todayKey(),
      tipo_sesion:    'custom',
      nombre_sesion:  rutina.nombre,
      bloque:         0,
      semana:         0,
      dia:            0,
      duracion_min,
      notas:          '',
      draft:          false,
      rutina_id:      rutina.id,
      ejercicios:     ejs,
    }
  }

  const doSave = useCallback(async (session: Session, duracion_min: number, totalSeries: number) => {
    setSaving(true)
    setSaveError(null)
    try {
      await getStorage().saveSession(todayKey(), session)
      onSaved?.()
      setPhase({ kind: 'completado', duracion_min, totalSeries })
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }, [onSaved])

  const handleFinish = useCallback(async (state: SerieRealizada[][]) => {
    const duracion_min  = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
    const totalSeries   = state.reduce((acc, s) => acc + s.filter(x => x.completada).length, 0)
    const session       = buildSession(state, duracion_min)

    let shouldWarn = false
    try {
      const existing = await getStorage().getSession(todayKey())
      if (existing && !existing.draft) {
        shouldWarn = programaMeta
          ? existing.tipo_sesion !== programaMeta.tipo_sesion
          : existing.rutina_id !== rutina.id
      }
    } catch { /* proceder igual */ }

    if (shouldWarn) {
      pendingSessionRef.current = session
      setOverwriteWarning(true)
      // duracion/totalSeries stored in session already; reload on confirm
      return
    }
    await doSave(session, duracion_min, totalSeries)
  }, [doSave, rutina.id, ejercicios]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core flow: marcar serie como completada ───────────────────────────────

  const handleListo = useCallback((ejIdx: number, serIdx: number, extraPatch?: Partial<SerieRealizada>) => {
    const next = patchSerie(ejerciciosState, ejIdx, serIdx, { completada: true, ...extraPatch })
    setEjerciciosState(next)

    const isLastSerie = serIdx + 1 >= next[ejIdx].length
    const isLastEx    = ejIdx + 1 >= total

    if (isLastSerie && isLastEx) {
      void handleFinish(next)
    } else {
      setPhase({ kind: 'descanso', ejIdx, serIdx })
    }
  }, [ejerciciosState, total, handleFinish])

  // ── Advance after rest ────────────────────────────────────────────────────

  const advance = useCallback(() => {
    setPhase(prev => {
      if (prev.kind !== 'descanso') return prev
      const { ejIdx, serIdx } = prev
      if (serIdx + 1 < ejerciciosState[ejIdx].length) {
        return { kind: 'ejercicio', ejIdx,      serIdx: serIdx + 1 }
      }
      if (ejIdx + 1 < total) {
        return { kind: 'ejercicio', ejIdx: ejIdx + 1, serIdx: 0 }
      }
      // last of last — shouldn't reach here (handleListo intercepts), safety
      return prev
    })
  }, [ejerciciosState, total])

  // ── Back navigation ───────────────────────────────────────────────────────

  const handleBack = () => {
    if (phase.kind === 'completado') return
    if (phase.kind === 'descanso') {
      setPhase({ kind: 'ejercicio', ejIdx: phase.ejIdx, serIdx: phase.serIdx })
      return
    }
    const { ejIdx, serIdx } = phase
    if (serIdx > 0) {
      setPhase({ kind: 'ejercicio', ejIdx, serIdx: serIdx - 1 })
    } else if (ejIdx > 0) {
      const prevEjIdx  = ejIdx - 1
      const prevSerLen = ejerciciosState[prevEjIdx].length
      setPhase({ kind: 'ejercicio', ejIdx: prevEjIdx, serIdx: prevSerLen - 1 })
    } else {
      onBack()
    }
  }

  // ── Inline serie state updater (for live inputs) ──────────────────────────

  const updateSerie = (ejIdx: number, serIdx: number, patch: Partial<SerieRealizada>) => {
    setEjerciciosState(prev => patchSerie(prev, ejIdx, serIdx, patch))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETION SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase.kind === 'completado') {
    return (
      <div ref={topRef} className="px-4 pt-6 pb-28 anim-in flex flex-col items-center text-center gap-5">
        <div className="text-6xl mt-8">🎯</div>
        <div>
          <div className="text-[28px] font-semibold tracking-tight">Entrenamiento completado</div>
          <div className="text-[14px] text-[var(--muted)] mt-1">{rutina.nombre}</div>
        </div>

        {/* Summary strip */}
        <div className="w-full card !p-0 flex divide-x divide-[var(--line)]">
          {[
            { v: phase.duracion_min, u: 'min' },
            { v: total,              u: 'ejercicios' },
            { v: phase.totalSeries,  u: 'series' },
          ].map(({ v, u }) => (
            <div key={u} className="flex-1 py-4">
              <div className="text-[28px] font-semibold font-mono">{v}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mt-0.5">{u}</div>
            </div>
          ))}
        </div>

        {/* Per-exercise breakdown */}
        <div className="w-full flex flex-col gap-1.5">
          {ejercicios.map((ex, i) => {
            const s    = ejerciciosState[i]
            const done = s.filter(x => x.completada).length
            return (
              <div key={i} className="card !p-3 flex items-center justify-between text-left">
                <div className="text-[13px] font-medium flex-1 min-w-0 truncate">{ex.nombre}</div>
                <div className="text-[12px] text-[var(--muted)] flex-shrink-0 ml-3 tabular-nums">
                  {done}/{s.length} series
                </div>
              </div>
            )
          })}
        </div>

        {saving    && <div className="text-sm text-[var(--muted)]">Guardando…</div>}
        {saveError && <div className="text-sm text-red-500">{saveError}</div>}

        {overwriteWarning && (
          <div className="w-full card border-orange-300 bg-orange-50 flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-orange-700">Ya hay una sesión guardada hoy</div>
            <div className="text-[12px] text-orange-600">
              Si continuás, se sobreescribirá esa sesión con esta rutina.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setOverwriteWarning(false); pendingSessionRef.current = null; onBack() }}
                className="press flex-1 h-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-[13px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const s = pendingSessionRef.current
                  setOverwriteWarning(false)
                  pendingSessionRef.current = null
                  if (s) void doSave(s, phase.duracion_min, phase.totalSeries)
                }}
                className="press flex-1 h-10 rounded-xl bg-orange-500 text-white text-[13px] font-medium"
              >
                Guardar igual
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="press w-full h-14 rounded-2xl bg-[var(--ink)] text-[var(--bg)] text-[15px] font-semibold"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS HELPERS (compartidos descanso + ejercicio)
  // ═══════════════════════════════════════════════════════════════════════════

  const currentEjIdx  = phase.ejIdx
  const currentSerIdx = phase.serIdx
  const ex            = ejercicios[currentEjIdx]
  const series        = ejerciciosState[currentEjIdx]
  const modo          = ex.modo ?? 'reps'

  // Bar = pairs (set dentro de ejercicio)
  const totalPairs = ejerciciosState.reduce((acc, s) => acc + s.length, 0)
  const donePairs  =
    ejerciciosState.slice(0, currentEjIdx).reduce((acc, s) => acc + s.length, 0) +
    currentSerIdx

  // ── Shared header ─────────────────────────────────────────────────────────
  const SharedHeader = () => (
    <>
      <div className="flex items-center justify-between mb-3">
        <button onClick={handleBack} className="press flex items-center gap-1 text-[var(--muted)] text-[13px]">
          <I.chevL size={16} />
          {currentEjIdx === 0 && currentSerIdx === 0 && phase.kind === 'ejercicio' ? 'Salir' : 'Anterior'}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] font-medium">
            {currentEjIdx + 1}/{total} · S{currentSerIdx + 1}/{series.length}
          </span>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`press w-8 h-8 rounded-xl flex items-center justify-center border ${
              soundEnabled
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'
            }`}
            aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            <I.bell size={13} />
          </button>
        </div>
      </div>
      <ProgressBar value={donePairs} max={totalPairs} color="var(--accent)" />
    </>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // DESCANSO PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase.kind === 'descanso') {
    const descansoSeg = ex.descanso_seg ?? 45

    // What comes next?
    const nextIsNewExercise = currentSerIdx + 1 >= series.length
    const nextEjIdx  = nextIsNewExercise ? currentEjIdx + 1 : currentEjIdx
    const nextSerIdx = nextIsNewExercise ? 0 : currentSerIdx + 1
    const nextEx     = nextEjIdx < total ? ejercicios[nextEjIdx] : null

    return (
      <div ref={topRef} className="px-4 pt-4 pb-28 anim-in">
        <SharedHeader />

        <div className="mt-5 card p-4 flex flex-col items-center gap-2 text-center">
          {/* Completed badge */}
          <div className="mt-1 flex items-center gap-1.5 text-[var(--muted)] text-[12px]">
            <div className="check on w-5 h-5"><I.check size={12} /></div>
            <span>{ex.nombre} — serie {currentSerIdx + 1} completada</span>
          </div>

          {/* Next info */}
          {nextEx && (
            <div className="text-[13px] text-[var(--ink)] font-medium">
              {nextIsNewExercise
                ? `Siguiente: ${nextEx.nombre}`
                : `Siguiente: serie ${nextSerIdx + 1} de ${series.length}`}
            </div>
          )}

          {/* Timer */}
          <div className="mt-4 mb-2 w-full">
            <RestTimer
              key={`${currentEjIdx}-${currentSerIdx}`}
              totalSec={descansoSeg}
              autoStart
              label="Descanso"
              sounds={soundEnabled}
              onComplete={advance}
              onSkip={advance}
            />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EJERCICIO PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  const currentSerie = series[currentSerIdx]
  const prevSerie    = getPrevSerie(ex.nombre, currentSerIdx)
  const prevLabel    = formatPrev(prevSerie, modo)

  return (
    <div ref={topRef} className="px-4 pt-4 pb-28 anim-in">
      <SharedHeader />

      {/* Exercise card */}
      <div className="mt-4 card p-4 flex flex-col gap-3">
        {/* Kicker */}
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">
          {rutina.nombre}
        </div>

        {/* Name + GIF */}
        <div className="flex flex-col gap-2">
          <div className="text-[22px] font-semibold leading-tight">{capitalize(ex.nombre)}</div>
          {ex.exercisedb_id && (
            <EjercicioGif key={ex.exercisedb_id} exercisedbId={ex.exercisedb_id} apiKey={apiKey} />
          )}
        </div>

        {/* Goal chips */}
        <div className="flex flex-wrap gap-1.5">
          {modo === 'reps' && ex.reps_objetivo && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)]">
              {ex.reps_objetivo} reps objetivo
            </span>
          )}
          {modo === 'tiempo' && ex.duracion_seg && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)]">
              {ex.duracion_seg}s por serie
            </span>
          )}
          {ex.series_objetivo !== undefined && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
              {ex.series_objetivo} series
            </span>
          )}
        </div>

        {ex.nota && <div className="text-[12px] text-[var(--muted)] italic">{ex.nota}</div>}

        {/* Serie dots */}
        <div className="flex gap-1.5">
          {series.map((_s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentSerIdx
                  ? 'bg-[var(--ink)]'
                  : i === currentSerIdx
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--line)]'
              }`}
            />
          ))}
        </div>
        <div className="text-[11px] text-[var(--muted)] -mt-1">
          Serie {currentSerIdx + 1} de {series.length}
        </div>

        {/* Performance previa */}
        <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2 border border-[var(--line)]">
          <span className="text-[11px] uppercase tracking-widest text-[var(--muted)] font-medium">Referencia</span>
          <span className={`text-[13px] font-medium ${sesionPrevia ? 'text-[var(--ink)]' : 'text-[var(--muted)] italic'}`}>
            {prevLabel}
          </span>
        </div>

        {/* ── REPS MODE ── */}
        {modo === 'reps' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Reps',   key: 'reps' as const, value: currentSerie.reps, type: 'number', mode: 'numeric',  placeholder: '0'   },
                { label: 'Kg',     key: 'peso' as const, value: currentSerie.peso, type: 'number', mode: 'decimal',  placeholder: '0'   },
              ].map(({ label, key, value, type, mode, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">{label}</label>
                  <input
                    type={type}
                    inputMode={mode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
                    value={value}
                    placeholder={placeholder}
                    onChange={e => updateSerie(currentEjIdx, currentSerIdx, { [key]: e.target.value })}
                    className="h-14 w-full rounded-xl border border-[var(--line)] text-center text-[22px] font-mono font-semibold outline-none focus:border-[var(--ink)] transition-colors bg-[var(--surface-input)] text-[var(--ink)]"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => handleListo(currentEjIdx, currentSerIdx)}
              className="press w-full h-14 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] text-[16px] font-semibold flex items-center justify-center gap-2"
            >
              <I.check size={20} />
              Listo
            </button>
          </div>
        )}

        {/* ── TIEMPO MODE ── */}
        {modo === 'tiempo' && (
          <div className="flex flex-col items-center gap-3">
            <RestTimer
              key={`tiempo-${currentEjIdx}-${currentSerIdx}`}
              totalSec={ex.duracion_seg ?? 30}
              autoStart={false}
              label="Tiempo de trabajo"
              sounds={soundEnabled}
              onComplete={() =>
                handleListo(currentEjIdx, currentSerIdx, { reps: String(ex.duracion_seg ?? 30) })
              }
            />
            <button
              onClick={() =>
                handleListo(currentEjIdx, currentSerIdx, { reps: String(ex.duracion_seg ?? 30) })
              }
              className="press w-full h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-[14px] font-medium flex items-center justify-center gap-2"
            >
              <I.check size={16} />
              Listo (completar serie)
            </button>
          </div>
        )}
      </div>

      {/* Save error */}
      {saveError && <div className="mt-3 text-sm text-red-500">{saveError}</div>}

      {/* Overwrite warning (shouldn't appear here but kept as safety) */}
      {overwriteWarning && (
        <div className="card mt-3 border-orange-300 bg-orange-50 flex flex-col gap-3 anim-in">
          <div className="text-[13px] font-semibold text-orange-700">Ya hay una sesión guardada hoy</div>
          <div className="flex gap-2">
            <button
              onClick={() => { setOverwriteWarning(false); pendingSessionRef.current = null }}
              className="press flex-1 h-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-[13px]"
            >Cancelar</button>
            <button
              onClick={() => {
                const s = pendingSessionRef.current
                setOverwriteWarning(false)
                pendingSessionRef.current = null
                if (s) {
                  const duracion_min = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
                  const totalSeries  = ejerciciosState.reduce((acc, sr) => acc + sr.filter(x => x.completada).length, 0)
                  void doSave(s, duracion_min, totalSeries)
                }
              }}
              className="press flex-1 h-10 rounded-xl bg-orange-500 text-white text-[13px] font-medium"
            >Guardar igual</button>
          </div>
        </div>
      )}
    </div>
  )
}
