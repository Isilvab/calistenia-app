import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { todayKey, formatDate, getWeekDays } from "@/lib/utils"
import { getSessionForDay, isDeloadWeek, MOBILITY, QUOTES } from "@/data"
import type { Session as DataSession } from "@/data"
import { Card, Button, SectionHeader, ProgressBar, I } from "@/components/ui"
import type { Profile, RoutineState, Session as LogSession, Nutrition as NutritionData, Mobility as MobilityData } from "@/types"

interface CompareRow {
  name: string
  now: string
  before: string
  delta: number
}

function computeRecentCompare(sessions: Record<string, LogSession>): CompareRow[] {
  const byType: Record<string, LogSession[]> = {}
  const keys = Object.keys(sessions).sort()
  for (const k of keys) {
    const s = sessions[k]
    if (!s || !s.tipo_sesion || s.tipo_sesion === 'rest') continue
    if (!byType[s.tipo_sesion]) byType[s.tipo_sesion] = []
    byType[s.tipo_sesion].push(s)
  }
  const sortedSessions = keys.map(k => sessions[k]).filter(s => s && s.tipo_sesion && s.tipo_sesion !== 'rest')
  const latest = sortedSessions[sortedSessions.length - 1]
  if (!latest) return []
  const sameType = byType[latest.tipo_sesion] ?? []
  const previous = sameType[sameType.length - 2]
  if (!previous) return []

  const rows: CompareRow[] = []
  for (const ex of latest.ejercicios.slice(0, 3)) {
    const prevEx = previous.ejercicios.find(e => e.nombre === ex.nombre)
    if (!prevEx) continue
    const sumNow = ex.series.filter(s => s.completada).reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
    const sumPrev = prevEx.series.filter(s => s.completada).reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
    rows.push({
      name: ex.nombre,
      now: `${ex.series.filter(s => s.completada).length}×∑${sumNow}`,
      before: `${prevEx.series.filter(s => s.completada).length}×∑${sumPrev}`,
      delta: sumNow - sumPrev,
    })
  }
  return rows
}

export default function Dashboard() {
  const navigate = useNavigate()
  const today = todayKey()
  const weekDays = getWeekDays()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [routine, setRoutine] = useState<RoutineState>({ bloque_actual: 1, semana_actual: 1, dia_actual: 1 })
  const [sessions, setSessions] = useState<Record<string, LogSession>>({})
  const [mobilityToday, setMobilityToday] = useState<MobilityData | null>(null)
  const [nutritionToday, setNutritionToday] = useState<NutritionData | null>(null)
  const [quote, setQuote] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [prof, routine_, mob, nut, allSessions] = await Promise.all([
          storage.getProfile(),
          storage.getRoutineState(),
          storage.getMobility(today),
          storage.getNutrition(today),
          storage.listSessions(),
        ])
        if (prof) setProfile(prof)
        if (routine_) setRoutine(routine_)
        setMobilityToday(mob)
        setNutritionToday(nut)

        const sessMap: Record<string, LogSession> = {}
        for (const { date, session } of allSessions) {
          sessMap[date] = session
        }
        setSessions(sessMap)

        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
        setQuote(QUOTES[dayOfYear % QUOTES.length])
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const pesoKg = profile?.peso_kg ?? 75
  const goalP = profile?.objetivo_proteina_g ?? Math.round(pesoKg * 1.8)
  const protein = nutritionToday?.proteina_g ?? 0
  const mobDone = mobilityToday?.completada === true

  const measurements = profile?.measurements ?? []
  const last = measurements[measurements.length - 1]
  const prev = measurements[measurements.length - 2]
  let trend = 'estable'
  let TrendIcon: typeof I.minus = I.minus
  let trendColor = 'text-[var(--muted)]'
  if (last && prev && last.peso_kg !== undefined && prev.peso_kg !== undefined) {
    const diff = last.peso_kg - prev.peso_kg
    if (Math.abs(diff) >= 0.3) {
      if (diff > 0) { trend = `+${diff.toFixed(1)} kg`; TrendIcon = I.arrowUp; trendColor = 'text-[var(--warn)]' }
      else { trend = `${diff.toFixed(1)} kg`; TrendIcon = I.arrowDown; trendColor = 'text-[var(--accent-2)]' }
    }
  }

  const weekDone = weekDays.filter(k => {
    const s = sessions[k]
    return s && s.tipo_sesion && s.tipo_sesion !== 'rest'
  }).length

  const todaySession: DataSession = getSessionForDay(routine.bloque_actual, routine.dia_actual)
  const recentCompare = computeRecentCompare(sessions)
  const deload = isDeloadWeek(routine.semana_actual)

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Hoy · {today.split('-').reverse().join('/')}</div>
          <div className="text-[26px] font-semibold leading-tight tracking-tight">Hola{profile?.nombre ? `, ${profile.nombre}` : ''}.</div>
        </div>
        <button onClick={() => navigate('/ajustes')} className="press w-10 h-10 rounded-full bg-white border border-[var(--line)] flex items-center justify-center">
          <I.user size={18}/>
        </button>
      </div>

      {/* Suggested session */}
      <Card className="!p-0 overflow-hidden bg-[var(--ink)] !border-[var(--ink)]">
        <div className="p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 font-medium">Sesión de hoy · B{routine.bloque_actual} · S{routine.semana_actual}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] font-medium">{weekDone}/6 entrenos · semana</div>
          </div>
          <div className="text-[28px] font-semibold leading-tight">{todaySession.name}</div>
          <div className="text-white/70 text-sm mt-1">{todaySession.focus}</div>

          {todaySession.rest ? (
            <Button variant="soft" size="lg" className="mt-5 !bg-white/10 !text-white !border-white/10 hover:!bg-white/20" onClick={() => navigate('/movilidad')} iconRight={<I.arrowR size={18}/>}>
              Movilidad y descanso
            </Button>
          ) : (
            <div className="flex gap-2 mt-5">
              <Button variant="accent" size="lg" className="flex-1" icon={<I.play size={18}/>} onClick={() => navigate('/entrenar')}>
                Empezar
              </Button>
              <Button variant="soft" size="lg" className="!bg-white/10 !text-white !border-white/10 hover:!bg-white/20" icon={<I.list size={18}/>} onClick={() => navigate('/rutinas')}>
                Ver
              </Button>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-white/[0.06] border-t border-white/10 flex items-center gap-3 text-white/70 text-xs">
          <div className="flex items-center gap-1.5"><I.bolt size={14}/> 25 min</div>
          <div className="w-px h-3 bg-white/15"/>
          <div>{todaySession.exercises?.length ?? 0} ejercicios</div>
          {deload && (
            <>
              <div className="w-px h-3 bg-white/15"/>
              <div className="text-[var(--accent)]">Deload</div>
            </>
          )}
        </div>
      </Card>

      {/* Week dots */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {weekDays.map((k, i) => {
          const s = sessions[k]
          const done = s && s.tipo_sesion && s.tipo_sesion !== 'rest'
          const isToday = k === today
          return (
            <div key={k} className={`rounded-xl py-2 px-1 text-center text-[10px] ${isToday ? 'bg-[var(--ink)] text-white' : 'bg-white border border-[var(--line)]'}`}>
              <div className="opacity-60 uppercase tracking-wider">{['L','M','M','J','V','S','D'][i]}</div>
              <div className={`mx-auto mt-1 w-2 h-2 rounded-full ${done ? 'bg-[var(--accent)]' : isToday ? 'bg-white/30' : 'bg-[var(--line-strong)]'}`}/>
            </div>
          )
        })}
      </div>

      {/* Protein */}
      <SectionHeader kicker="Nutrición" title="Proteína de hoy" right={
        <button className="text-xs text-[var(--muted)] press" onClick={() => navigate('/nutricion')}>Abrir →</button>
      }/>
      <Card>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-[34px] font-semibold leading-none font-mono tracking-tight">{protein}<span className="text-[var(--muted)] text-base font-normal">/{goalP} g</span></div>
            <div className="text-xs text-[var(--muted)] mt-1">{Math.max(0, goalP - protein)} g restantes · {nutritionToday?.comidas?.length ?? 0} comidas</div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="soft" onClick={() => navigate('/nutricion')} icon={<I.plus size={14}/>}>25g</Button>
          </div>
        </div>
        <ProgressBar value={protein} max={goalP} color="var(--ink)"/>
      </Card>

      {/* Weight */}
      <SectionHeader kicker="Progreso" title="Peso corporal" right={
        <button className="text-xs text-[var(--muted)] press" onClick={() => navigate('/progreso')}>Abrir →</button>
      }/>
      <Card>
        {last ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[34px] font-semibold leading-none font-mono tracking-tight">{last.peso_kg}<span className="text-[var(--muted)] text-base font-normal"> kg</span></div>
              <div className="text-xs text-[var(--muted)] mt-1">Última medición · {last.fecha ? formatDate(last.fecha) : '—'}</div>
            </div>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon size={16}/>
              <span>{trend}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--muted)]">Aún no registras tu peso. <button className="underline" onClick={() => navigate('/progreso')}>Hacerlo ahora</button></div>
        )}
      </Card>

      {/* Recent compare */}
      {recentCompare.length > 0 && (
        <>
          <SectionHeader kicker="Última sesión" title="Compara y supera"/>
          <Card className="!p-0">
            {recentCompare.map((row, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t hairline' : ''}`}>
                <div className="min-w-0 pr-2">
                  <div className="text-[15px] font-medium truncate">{row.name}</div>
                  <div className="text-xs text-[var(--muted)]">{row.before} → última</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono">{row.now}</span>
                  {row.delta > 0 && <span className="text-[var(--accent-2)] flex items-center"><I.arrowUp size={12}/>{row.delta}</span>}
                  {row.delta < 0 && <span className="text-[var(--bad)] flex items-center"><I.arrowDown size={12}/>{Math.abs(row.delta)}</span>}
                  {row.delta === 0 && <span className="text-[var(--muted)]">=</span>}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Mobility */}
      <SectionHeader kicker="Movilidad" title="Rutina de 5 min" right={
        <button className="text-xs text-[var(--muted)] press" onClick={() => navigate('/movilidad')}>Abrir →</button>
      }/>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-medium">{mobDone ? 'Completada hoy' : 'Pendiente hoy'}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">{MOBILITY.length} ejercicios · 5 min</div>
          </div>
          <button onClick={() => navigate('/movilidad')} className={`press w-12 h-12 rounded-2xl flex items-center justify-center ${mobDone ? 'bg-[var(--accent)] text-[var(--ink)]' : 'bg-[var(--ink)] text-white'}`}>
            {mobDone ? <I.check size={20}/> : <I.play size={18}/>}
          </button>
        </div>
      </Card>

      {/* Quote */}
      <div className="mt-6 px-2 text-center">
        <div className="text-[var(--muted)] text-sm leading-relaxed italic">"{quote}"</div>
      </div>
    </div>
  )
}
