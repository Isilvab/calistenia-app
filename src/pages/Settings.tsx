import { useState, useEffect, useMemo } from "react"
import { getStorage } from "@/lib/storage"
import { todayKey } from "@/lib/utils"
import { Card, Button, Input, SectionHeader, ProgressBar, Modal, I, useToast } from "@/components/ui"
import type { Profile, RoutineState } from "@/types"

interface FormState {
  nombre: string
  peso_kg: string
  altura_cm: string
  edad: string
  sexo: Profile['sexo']
  objetivo: Profile['objetivo']
  fecha_inicio: string
}

interface Macros {
  protein: number
  fat: number
  carbs: number
  kcal: number
}

function calcMacros(form: FormState): Macros {
  const peso = parseFloat(form.peso_kg)
  if (!peso || peso <= 0) return { protein: 0, fat: 0, carbs: 0, kcal: 0 }
  const protein = Math.round(peso * 1.8)
  const fat = Math.round(peso * 0.9)
  let kcal = Math.round(peso * 32)
  if (form.objetivo === 'definicion') kcal -= 300
  if (form.objetivo === 'volumen') kcal += 200
  const kcalNoCarb = (protein * 4) + (fat * 9)
  const carbs = Math.max(0, Math.round((kcal - kcalNoCarb) / 4))
  return { protein, fat, carbs, kcal }
}

interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="press w-10 h-10 rounded-xl bg-white border border-[var(--line)] flex items-center justify-center"><I.minus size={14}/></button>
      <div className="flex-1 h-10 rounded-xl bg-white border border-[var(--line)] flex items-center justify-center font-mono font-semibold">{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="press w-10 h-10 rounded-xl bg-white border border-[var(--line)] flex items-center justify-center"><I.plus size={14}/></button>
    </div>
  )
}

// TODO: reemplazar por implementación real de exercisedb en prompt futuro
function DemosSection() {
  return (
    <>
      <SectionHeader kicker="ExerciseDB" title="Demos en vídeo"/>
      <Card className="!p-0 overflow-hidden">
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Catálogo</div>
              <div className="font-mono text-xl mt-1">0<span className="text-[var(--muted)] text-xs font-normal"> ejercicios</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Vinculados</div>
              <div className="font-mono text-xl mt-1">0<span className="text-[var(--muted)] text-xs font-normal">/0</span></div>
            </div>
          </div>
          <div className="mt-3"><ProgressBar value={0} max={1} color="var(--accent-2)"/></div>
          <div className="text-[11px] text-[var(--muted)] mt-2">
            Sin catálogo. Integración con ExerciseDB próximamente.
          </div>
        </div>
        <div className="border-t hairline p-3">
          <Button size="lg" variant="primary" icon={<I.refresh size={16}/>} disabled>
            Cargar catálogo desde API
          </Button>
        </div>
      </Card>
    </>
  )
}

const SEXOS: Array<Profile['sexo']> = ['hombre', 'mujer']
const OBJETIVOS: Array<{ id: Profile['objetivo']; label: string; sub: string }> = [
  { id: 'definicion', label: 'Definición', sub: '−300 kcal' },
  { id: 'recomposicion', label: 'Recomp', sub: 'Mantenimiento' },
  { id: 'volumen', label: 'Volumen', sub: '+200 kcal' },
]

export default function Settings() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [routine, setRoutine] = useState<RoutineState>({ bloque_actual: 1, semana_actual: 1, dia_actual: 1 })
  const [confirmReset, setConfirmReset] = useState(false)

  const [form, setForm] = useState<FormState>({
    nombre: '',
    peso_kg: '',
    altura_cm: '',
    edad: '',
    sexo: 'hombre',
    objetivo: 'recomposicion',
    fecha_inicio: todayKey(),
  })

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const [prof, rout] = await Promise.all([
          storage.getProfile(),
          storage.getRoutineState(),
        ])
        if (prof) {
          setProfile(prof)
          setForm({
            nombre: prof.nombre ?? '',
            peso_kg: String(prof.peso_kg ?? ''),
            altura_cm: String(prof.altura_cm ?? ''),
            edad: String(prof.edad ?? ''),
            sexo: prof.sexo ?? 'hombre',
            objetivo: prof.objetivo ?? 'recomposicion',
            fecha_inicio: prof.fecha_inicio ?? todayKey(),
          })
        }
        if (rout) setRoutine(rout)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const macros = useMemo(() => calcMacros(form), [form])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }))
  }

  const save = async () => {
    const storage = getStorage()
    const next: Profile = {
      ...(profile ?? {
        peso_kg: 75,
        altura_cm: 175,
        edad: 30,
        sexo: 'hombre',
        objetivo: 'recomposicion',
      }),
      nombre: form.nombre || undefined,

      peso_kg: parseFloat(form.peso_kg) || (profile?.peso_kg ?? 75),
      altura_cm: parseFloat(form.altura_cm) || (profile?.altura_cm ?? 175),
      edad: parseInt(form.edad, 10) || (profile?.edad ?? 30),
      sexo: form.sexo,
      objetivo: form.objetivo,
      fecha_inicio: form.fecha_inicio,
      objetivo_proteina_g: macros.protein,
      objetivo_calorias: macros.kcal,
      objetivo_grasas_g: macros.fat,
      objetivo_carbos_g: macros.carbs,
    }
    await storage.setProfile(next)
    setProfile(next)
    toast('Perfil guardado')
  }

  const updateRoutine = async (next: RoutineState) => {
    const storage = getStorage()
    await storage.setRoutineState(next)
    setRoutine(next)
  }

  const handleReset = async () => {
    const storage = getStorage()
    await storage.clearAll()
    setConfirmReset(false)
    toast('Datos borrados')
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Tu perfil</div>
      <div className="text-[26px] font-semibold tracking-tight">Ajustes</div>

      {/* Profile */}
      <SectionHeader kicker="Datos personales" title="Identidad"/>
      <Card className="flex flex-col gap-3">
        <Input label="Nombre" placeholder="Cómo te llamas" value={form.nombre} onChange={e => set('nombre', e.target.value)}/>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Peso" suffix="kg" type="number" inputMode="decimal" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)}/>
          <Input label="Altura" suffix="cm" type="number" inputMode="decimal" value={form.altura_cm} onChange={e => set('altura_cm', e.target.value)}/>
          <Input label="Edad" suffix="años" type="number" inputMode="decimal" value={form.edad} onChange={e => set('edad', e.target.value)}/>
          <div>
            <div className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide">Sexo</div>
            <div className="flex gap-1.5">
              {SEXOS.map(s => (
                <button key={s} onClick={() => set('sexo', s)}
                  className={`press flex-1 h-12 rounded-xl text-sm border ${form.sexo === s ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[var(--ink)] border-[var(--line)]'}`}>
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Input label="Fecha inicio del programa" type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}/>
      </Card>

      {/* Goal */}
      <SectionHeader kicker="Objetivo" title="¿Qué buscas?"/>
      <div className="grid grid-cols-3 gap-2">
        {OBJETIVOS.map(g => (
          <button key={g.id} onClick={() => set('objetivo', g.id)}
            className={`press tap rounded-2xl p-3 border text-left ${form.objetivo === g.id ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[var(--ink)] border-[var(--line)]'}`}>
            <div className="text-[13px] font-semibold leading-tight">{g.label}</div>
            <div className={`text-[11px] mt-0.5 ${form.objetivo === g.id ? 'text-white/60' : 'text-[var(--muted)]'}`}>{g.sub}</div>
          </button>
        ))}
      </div>

      {/* Macros */}
      <SectionHeader kicker="Calculadora" title="Tus macros"/>
      <Card className="!p-0 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Proteína</div>
            <div className="font-mono text-2xl mt-1">{macros.protein}<span className="text-[var(--muted)] text-sm font-normal"> g</span></div>
            <div className="text-[11px] text-[var(--muted)] mt-1">1.8 g/kg</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Calorías</div>
            <div className="font-mono text-2xl mt-1">{macros.kcal}<span className="text-[var(--muted)] text-sm font-normal"> kcal</span></div>
            <div className="text-[11px] text-[var(--muted)] mt-1">peso × 32 ajustado</div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] border-t hairline">
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Grasas</div>
            <div className="font-mono text-2xl mt-1">{macros.fat}<span className="text-[var(--muted)] text-sm font-normal"> g</span></div>
            <div className="text-[11px] text-[var(--muted)] mt-1">0.9 g/kg</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Carbohidratos</div>
            <div className="font-mono text-2xl mt-1">{macros.carbs}<span className="text-[var(--muted)] text-sm font-normal"> g</span></div>
            <div className="text-[11px] text-[var(--muted)] mt-1">resto de kcal</div>
          </div>
        </div>
      </Card>

      <Button size="block" variant="primary" className="mt-4" icon={<I.check size={18}/>} onClick={() => { void save() }}>Guardar perfil</Button>

      {/* Program control */}
      <SectionHeader kicker="Programa" title="Ubicación actual"/>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Bloque {routine.bloque_actual} · Semana {routine.semana_actual} · Día {routine.dia_actual}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Avanza o retrocede manualmente si lo necesitas.</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">Bloque</div>
            <Stepper value={routine.bloque_actual} min={1} max={3} onChange={v => { void updateRoutine({ ...routine, bloque_actual: v }) }}/>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">Semana</div>
            <Stepper value={routine.semana_actual} min={1} max={12} onChange={v => { void updateRoutine({ ...routine, semana_actual: v }) }}/>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">Día</div>
            <Stepper value={routine.dia_actual} min={1} max={7} onChange={v => { void updateRoutine({ ...routine, dia_actual: v }) }}/>
          </div>
        </div>
      </Card>

      {/* Demos */}
      <DemosSection/>

      {/* Reset */}
      <SectionHeader kicker="Zona delicada" title="Borrar datos"/>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">Reset completo</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Borra todas tus sesiones, mediciones y nutrición.</div>
          </div>
          <Button variant="danger" size="sm" icon={<I.trash size={14}/>} onClick={() => setConfirmReset(true)}>Borrar</Button>
        </div>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="¿Borrar todo?">
        <div className="text-sm text-[var(--ink-soft)] mb-4">Esta acción no se puede deshacer. Se eliminarán todas tus sesiones, mediciones, registros de nutrición y movilidad.</div>
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setConfirmReset(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" onClick={() => { void handleReset() }}>Sí, borrar todo</Button>
        </div>
      </Modal>

      <div className="mt-6 text-center text-xs text-[var(--muted)]">
        Calisteniapp · v1.0 · diseñada para ti
      </div>
    </div>
  )
}
