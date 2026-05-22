import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { getStorage } from "@/lib/storage"
import { todayKey } from "@/lib/utils"
import { FOODS, NUTRITION_TIPS } from "@/data"
import { Card, CardFlat, SectionHeader, EmptyState, ProgressBar, I, useToast } from "@/components/ui"
import type { Profile, Nutrition as NutritionData, Comida } from "@/types"

export default function Nutrition() {
  const { toast } = useToast()
  const today = todayKey()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [data, setData] = useState<NutritionData>({ proteina_g: 0, calorias_estimadas: 0, agua_litros: 0, comidas: [] })

  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [prof, nut] = await Promise.all([
          storage.getProfile(),
          storage.getNutrition(today),
        ])
        setProfile(prof)
        if (nut) setData(nut)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  const saveData = async (next: NutritionData) => {
    const storage = getStorage()
    await storage.saveNutrition(today, next)
    setData(next)
  }

  const addMeal = async (proteinaG: number, nombre: string, caloriasExtra = 0) => {
    const item: Comida = {
      id: Math.random().toString(36).slice(2),
      nombre: nombre || `${proteinaG} g`,
      proteina_g: proteinaG,
      t: Date.now(),
    }
    const next: NutritionData = {
      ...data,
      proteina_g: (data.proteina_g || 0) + proteinaG,
      calorias_estimadas: (data.calorias_estimadas || 0) + caloriasExtra,
      comidas: [...data.comidas, item],
    }
    await saveData(next)
    toast(`+${proteinaG} g proteína`)
  }

  const removeMeal = async (id: string) => {
    const meal = data.comidas.find(m => m.id === id)
    if (!meal) return
    const next: NutritionData = {
      ...data,
      proteina_g: Math.max(0, data.proteina_g - meal.proteina_g),
      comidas: data.comidas.filter(m => m.id !== id),
    }
    await saveData(next)
  }

  const addWater = async (delta: number) => {
    const next: NutritionData = {
      ...data,
      agua_litros: Math.max(0, Math.round(((data.agua_litros || 0) + delta) * 10) / 10),
    }
    await saveData(next)
  }

  const submitCustom = async (e: FormEvent) => {
    e.preventDefault()
    const g = parseFloat(grams)
    if (!g || g <= 0) return
    await addMeal(g, name.trim() || `${g} g`)
    setName('')
    setGrams('')
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const pesoKg = profile?.peso_kg ?? 75
  const goalP = profile?.objetivo_proteina_g ?? Math.round(pesoKg * 1.8)
  const goalWater = Math.round((pesoKg * 33) / 100) / 10

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Nutrición</div>
      <div className="text-[26px] font-semibold tracking-tight">Proteína · {today.split('-').reverse().join('/')}</div>

      {/* Main protein card */}
      <Card className="mt-3">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[42px] font-semibold leading-none font-mono tracking-tight">{data.proteina_g || 0}<span className="text-[var(--muted)] text-lg font-normal">/{goalP} g</span></div>
            <div className="text-xs text-[var(--muted)] mt-1.5">{Math.max(0, goalP - (data.proteina_g||0))} g restantes</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-[var(--muted)]">Objetivo</div>
            <div className="text-sm font-mono">{pesoKg} kg × 1.8</div>
          </div>
        </div>
        <ProgressBar value={data.proteina_g || 0} max={goalP} color="var(--ink)"/>

        {/* Quick add */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={() => { void addMeal(25, 'Porción 25 g') }} className="press tap rounded-2xl bg-[var(--ink)] text-white py-3 font-semibold">+25 g</button>
          <button onClick={() => { void addMeal(15, 'Porción 15 g') }} className="press tap rounded-2xl bg-white border border-[var(--line-strong)] py-3 font-semibold">+15 g</button>
          <button onClick={() => { void addMeal(10, 'Porción 10 g') }} className="press tap rounded-2xl bg-white border border-[var(--line-strong)] py-3 font-semibold">+10 g</button>
        </div>

        {/* Custom add */}
        <form onSubmit={(e) => { void submitCustom(e) }} className="mt-3 flex gap-2 items-stretch">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Comida (opcional)"
            className="flex-1 h-11 px-3 rounded-xl bg-white border border-[var(--line)] text-[15px] outline-none focus:border-[var(--ink)]"
          />
          <input
            value={grams}
            onChange={e => setGrams(e.target.value)}
            inputMode="decimal" type="number"
            placeholder="g"
            className="w-20 h-11 px-3 rounded-xl bg-white border border-[var(--line)] text-[15px] text-center outline-none focus:border-[var(--ink)] font-mono"
          />
          <button type="submit" className="press w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center"><I.plus size={18}/></button>
        </form>
      </Card>

      {/* Today meals */}
      <SectionHeader kicker={`${data.comidas.length} registros`} title="Hoy"/>
      {data.comidas.length === 0 ? (
        <EmptyState icon={<I.meal size={18}/>} title="Sin comidas registradas" body="Toca uno de los botones para añadir tu primera porción."/>
      ) : (
        <Card className="!p-0">
          {data.comidas.slice().reverse().map((m, i) => (
            <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${i>0?'border-t hairline':''}`}>
              <div className="min-w-0">
                <div className="text-[15px] font-medium truncate">{m.nombre}</div>
                <div className="text-xs text-[var(--muted)] font-mono">{new Date(m.t).toTimeString().slice(0,5)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm">{m.proteina_g} g</div>
                <button onClick={() => { void removeMeal(m.id) }} className="press w-9 h-9 rounded-full hover:bg-[var(--bg)] flex items-center justify-center text-[var(--muted)]">
                  <I.x size={16}/>
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Water */}
      <SectionHeader kicker="Hidratación" title="Agua"/>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[28px] font-semibold leading-none font-mono">{data.agua_litros || 0}<span className="text-[var(--muted)] text-sm font-normal">/{goalWater} L</span></div>
            <div className="text-xs text-[var(--muted)] mt-1">≈ {Math.round(pesoKg * 33)} ml diarios</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { void addWater(-0.25) }} className="press w-10 h-10 rounded-xl bg-white border border-[var(--line)] flex items-center justify-center"><I.minus size={16}/></button>
            <button onClick={() => { void addWater(0.25) }} className="press w-10 h-10 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center"><I.plus size={16}/></button>
          </div>
        </div>
        <ProgressBar value={data.agua_litros || 0} max={goalWater} color="var(--ink)"/>
      </Card>

      {/* Food reference */}
      <SectionHeader kicker="Referencia" title="Proteína por alimento"/>
      <Card className="!p-0">
        {FOODS.map((f, i) => (
          <button key={i}
            onClick={() => { void addMeal(f.protein, f.name) }}
            className={`press w-full flex items-center justify-between px-4 py-3 text-left ${i>0?'border-t hairline':''}`}>
            <div className="text-[14px]">{f.name}</div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-sm text-[var(--ink-soft)]">{f.protein} g</div>
              <div className="w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--ink)]"><I.plus size={14}/></div>
            </div>
          </button>
        ))}
      </Card>

      {/* Tips */}
      <SectionHeader kicker="Hábitos" title="Tips de nutrición"/>
      <div className="grid grid-cols-1 gap-2">
        {NUTRITION_TIPS.map((t, i) => (
          <CardFlat key={i}>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--ink)] flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono">{String(i+1).padStart(2,'0')}</div>
              <div>
                <div className="text-[14px] font-semibold">{t.title}</div>
                <div className="text-[13px] text-[var(--muted)] leading-snug mt-0.5">{t.body}</div>
              </div>
            </div>
          </CardFlat>
        ))}
      </div>
    </div>
  )
}
