import { useState, useRef, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { searchExercisesCached, getImageUrlCached } from "@/lib/exercisedb/client"
import { getCachedImage } from "@/lib/exercisedb/cache"
import { useRutinaDraftStore } from "@/store/rutinaDraftStore"
import type { Exercise } from "@/lib/exercisedb/types"
import { Card, Button, I } from "@/components/ui"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// ExerciseCard — GIF cargado solo cuando el usuario lo pide (control de cuota).
// Si el GIF ya está en caché (localStorage), se muestra de inmediato sin botón.
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  exercise: Exercise
  apiKey: string
  modoSeleccion?: boolean
  onAgregar?: () => void
}

function ExerciseCard({ exercise, apiKey, modoSeleccion, onAgregar }: ExerciseCardProps) {
  const [agregado, setAgregado] = useState(false)
  // Chequeo sincrónico de caché — sin red, sin cuota
  const cachedUrl = getCachedImage(exercise.id)

  const [gifStatus, setGifStatus] = useState<'idle' | 'cargando' | 'cargado' | 'error'>(
    cachedUrl ? 'cargado' : 'idle'
  )
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl)

  const loadGif = useCallback(async () => {
    setGifStatus('cargando')
    const result = await getImageUrlCached(exercise.id, apiKey)
    if (result.ok && result.imageUrl) {
      setImageUrl(result.imageUrl)
      setGifStatus('cargado')
    } else {
      setGifStatus('error')
    }
  }, [exercise.id, apiKey])

  return (
    <Card className="flex flex-col gap-3">
      {/* Nombre */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] font-semibold leading-tight">{capitalize(exercise.name)}</div>
        {/* Botón agregar — activo en modo selección, oculto en uso normal */}
        {modoSeleccion && (
          agregado ? (
            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-green-300 bg-green-50 text-green-600">
              <I.check size={11}/>
              Agregado
            </span>
          ) : (
            <button
              onClick={() => { onAgregar?.(); setAgregado(true) }}
              className="press flex-shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
            >
              <I.plus size={11}/>
              Agregar
            </button>
          )
        )}
      </div>

      {/* Chips de metadata */}
      <div className="flex flex-wrap gap-1.5">
        {exercise.bodyPart && (
          <span className="chip text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)]">
            {exercise.bodyPart}
          </span>
        )}
        {exercise.equipment && (
          <span className="chip text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)]">
            {exercise.equipment}
          </span>
        )}
        {exercise.target && (
          <span className="chip text-[11px] px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)]">
            {exercise.target}
          </span>
        )}
      </div>

      {/* ID copiable */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-[var(--muted)] truncate">{exercise.id}</span>
        <button
          onClick={() => void navigator.clipboard.writeText(exercise.id)}
          className="press flex-shrink-0 text-[11px] px-2 py-0.5 rounded-lg border border-[var(--line)] text-[var(--muted)]"
        >
          Copiar id
        </button>
      </div>

      {/* GIF on-demand */}
      {gifStatus === 'idle' && (
        <button
          onClick={() => { void loadGif() }}
          className="press self-start flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl border border-[var(--line)] text-[var(--on-light)] bg-white"
        >
          <I.play size={12}/>
          Ver GIF
        </button>
      )}

      {gifStatus === 'cargando' && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <I.refresh size={14} className="animate-spin"/>
          Cargando…
        </div>
      )}

      {gifStatus === 'cargado' && imageUrl && (
        <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)]">
          <img
            src={imageUrl}
            alt={exercise.name}
            className="w-full max-w-xs block"
          />
        </div>
      )}

      {gifStatus === 'error' && (
        <div className="text-[11px] text-[var(--muted)]">GIF no disponible para este ejercicio.</div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ExerciseSearch page
// ---------------------------------------------------------------------------

type SearchStatus = 'idle' | 'buscando' | 'resultados' | 'vacio' | 'error'

export default function ExerciseSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modoSeleccion = searchParams.get('modo') === 'seleccion'
  const retorno = searchParams.get('retorno') ?? '/rutinas/nueva'
  const addEjercicio = useRutinaDraftStore(s => s.addEjercicio)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [results, setResults] = useState<Exercise[]>([])
  const [fromCache, setFromCache] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const apiKeyLoadedRef = useRef(false)

  // Cargar API key una vez — lazy al montar
  const ensureApiKey = useCallback(async (): Promise<string> => {
    if (apiKeyLoadedRef.current && apiKey !== null) return apiKey
    const s = await getStorage().getSettings()
    const key = s.apiKeys?.exercisedb ?? ''
    setApiKey(key)
    apiKeyLoadedRef.current = true
    return key
  }, [apiKey])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return

    setStatus('buscando')
    setResults([])
    setErrorMsg(null)
    setFromCache(false)

    const key = await ensureApiKey()

    if (!key) {
      setStatus('error')
      setErrorMsg('Falta la API key. Configurala en Ajustes.')
      return
    }

    const res = await searchExercisesCached(trimmed, key)

    if (!res.ok) {
      setStatus('error')
      setErrorMsg(res.error ?? 'Error desconocido.')
      return
    }

    if (res.results.length === 0) {
      setStatus('vacio')
      return
    }

    setResults(res.results)
    setFromCache(res.fromCache)
    setStatus('resultados')
  }, [ensureApiKey])

  const handleSearch = () => { void runSearch(query) }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="pb-28 anim-in">
      {/* Banner modo selección */}
      {modoSeleccion && (
        <div className="sticky top-0 z-20 bg-[var(--ink)] text-white px-4 py-3 flex items-center justify-between">
          <span className="text-[13px] font-medium">Agregando a tu rutina</span>
          <button
            onClick={() => navigate(retorno)}
            className="press text-[12px] underline underline-offset-2 text-white/80"
          >
            Volver a la rutina →
          </button>
        </div>
      )}

      <div className="px-4 pt-4">
      {/* Header */}
      {!modoSeleccion && (
        <button
          onClick={() => navigate(-1)}
          className="press flex items-center gap-1 text-[var(--muted)] text-[13px] mb-3"
        >
          <I.chevL size={16}/>
          Volver
        </button>
      )}
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">ExerciseDB</div>
      <div className="text-[26px] font-semibold tracking-tight mb-4">Buscar ejercicios</div>

      {/* Buscador */}
      <div className="flex gap-2 mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ej. pull up, squat…"
          disabled={status === 'buscando'}
          className="flex-1 h-12 px-4 rounded-xl border border-[var(--line)] bg-white text-[var(--ink)] text-[14px] outline-none focus:border-[var(--ink)] transition-colors disabled:opacity-50"
        />
        <Button
          variant="primary"
          onClick={handleSearch}
          disabled={status === 'buscando' || !query.trim()}
          icon={<I.bolt size={16}/>}
        >
          {status === 'buscando' ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>

      {/* Estado: error */}
      {status === 'error' && errorMsg && (
        <Card className="flex flex-col gap-2">
          <div className="text-sm text-red-500 font-medium">{errorMsg}</div>
          {errorMsg.includes('Ajustes') && (
            <button
              onClick={() => navigate('/ajustes')}
              className="press self-start text-[12px] text-[var(--ink)] underline underline-offset-2"
            >
              Ir a Ajustes →
            </button>
          )}
        </Card>
      )}

      {/* Estado: vacío */}
      {status === 'vacio' && (
        <div className="text-[var(--muted)] text-sm text-center py-8">
          Sin resultados para "{query}". Probá con otro nombre.
        </div>
      )}

      {/* Resultados */}
      {status === 'resultados' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] text-[var(--muted)]">
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </div>
            {fromCache && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600 font-medium">
                desde caché · sin cuota
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {results.map(ex => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                apiKey={apiKey ?? ''}
                modoSeleccion={modoSeleccion}
                onAgregar={() => addEjercicio({ nombre: ex.name, exercisedb_id: ex.id })}
              />
            ))}
          </div>
        </>
      )}

      {/* Estado: idle */}
      {status === 'idle' && (
        <div className="text-center py-12 text-[var(--muted)] text-sm">
          Escribí el nombre de un ejercicio y presioná Buscar.
        </div>
      )}
      </div>{/* /px-4 pt-4 */}
    </div>
  )
}
