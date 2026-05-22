import { useState, useEffect } from "react"
import { getStorage } from "@/lib/storage"
import { todayKey } from "@/lib/utils"
import { MOBILITY } from "@/data"
import { Card, Button, SectionHeader, I, useToast } from "@/components/ui"
import type { Mobility as MobilityData } from "@/types"

interface StreakDay {
  key: string
  done: boolean
}

function getStreakDays(history: Record<string, MobilityData>, n: number): StreakDay[] {
  const out: StreakDay[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = todayKey(d)
    out.push({ key, done: !!(history[key]?.completada) })
  }
  return out
}

export default function Mobility() {
  const { toast } = useToast()
  const today = todayKey()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobilityToday, setMobilityToday] = useState<MobilityData | null>(null)
  const [history, setHistory] = useState<Record<string, MobilityData>>({})

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const last14 = Array.from({ length: 14 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (13 - i))
          return todayKey(d)
        })
        const [todayData, historyEntries] = await Promise.all([
          storage.getMobility(today),
          Promise.all(last14.map(date =>
            storage.getMobility(date).then(mob => ({ date, mob }))
          )),
        ])
        setMobilityToday(todayData)
        const hist: Record<string, MobilityData> = {}
        for (const { date, mob } of historyEntries) {
          if (mob) hist[date] = mob
        }
        setHistory(hist)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  const handleUpdate = async (next: MobilityData) => {
    const storage = getStorage()
    await storage.saveMobility(today, next)
    setMobilityToday(next)
    setHistory(h => ({ ...h, [today]: next }))
  }

  const toggleItem = async (id: string) => {
    const currentItems = mobilityToday?.items ?? {}
    const nextItems = { ...currentItems, [id]: !currentItems[id] }
    const allDone = MOBILITY.every(it => nextItems[it.id])
    const next: MobilityData = { completada: allDone, items: nextItems }
    await handleUpdate(next)
    if (allDone && !mobilityToday?.completada) toast('Movilidad completada · buen trabajo')
  }

  const markAll = async () => {
    const nextItems: Record<string, boolean> = {}
    MOBILITY.forEach(it => { nextItems[it.id] = true })
    await handleUpdate({ completada: true, items: nextItems })
    toast('Movilidad completada')
  }

  const reset = async () => {
    await handleUpdate({ completada: false, items: {} })
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const items = MOBILITY
  const todayKeyVal = today
  const completed = mobilityToday?.completada
  const itemsState = mobilityToday?.items ?? {}
  const streakDays = getStreakDays(history, 14)

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Movilidad · 5 min</div>
      <div className="text-[26px] font-semibold tracking-tight">Protocolo diario</div>

      {/* Status */}
      <Card className={`mt-3 !p-5 ${completed ? 'bg-[var(--accent)] !border-[var(--accent)]' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">{todayKeyVal.split('-').reverse().join('/')}</div>
            <div className="text-[20px] font-semibold mt-0.5">{completed ? 'Completada' : 'Pendiente'}</div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">{Object.values(itemsState).filter(v => v).length}/{items.length} ejercicios</div>
          </div>
          {completed ? (
            <Button variant="outline" size="sm" icon={<I.refresh size={14}/>} onClick={reset}>Reiniciar</Button>
          ) : (
            <Button variant="primary" size="sm" icon={<I.check size={14}/>} onClick={markAll}>Marcar todos</Button>
          )}
        </div>
      </Card>

      {/* Items */}
      <SectionHeader kicker="Checklist" title="Ejercicios"/>
      <Card className="!p-0">
        {items.map((it, i) => {
          const done = !!itemsState[it.id]
          return (
            <button key={it.id} onClick={() => { void toggleItem(it.id) }}
              className={`press w-full flex items-center justify-between px-4 py-3.5 text-left ${i>0?'border-t hairline':''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">{String(i+1).padStart(2,'0')}</div>
                <div className="min-w-0">
                  <div className={`text-[15px] font-medium leading-tight ${done?'line-through text-[var(--muted)]':''}`}>{it.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{it.target}</div>
                </div>
              </div>
              <div className={`check ${done ? 'on' : ''} ml-3`}>{done && <I.check size={14}/>}</div>
            </button>
          )
        })}
      </Card>

      {/* Streak */}
      <SectionHeader kicker="Constancia" title="Últimos 14 días"/>
      <Card>
        <div className="flex gap-1.5 flex-wrap">
          {streakDays.map((d, i) => (
            <div key={i} title={d.key}
              className={`flex-1 min-w-[10%] aspect-square rounded-lg ${d.done ? 'bg-[var(--ink)]' : 'bg-[var(--bg)] border border-[var(--line)]'}`}/>
          ))}
        </div>
        <div className="mt-3 text-xs text-[var(--muted)]">
          {streakDays.filter(d => d.done).length} días completados en las últimas 2 semanas.
        </div>
      </Card>

      <div className="mt-6 text-xs text-[var(--muted)] px-2 text-center leading-relaxed">
        Hazla cuando despiertes, antes de entrenar o antes de dormir. Lo importante es la constancia.
      </div>
    </div>
  )
}
