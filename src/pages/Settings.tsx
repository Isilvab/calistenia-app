import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getStorage } from "@/lib/storage"
import { searchExerciseByName } from "@/lib/exercisedb/client"
import type { PingResult } from "@/lib/exercisedb/types"
import { todayKey } from "@/lib/utils"
import { applyTheme, getStoredTheme } from "@/lib/theme"
import type { ThemeName } from "@/lib/theme"
import { Card, Button, Input, SectionHeader, Modal, I, useToast, Spinner } from "@/components/ui"
import type { Profile } from "@/types"
import { GIFS_AUTHORIZED_EMAILS } from "@/data/authorized"
// PLAN FIJO DESACTIVADO — reactivable
// import type { RoutineState } from "@/types"

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
      <button onClick={() => onChange(Math.max(min, value - 1))} className="press w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center"><I.minus size={14}/></button>
      <div className="flex-1 h-10 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center font-mono font-semibold">{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="press w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center"><I.plus size={14}/></button>
    </div>
  )
}

function ExerciseDBSection() {
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pingState, setPingState] = useState<'idle' | 'probando' | 'resultado' | 'error'>('idle')
  const [pingResult, setPingResult] = useState<PingResult | null>(null)

  useEffect(() => {
    getStorage().getSettings().then((s) => {
      setApiKey(s.apiKeys?.exercisedb ?? '')
    })
  }, [])

  const saveKey = async () => {
    setSaving(true)
    try {
      const storage = getStorage()
      const s = await storage.getSettings()
      await storage.setSettings({ ...s, apiKeys: { ...(s.apiKeys ?? {}), exercisedb: apiKey.trim() } })
      toast('API key guardada')
    } finally {
      setSaving(false)
    }
  }

  const probe = async () => {
    setPingState('probando')
    setPingResult(null)
    const result = await searchExerciseByName('push up', apiKey.trim())
    setPingResult(result)
    setPingState(result.ok ? 'resultado' : 'error')
  }

  return (
    <>
      <SectionHeader kicker="ExerciseDB" title="GIFs de ejercicios"/>
      <Card className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide block">
            API Key (RapidAPI)
          </label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pega tu key de RapidAPI"
              className="flex-1 h-12 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] font-mono outline-none focus:border-[var(--ink)] transition-colors"
            />
            <button
              className="press flex-shrink-0 h-12 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--muted)]"
              onClick={() => setShowKey(v => !v)}
            >
              {showKey ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>

        <Button size="block" variant="primary" icon={<I.check size={16}/>}
          onClick={() => { void saveKey() }} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar key'}
        </Button>

        <div className="border-t border-[var(--line)] pt-3">
          <Button size="block" variant="soft" icon={<I.bolt size={16}/>}
            onClick={() => { void probe() }} disabled={pingState === 'probando'}>
            {pingState === 'probando' ? 'Probando…' : 'Probar conexión (push up)'}
          </Button>
        </div>

        {pingResult && (
          <div>
            <div className={`text-xs font-medium mb-2 ${pingResult.ok ? 'text-green-600' : 'text-red-500'}`}>
              {pingResult.ok ? `✓ OK · status ${pingResult.status}` : `✗ Error · status ${pingResult.status}`}
              {pingResult.error ? ` — ${pingResult.error}` : ''}
            </div>
            <pre className="text-[11px] bg-[var(--bg)] rounded-xl p-3 overflow-auto max-h-64 border border-[var(--line)] text-[var(--ink)] whitespace-pre-wrap break-all">
              {JSON.stringify(pingResult.raw, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </>
  )
}

function BackupSection() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmImport, setConfirmImport] = useState(false)
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null)

  const handleExport = async () => {
    try {
      const storage = getStorage()
      const raw = JSON.parse(await storage.exportAll()) as Record<string, unknown>
      // Strip apiKeys — must not leave the device
      if (raw['settings'] && typeof raw['settings'] === 'object') {
        const s = { ...(raw['settings'] as Record<string, unknown>) }
        delete s['apiKeys']
        raw['settings'] = s
      }
      const backup = { version: 1, exported_at: new Date().toISOString(), data: raw }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `calisteniapp-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast('Backup exportado')
    } catch (e) {
      toast('Error al exportar: ' + String(e))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as unknown
        if (
          typeof parsed !== 'object' || parsed === null ||
          !('version' in parsed) || !('data' in parsed) ||
          typeof (parsed as Record<string, unknown>)['data'] !== 'object'
        ) {
          setImportError('Archivo inválido: falta "version" o "data"')
          return
        }
        setPendingData((parsed as { version: number; data: Record<string, unknown> }).data)
        setConfirmImport(true)
      } catch {
        setImportError('No se pudo parsear el archivo JSON')
      }
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    if (!pendingData) return
    setImporting(true)
    setConfirmImport(false)
    try {
      const data = { ...pendingData }
      // Never import apiKeys
      if (data['settings'] && typeof data['settings'] === 'object') {
        const s = { ...(data['settings'] as Record<string, unknown>) }
        delete s['apiKeys']
        data['settings'] = s
      }
      await getStorage().importAll(JSON.stringify(data))
      toast('Datos importados correctamente')
      window.location.reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.startsWith('PARTIAL_IMPORT:')) {
        // Algunos datos se escribieron, otros fallaron — dejar que el usuario vea qué falló
        setImportError(msg.slice('PARTIAL_IMPORT:'.length).trim())
      } else {
        // Error de validación u otro — no se borró nada
        setImportError(msg)
      }
      setImporting(false)
      setPendingData(null)
    }
  }

  return (
    <>
      <SectionHeader kicker="Datos" title="Backup"/>
      <Card className="flex flex-col gap-3">
        <div>
          <div className="text-[13px] font-medium">Exportar datos</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            Descarga sesiones, rutinas, perfil y nutrición como JSON. No incluye la API key.
          </div>
        </div>
        <Button size="block" variant="soft" icon={<I.arrowDown size={16}/>}
          onClick={() => { void handleExport() }}>
          Exportar datos (JSON)
        </Button>

        <div className="border-t border-[var(--line)] pt-3 flex flex-col gap-2">
          <div>
            <div className="text-[13px] font-medium">Importar datos</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              Carga un backup previo. Pisa todos los datos actuales.
            </div>
          </div>
          <Button size="block" variant="soft" icon={<I.arrowUp size={16}/>}
            onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importando…' : 'Importar datos (JSON)'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          {importError && (
            <div className="text-xs text-red-500">{importError}</div>
          )}
        </div>
      </Card>

      <Modal open={confirmImport}
        onClose={() => { setConfirmImport(false); setPendingData(null) }}
        title="¿Importar backup?">
        <div className="text-sm text-[var(--ink-soft)] mb-4">
          Esto reemplazará <strong>todos los datos actuales</strong> con los del archivo.
          La acción no se puede deshacer.
        </div>
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1"
            onClick={() => { setConfirmImport(false); setPendingData(null) }}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1"
            onClick={() => { void doImport() }}>
            Sí, importar
          </Button>
        </div>
      </Modal>
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
  const { signOut, user } = useAuth()

  const userEmail = user?.email?.trim().toLowerCase() ?? ''
  const canSeeGifs = GIFS_AUTHORIZED_EMAILS.map(e => e.trim().toLowerCase()).includes(userEmail)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // PLAN FIJO DESACTIVADO — reactivable
  // const [routine, setRoutine] = useState<RoutineState>({ bloque_actual: 1, semana_actual: 1, dia_actual: 1 })
  const [confirmReset, setConfirmReset] = useState(false)
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme)

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
        const [prof] = await Promise.all([
          storage.getProfile(),
          // PLAN FIJO DESACTIVADO — reactivable
          // storage.getRoutineState(),
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
        // PLAN FIJO DESACTIVADO — reactivable
        // if (rout) setRoutine(rout)
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

  const handleTheme = async (t: ThemeName) => {
    setTheme(t)
    applyTheme(t)
    const storage = getStorage()
    const s = await storage.getSettings()
    await storage.setSettings({ ...s, tema: t })
  }

  // PLAN FIJO DESACTIVADO — reactivable
  // const updateRoutine = async (next: RoutineState) => {
  //   const storage = getStorage()
  //   await storage.setRoutineState(next)
  //   setRoutine(next)
  // }

  const handleReset = async () => {
    const storage = getStorage()
    await storage.clearAll()
    setConfirmReset(false)
    toast('Datos borrados')
  }

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size={36}/></div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Tu perfil</div>
      <div className="text-[26px] font-semibold tracking-tight">Ajustes</div>

      {/* Appearance */}
      <SectionHeader kicker="Apariencia" title="Tema"/>
      <div className="grid grid-cols-3 gap-2">
        {([['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Sistema']] as [ThemeName, string][]).map(([id, label]) => (
          <button key={id} onClick={() => { void handleTheme(id) }}
            className={`press tap rounded-2xl p-3 border text-left ${theme === id ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'}`}>
            <div className="text-[13px] font-semibold leading-tight">{label}</div>
          </button>
        ))}
      </div>

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
                  className={`press flex-1 h-12 rounded-xl text-sm border ${form.sexo === s ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'}`}>
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
            className={`press tap rounded-2xl p-3 border text-left ${form.objetivo === g.id ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'}`}>
            <div className="text-[13px] font-semibold leading-tight">{g.label}</div>
            <div className={`text-[11px] mt-0.5 ${form.objetivo === g.id ? 'opacity-60' : 'text-[var(--muted)]'}`}>{g.sub}</div>
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

      {/* PLAN FIJO DESACTIVADO — reactivable
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
      */}

      {/* ExerciseDB — solo usuarios autorizados */}
      {canSeeGifs && <ExerciseDBSection/>}

      {/* Backup */}
      <BackupSection/>

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

      {/* Session */}
      <div className="mt-6 mb-2">
        <Button size="block" variant="soft" icon={<I.logOut size={16}/>} onClick={() => { void signOut() }}>
          Cerrar sesión
        </Button>
      </div>

      <div className="mt-4 text-center text-xs text-[var(--muted)]">
        Calisteniapp · v1.0 · diseñada para ti
      </div>
    </div>
  )
}
