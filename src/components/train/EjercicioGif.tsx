import { useState, useEffect } from "react"
import { getImageUrlCached } from "@/lib/exercisedb/client"
import { getCachedImage } from "@/lib/exercisedb/cache"
import { I } from "@/components/ui"

type GifStatus = 'idle' | 'cargando' | 'cargado' | 'error'

interface EjercicioGifProps {
  exercisedbId: string
  apiKey: string
  /** Si true, empieza a cargar al montar sin click adicional del usuario. */
  autoLoad?: boolean
}

export function EjercicioGif({ exercisedbId, apiKey, autoLoad = false }: EjercicioGifProps) {
  // Solo data: URLs son válidas sin headers — URLs https del CDN no pueden renderizarse
  // en <img> sin autenticación → tratarlas como cache inválido.
  const cachedUrl = getCachedImage(exercisedbId)
  const validCached = cachedUrl?.startsWith('data:') ? cachedUrl : null

  const [status, setStatus] = useState<GifStatus>(validCached ? 'cargado' : 'idle')
  const [imageUrl, setImageUrl] = useState<string | null>(validCached)

  const load = async () => {
    // Si apiKey aún no cargó, esperar — no marcar error definitivo
    if (!apiKey) return
    setStatus('cargando')
    const result = await getImageUrlCached(exercisedbId, apiKey)
    if (result.ok && result.imageUrl) {
      setImageUrl(result.imageUrl)
      setStatus('cargado')
    } else {
      setStatus('error')
    }
  }

  // Incluir apiKey en deps: cuando pase de '' a valor real, el effect re-ejecuta y carga.
  // Condición doble: status idle + apiKey presente — evita disparar con key vacía.
  useEffect(() => {
    if (autoLoad && status === 'idle' && apiKey) { void load() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, exercisedbId, apiKey])

  if (status === 'idle') return (
    <button
      onClick={() => { void load() }}
      className="press flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-[var(--line)] text-[var(--muted)] bg-[var(--surface)] self-start"
    >
      <I.play size={10}/> Ver GIF
    </button>
  )
  if (status === 'cargando') return (
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <I.refresh size={12} className="animate-spin"/> Cargando…
    </div>
  )
  if (status === 'cargado' && imageUrl) return (
    <div className="w-full rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] aspect-[4/3] flex items-center justify-center">
      <img src={imageUrl} alt="ejercicio" className="w-full h-full object-contain block"/>
    </div>
  )
  return null
}
