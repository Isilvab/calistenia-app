import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { todayKey, formatDate, getWeekDays } from "@/lib/utils"
import { MOBILITY, QUOTES } from "@/data"
import { Card, Button, SectionHeader, I, Spinner } from "@/components/ui"
import type { Profile, Session as LogSession, Mobility as MobilityData } from "@/types"
import { useRutinaDraftStore } from "@/store/rutinaDraftStore"

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
  const [sessions, setSessions] = useState<Record<string, LogSession>>({})
  const [mobilityToday, setMobilityToday] = useState<MobilityData | null>(null)
  const [quote, setQuote] = useState('')
  const [rutinaCount, setRutinaCount] = useState(0)
  const clearDraft = useRutinaDraftStore(s => s.clearDraft)

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [prof, mob, allSessions, rutinas] = await Promise.all([
          storage.getProfile(),
          storage.getMobility(today),
          storage.listSessions(),
          storage.listRutinas(),
        ])
        if (prof) setProfile(prof)
        setMobilityToday(mob)
        setRutinaCount(rutinas.length)

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

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size={36}/></div>
  if (error) return <div className="p-4 text-[var(--bad)]">{error}</div>

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

  const mobDone = mobilityToday?.completada === true

  const recentCompare = computeRecentCompare(sessions)

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Hoy · {today.split('-').reverse().join('/')}</div>
          <div className="text-[26px] font-semibold leading-tight tracking-tight">Hola{profile?.nombre ? `, ${profile.nombre}` : ''}.</div>
        </div>
        <button onClick={() => navigate('/ajustes')} className="press w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center">
          <I.user size={18}/>
        </button>
      </div>

      {/* Empezar entrenamiento */}
      <Card className="!p-0 overflow-hidden !bg-[var(--surface-feature)] !border-[var(--surface-feature)]">
        <div className="p-5 text-white">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 font-medium mb-2">Entrenar</div>
          <div className="text-[28px] font-semibold leading-tight">Empezar entrenamiento</div>
          <div className="text-white/70 text-sm mt-1">Elegí una de tus rutinas y arrancá.</div>
          <Button variant="accent" size="lg" className="mt-4" icon={<I.play size={18}/>} onClick={() => navigate('/entrenar')}>
            Empezar
          </Button>
        </div>
      </Card>

      {/* Week dots */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {weekDays.map((k, i) => {
          const s = sessions[k]
          const done = s && s.tipo_sesion && s.tipo_sesion !== 'rest'
          const isToday = k === today
          return (
            <div key={k} className={`rounded-xl py-2 px-1 text-center text-[10px] text-[var(--ink)] ${isToday ? 'bg-[var(--surface)] border-2 border-[var(--ink)]' : 'bg-[var(--surface)] border border-[var(--line)]'}`}>
              <div className={`uppercase tracking-wider ${isToday ? 'font-semibold' : 'opacity-60'}`}>{['L','M','M','J','V','S','D'][i]}</div>
              <div className={`mx-auto mt-1 w-2 h-2 rounded-full ${done ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'}`}/>
            </div>
          )
        })}
      </div>

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

      {/* Mis rutinas */}
      <SectionHeader kicker="Rutinas" title="Mis rutinas custom" right={
        <button className="text-xs text-[var(--muted)] press" onClick={() => navigate('/mis-rutinas')}>Ver todas →</button>
      }/>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-medium">{rutinaCount > 0 ? `${rutinaCount} rutina${rutinaCount !== 1 ? 's' : ''} guardada${rutinaCount !== 1 ? 's' : ''}` : 'Sin rutinas custom aún'}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Crea y guarda tus propias rutinas</div>
          </div>
          <button
            onClick={() => { clearDraft(); navigate('/rutinas/nueva') }}
            className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl bg-[var(--surface-feature)] dark:bg-[#1e1e1e] text-white"
          >
            <I.plus size={13}/>
            Nueva
          </button>
        </div>
      </Card>

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
          <button onClick={() => navigate('/movilidad')} className={`press w-12 h-12 rounded-2xl flex items-center justify-center ${mobDone ? 'bg-[var(--accent)] text-[var(--surface-feature)]' : 'bg-[var(--surface-feature)] dark:bg-[#1e1e1e] text-white'}`}>
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
