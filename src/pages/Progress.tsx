import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { getStorage } from "@/lib/storage"
import { todayKey, formatDate, getWeekStartKey } from "@/lib/utils"
import { Card, CardFlat, Button, Input, SectionHeader, Modal, I, useToast } from "@/components/ui"
import type { Profile, Measurement } from "@/types"

type TabId = 'weight' | 'strength' | 'body'
type FormTabId = 'measure' | 'strength'

interface Analysis {
  headline: string
  advice: string
}

function computeAnalysis(measurements: Measurement[]): Analysis | null {
  if (measurements.length < 2) return null
  const last = measurements[measurements.length - 1]
  const target = new Date(last.fecha)
  target.setDate(target.getDate() - 28)
  const targetKey = todayKey(target)
  let baseline = measurements.find(m => m.fecha >= targetKey) ?? measurements[0]
  if (baseline === last) baseline = measurements[0]
  const weightDelta = (last.peso_kg ?? 0) - (baseline.peso_kg ?? 0)
  const waistDelta = (last.cintura_cm ?? 0) - (baseline.cintura_cm ?? 0)
  const pullDelta = (last.dominadas_max ?? 0) - (baseline.dominadas_max ?? 0)
  const pushDelta = (last.flexiones_max ?? 0) - (baseline.flexiones_max ?? 0)
  const strengthDelta = pullDelta + pushDelta

  if (Math.abs(weightDelta) < 0.5 && waistDelta < 0 && strengthDelta > 0) {
    return { headline: 'Recomposición funcionando', advice: 'Peso estable, cintura baja y fuerza sube. Sigue igual.' }
  }
  if (weightDelta < -0.5 && strengthDelta < 0) {
    return { headline: 'Déficit demasiado agresivo', advice: 'Tu fuerza está cayendo. Sube 200 kcal y prioriza proteína.' }
  }
  if (weightDelta > 0.5 && waistDelta > 0) {
    return { headline: 'Estás en superávit', advice: 'Si te interesa definir, baja 200 kcal.' }
  }
  if (weightDelta > 0.3 && strengthDelta > 0 && waistDelta <= 0) {
    return { headline: 'Volumen limpio', advice: 'Subes peso y fuerza, cintura estable. Excelente.' }
  }
  return { headline: 'Datos en evolución', advice: 'Sigue midiendo. Tras 4 semanas podré darte una lectura mejor.' }
}

interface StatProps {
  label: string
  value: number | undefined
  unit: string
}

function Stat({ label, value, unit }: StatProps) {
  return (
    <CardFlat>
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">{label}</div>
      <div className="font-mono text-xl mt-1">{value != null ? value : '–'}<span className="text-[var(--muted)] text-xs"> {unit}</span></div>
    </CardFlat>
  )
}

interface ChartProps {
  data: Measurement[]
  tab: TabId
}

const tooltipStyle = {
  background: '#0c0c0c', border: '1px solid #0c0c0c', borderRadius: 12, color: '#fff', padding: '8px 10px', fontSize: 12,
}

function Chart({ data, tab }: ChartProps) {
  const rows = data.map(d => ({ ...d, label: formatDate(d.fecha) }))

  if (tab === 'weight') {
    return (
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#ececec" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={32} domain={['dataMin-1', 'dataMax+1']}/>
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#aaa' }} cursor={{ stroke: '#d4d4d4' }}/>
            <Line type="monotone" dataKey="peso_kg" name="Peso (kg)" stroke="#0c0c0c" strokeWidth={2.2} dot={{ r: 3, fill: '#0c0c0c' }} activeDot={{ r: 5 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }
  if (tab === 'strength') {
    return (
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#ececec" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={32}/>
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#aaa' }} cursor={{ stroke: '#d4d4d4' }}/>
            <Legend wrapperStyle={{ fontSize: 11, color: '#404040' }}/>
            <Line type="monotone" dataKey="dominadas_max" name="Dominadas" stroke="#0c0c0c" strokeWidth={2.2} dot={{ r: 3, fill: '#0c0c0c' }}/>
            <Line type="monotone" dataKey="flexiones_max" name="Flexiones" stroke="#16a34a" strokeWidth={2.2} dot={{ r: 3, fill: '#16a34a' }}/>
            <Line type="monotone" dataKey="plancha_seg" name="Plancha (s)" stroke="#d4ff3a" strokeWidth={2.2} dot={{ r: 3, fill: '#d4ff3a' }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#ececec" vertical={false}/>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={32}/>
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#aaa' }} cursor={{ stroke: '#d4d4d4' }}/>
          <Legend wrapperStyle={{ fontSize: 11 }}/>
          <Line type="monotone" dataKey="cintura_cm" name="Cintura" stroke="#0c0c0c" strokeWidth={2}/>
          <Line type="monotone" dataKey="brazo_cm" name="Brazo" stroke="#16a34a" strokeWidth={2}/>
          <Line type="monotone" dataKey="pecho_cm" name="Pecho" stroke="#d97706" strokeWidth={2}/>
          <Line type="monotone" dataKey="muslo_cm" name="Muslo" stroke="#2563eb" strokeWidth={2}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MeasureFormState {
  fecha: string
  peso_kg: string
  cintura_cm: string
  brazo_cm: string
  pecho_cm: string
  muslo_cm: string
  dominadas_max: string
  flexiones_max: string
  plancha_seg: string
}

type MeasureField = keyof Omit<MeasureFormState, 'fecha'>

interface MeasureFormProps {
  tab: FormTabId
  onSubmit: (entry: Measurement) => void
  lastEntry: Measurement | undefined
  onCancel: () => void
}

function MeasureForm({ tab, onSubmit, lastEntry, onCancel }: MeasureFormProps) {
  const [form, setForm] = useState<MeasureFormState>(() => ({
    fecha: todayKey(),
    peso_kg: String(lastEntry?.peso_kg ?? ''),
    cintura_cm: String(lastEntry?.cintura_cm ?? ''),
    brazo_cm: String(lastEntry?.brazo_cm ?? ''),
    pecho_cm: String(lastEntry?.pecho_cm ?? ''),
    muslo_cm: String(lastEntry?.muslo_cm ?? ''),
    dominadas_max: String(lastEntry?.dominadas_max ?? ''),
    flexiones_max: String(lastEntry?.flexiones_max ?? ''),
    plancha_seg: String(lastEntry?.plancha_seg ?? ''),
  }))

  const set = (k: keyof MeasureFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const entry: Measurement = { fecha: form.fecha }
    const measureFields: MeasureField[] = ['peso_kg', 'cintura_cm', 'brazo_cm', 'pecho_cm', 'muslo_cm']
    const strengthFields: MeasureField[] = ['dominadas_max', 'flexiones_max', 'plancha_seg']
    const fields = tab === 'measure' ? measureFields : strengthFields
    for (const f of fields) {
      const v = parseFloat(form[f])
      if (!isNaN(v)) entry[f] = v
    }
    // carry last known body measurements so charts don't gap
    if (tab === 'strength' && lastEntry) {
      for (const f of measureFields) {
        if (lastEntry[f] != null) entry[f] = lastEntry[f]
      }
    }
    onSubmit(entry)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Fecha" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}/>
      {tab === 'measure' ? (
        <div className="grid grid-cols-2 gap-2">
          <Input label="Peso" suffix="kg" inputMode="decimal" type="number" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)}/>
          <Input label="Cintura" suffix="cm" inputMode="decimal" type="number" value={form.cintura_cm} onChange={e => set('cintura_cm', e.target.value)}/>
          <Input label="Brazo" suffix="cm" inputMode="decimal" type="number" value={form.brazo_cm} onChange={e => set('brazo_cm', e.target.value)}/>
          <Input label="Pecho" suffix="cm" inputMode="decimal" type="number" value={form.pecho_cm} onChange={e => set('pecho_cm', e.target.value)}/>
          <Input label="Muslo" suffix="cm" inputMode="decimal" type="number" value={form.muslo_cm} onChange={e => set('muslo_cm', e.target.value)} containerClass="col-span-2"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <Input label="Dominadas máx" suffix="reps" inputMode="decimal" type="number" value={form.dominadas_max} onChange={e => set('dominadas_max', e.target.value)}/>
          <Input label="Flexiones máx" suffix="reps" inputMode="decimal" type="number" value={form.flexiones_max} onChange={e => set('flexiones_max', e.target.value)}/>
          <Input label="Plancha máx" suffix="seg" inputMode="decimal" type="number" value={form.plancha_seg} onChange={e => set('plancha_seg', e.target.value)}/>
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button variant="soft" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" className="flex-1" type="submit">Guardar</Button>
      </div>
    </form>
  )
}

interface PhotoCheckProps {
  profile: Profile
  onUpdate: (next: Profile) => Promise<void>
}

function PhotoCheck({ profile, onUpdate }: PhotoCheckProps) {
  const weekKey = getWeekStartKey()
  const photos = profile.photos ?? {}
  const taken = !!photos[weekKey]
  const toggle = () => {
    const next: Profile = { ...profile, photos: { ...photos, [weekKey]: !taken } }
    void onUpdate(next)
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-medium">Foto de esta semana</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">Misma luz, mismo ángulo, ayunas.</div>
        </div>
        <button onClick={toggle} className={`press check ${taken ? 'on' : ''}`} aria-label="foto tomada">
          {taken && <I.check size={14}/>}
        </button>
      </div>
    </Card>
  )
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'weight', label: 'Peso' },
  { id: 'strength', label: 'Fuerza' },
  { id: 'body', label: 'Medidas' },
]

export default function Progress() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<TabId>('weight')
  const [showForm, setShowForm] = useState(false)
  const [formTab, setFormTab] = useState<FormTabId>('measure')

  useEffect(() => {
    async function load() {
      try {
        const storage = getStorage()
        const prof = await storage.getProfile()
        if (prof) setProfile(prof)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateProfile = async (next: Profile) => {
    const storage = getStorage()
    await storage.setProfile(next)
    setProfile(next)
  }

  const submit = async (entry: Measurement) => {
    if (!profile) return
    const measurements = profile.measurements ?? []
    const next: Profile = {
      ...profile,
      measurements: [...measurements, entry].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }
    await updateProfile(next)
    setShowForm(false)
    toast('Medición guardada')
  }

  const removeLast = async () => {
    if (!profile) return
    const measurements = profile.measurements ?? []
    const next: Profile = { ...profile, measurements: measurements.slice(0, -1) }
    await updateProfile(next)
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const measurements = profile?.measurements ?? []
  const last = measurements[measurements.length - 1]
  const analysis = computeAnalysis(measurements)

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Progreso</div>
          <div className="text-[26px] font-semibold tracking-tight">{measurements.length} registros</div>
        </div>
        <Button size="md" variant="accent" icon={<I.plus size={16}/>} onClick={() => { setFormTab('measure'); setShowForm(true) }}>Añadir</Button>
      </div>

      {/* Analysis */}
      {analysis && (
        <Card className="mt-3 !p-4 bg-[var(--ink)] !border-[var(--ink)] text-white">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--ink)] flex items-center justify-center flex-shrink-0">
              <I.target size={18}/>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 font-medium">Análisis · últimas 4 semanas</div>
              <div className="text-[15px] font-semibold leading-snug mt-0.5">{analysis.headline}</div>
              <div className="text-xs text-white/60 mt-1">{analysis.advice}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 p-1 bg-white rounded-full border border-[var(--line)] text-sm">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`press flex-1 h-10 rounded-full font-medium ${tab === t.id ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card className="mt-3 !p-3">
        {measurements.length < 2 ? (
          <div className="py-10 text-center">
            <div className="text-sm text-[var(--muted)]">Necesitas al menos 2 mediciones para ver gráficos.</div>
            <Button className="mt-3" variant="soft" onClick={() => { setFormTab('measure'); setShowForm(true) }} icon={<I.plus size={14}/>}>Añadir medición</Button>
          </div>
        ) : (
          <Chart data={measurements} tab={tab}/>
        )}
      </Card>

      {/* Last summary */}
      {last && (
        <>
          <SectionHeader kicker="Último registro" title={formatDate(last.fecha)} right={
            <button onClick={() => { void removeLast() }} className="press text-xs text-[var(--bad)] flex items-center gap-1"><I.trash size={12}/> Borrar</button>
          }/>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Peso" value={last.peso_kg} unit="kg"/>
            <Stat label="Cintura" value={last.cintura_cm} unit="cm"/>
            <Stat label="Brazo" value={last.brazo_cm} unit="cm"/>
            <Stat label="Pecho" value={last.pecho_cm} unit="cm"/>
            <Stat label="Muslo" value={last.muslo_cm} unit="cm"/>
            <Stat label="Dominadas" value={last.dominadas_max} unit="reps"/>
            <Stat label="Flexiones" value={last.flexiones_max} unit="reps"/>
            <Stat label="Plancha" value={last.plancha_seg} unit="seg"/>
          </div>
        </>
      )}

      {/* Strength tests */}
      <SectionHeader kicker="Cada 4 semanas" title="Tests de fuerza"/>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold">Test máximo</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Dominadas, flexiones y plancha al fallo.</div>
          </div>
          <Button variant="soft" size="sm" onClick={() => { setFormTab('strength'); setShowForm(true) }} icon={<I.award size={14}/>}>Registrar</Button>
        </div>
      </Card>

      <SectionHeader kicker="Foto semanal" title="Checklist"/>
      {profile && <PhotoCheck profile={profile} onUpdate={updateProfile}/>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={formTab === 'measure' ? 'Nueva medición' : 'Test de fuerza'}>
        <MeasureForm
          tab={formTab}
          onSubmit={(entry) => { void submit(entry) }}
          lastEntry={last}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
