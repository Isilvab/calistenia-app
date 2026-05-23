import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { isDeloadWeek } from "@/lib/utils"
import { TRAINING_PROGRAM, PROGRESSION_RULES } from "@/data"
import { Card, Button, SectionHeader, I, Spinner } from "@/components/ui"
import type { RoutineState } from "@/types"

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// TODO: integrar exercisedb cuando esté migrado
function DemoButton({ name: _name }: { name: string }) {
  return (
    <button disabled className="opacity-50 text-xs px-2 py-1 rounded border border-[var(--line)] text-[var(--muted)]">
      GIF próximamente
    </button>
  )
}

export default function Routines() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routineState, setRoutineState] = useState<RoutineState | null>(null)
  const [openBlock, setOpenBlock] = useState<number | null>(null)
  const [openSession, setOpenSession] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const routine = await storage.getRoutineState()
        const loaded = routine ?? { bloque_actual: 1, semana_actual: 1, dia_actual: 1 }
        setRoutineState(loaded)
        setOpenBlock(loaded.bloque_actual)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleJumpTo = async (blockId: number, dayIndex: number) => {
    if (!routineState) return
    const storage = getStorage()
    const next: RoutineState = { ...routineState, bloque_actual: blockId, dia_actual: dayIndex }
    await storage.setRoutineState(next)
    setRoutineState(next)
  }

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size={36}/></div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!routineState) return null

  const routine = routineState

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Programa</div>
          <div className="text-[26px] font-semibold tracking-tight">12 semanas · calistenia</div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => navigate('/rutinas/nueva')}
            className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl bg-[var(--ink)] text-[var(--bg)]"
          >
            <I.plus size={13}/>
            Nueva
          </button>
          <button
            onClick={() => navigate('/buscar')}
            className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border border-[var(--line)] bg-white text-[var(--on-light)]"
          >
            <I.bolt size={13}/>
            Ejercicios
          </button>
        </div>
      </div>
      <div className="text-sm text-[var(--muted)] mt-1">3 bloques de 4 semanas. Split push/pull/piernas A·B + descanso. 25 min por sesión.</div>
      <button
        onClick={() => navigate('/mis-rutinas')}
        className="press mt-3 w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--line)] bg-white text-[var(--on-light)]"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <I.list size={15}/>
          Mis rutinas custom
        </span>
        <I.chevR size={15} className="text-[var(--muted)]"/>
      </button>

      {/* Where am I */}
      <Card className="mt-4 !p-4 bg-[var(--ink)] !border-[var(--ink)] text-[var(--bg)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--bg)]/60 font-medium">Estás en</div>
            <div className="text-[18px] font-semibold mt-0.5">Bloque {routine.bloque_actual} · Semana {routine.semana_actual} · Día {routine.dia_actual}</div>
            <div className="text-xs text-[var(--bg)]/60 mt-0.5">
              {TRAINING_PROGRAM[routine.bloque_actual-1].subtitle}
              {isDeloadWeek(routine.bloque_actual, routine.semana_actual) && ' · Semana de deload'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold font-mono">{routine.semana_actual}<span className="text-[var(--bg)]/40 text-base">/12</span></div>
          </div>
        </div>
      </Card>

      {/* Blocks */}
      {TRAINING_PROGRAM.map((block) => {
        const isOpen = openBlock === block.id
        const active = routine.bloque_actual === block.id
        return (
          <div key={block.id} className="mt-4">
            <button
              onClick={() => setOpenBlock(isOpen ? null : block.id)}
              className="press w-full text-left card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold font-mono ${active ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--bg)] text-[var(--ink-soft)]'}`}>
                  B{block.id}
                </div>
                <div>
                  <div className="text-[15px] font-semibold leading-tight">{block.name}</div>
                  <div className="text-xs text-[var(--muted)]">Semanas {block.weeks[0]}–{block.weeks[block.weeks.length-1]} · {block.subtitle}</div>
                </div>
              </div>
              {isOpen ? <I.chevU size={18} className="text-[var(--muted)]"/> : <I.chevD size={18} className="text-[var(--muted)]"/>}
            </button>

            {isOpen && (
              <div className="mt-3 flex flex-col gap-2 anim-in">
                {block.sessions.map((sess, idx) => {
                  const isActiveDay = active && routine.dia_actual === idx + 1
                  const sessKey = `${block.id}-${sess.id}`
                  const isOpenSess = openSession === sessKey
                  return (
                    <div key={sess.id} className="card !p-0 overflow-hidden">
                      <button
                        onClick={() => setOpenSession(isOpenSess ? null : sessKey)}
                        className="press w-full text-left px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] w-7">{DAY_LABELS[idx]}</div>
                          <div className="min-w-0">
                            <div className={`text-[15px] font-semibold leading-tight ${isActiveDay ? 'text-[var(--ink)]' : ''}`}>
                              {sess.name}
                              {isActiveDay && <span className="ml-2 text-[10px] uppercase tracking-widest bg-[var(--accent)] text-[var(--ink)] px-1.5 py-0.5 rounded">Hoy</span>}
                            </div>
                            <div className="text-xs text-[var(--muted)]">{sess.focus}</div>
                          </div>
                        </div>
                        {isOpenSess ? <I.chevU size={16} className="text-[var(--muted)]"/> : <I.chevR size={16} className="text-[var(--muted)]"/>}
                      </button>

                      {isOpenSess && (
                        <div className="border-t hairline">
                          {sess.rest ? (
                            <div className="p-4 text-sm text-[var(--muted)]">Recuperación activa. Movilidad, caminata 20 min.</div>
                          ) : (
                            <div>
                              {sess.exercises.map((ex, exIdx) => (
                                <div key={exIdx} className={`px-4 py-3 ${exIdx>0?'border-t hairline':''}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-[14px] font-medium flex-1 min-w-0">{ex.name}</div>
                                    <DemoButton name={ex.name}/>
                                  </div>
                                  <div className="text-xs text-[var(--muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>{ex.sets} × {ex.repsLabel}</span>
                                    <span>desc {ex.restSec}s</span>
                                  </div>
                                  {ex.note && <div className="text-xs italic text-[var(--muted)] mt-1">{ex.note}</div>}
                                </div>
                              ))}
                              {block.id === routine.bloque_actual && (
                                <div className="p-3 border-t hairline">
                                  <Button variant="soft" size="md" className="w-full" onClick={() => { void handleJumpTo(block.id, idx + 1) }} icon={<I.calendar size={16}/>}>
                                    Saltar a este día
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Progression rules */}
      <SectionHeader kicker="Reglas" title="Progresión semanal"/>
      <Card className="!p-0">
        {PROGRESSION_RULES.map((r, i) => (
          <div key={i} className={`px-4 py-3 ${i>0?'border-t hairline':''}`}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-medium">{r.week}</div>
            <div className="text-sm mt-1 leading-snug">{r.text}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}
