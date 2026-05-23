import type { PingResult, Exercise } from './types'
import { getCachedSearch, setCachedSearch, getCachedImage, setCachedImage } from './cache'

export interface SearchResult {
  ok: boolean
  fromCache: boolean
  results: Exercise[]
  error?: string
}

export interface CachedImageResult {
  ok: boolean
  fromCache: boolean
  imageUrl?: string
  error?: string
}

export interface ImageResult {
  ok: boolean
  status: number
  imageUrl?: string
  raw?: unknown
  error?: string
}

const BASE = 'https://exercisedb.p.rapidapi.com'
const API_HOST = 'exercisedb.p.rapidapi.com'

/**
 * Busca ejercicios por nombre en ExerciseDB vía RapidAPI.
 * NO se llama automáticamente — solo por acción explícita del usuario.
 * Plan free devuelve máximo 10 resultados por llamada.
 */
export async function searchExerciseByName(name: string, apiKey: string): Promise<PingResult> {
  if (!apiKey.trim()) {
    return { ok: false, status: 0, raw: null, error: 'Falta la API key de ExerciseDB' }
  }

  try {
    const url = `${BASE}/exercises/name/${encodeURIComponent(name)}`
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey.trim(),
        'X-RapidAPI-Host': API_HOST,
      },
    })

    const contentType = response.headers.get('content-type') ?? ''
    let raw: unknown
    if (contentType.includes('application/json')) {
      raw = await response.json() as unknown
    } else {
      raw = await response.text()
    }

    if (response.ok) {
      return { ok: true, status: response.status, raw }
    }

    let error: string
    if (response.status === 429) {
      error = 'Cuota o rate limit excedido (429). Esperá antes de volver a probar.'
    } else if (response.status === 401 || response.status === 403) {
      error = `API key inválida o sin acceso (${response.status}).`
    } else {
      error = `Error de la API: ${response.status} ${response.statusText}`
    }

    return { ok: false, status: response.status, raw, error }
  } catch (err) {
    return { ok: false, status: 0, raw: null, error: `Error de red: ${String(err)}` }
  }
}

function mapErrorMessage(status: number): string {
  if (status === 429) return 'Cuota o rate limit excedido (429). Esperá antes de volver a probar.'
  if (status === 401 || status === 403) return `API key inválida o sin acceso (${status}).`
  return `Error de la API: ${status}`
}

/**
 * Intenta obtener la imagen de un ejercicio por id.
 * Intento 1: endpoint /image (blob).
 * Intento 2 (solo si 1 falla): endpoint /exercises/exercise/{id} (JSON, busca gifUrl/imageUrl/videoUrl/image).
 * Máximo 2 llamadas de cuota por invocación.
 */
export async function fetchExerciseImageUrl(id: string, apiKey: string): Promise<ImageResult> {
  if (!apiKey.trim()) {
    return { ok: false, status: 0, error: 'Falta la API key' }
  }

  const headers = {
    'X-RapidAPI-Key': apiKey.trim(),
    'X-RapidAPI-Host': API_HOST,
  }

  // Intento 1: endpoint /image
  try {
    const url = `${BASE}/image?exerciseId=${encodeURIComponent(id)}&resolution=720`
    const res = await fetch(url, { headers })
    const contentType = res.headers.get('content-type') ?? ''

    if (res.ok && contentType.startsWith('image/')) {
      const blob = await res.blob()
      const imageUrl = URL.createObjectURL(blob)
      return { ok: true, status: res.status, imageUrl }
    }

    // Si 2xx pero no imagen, o error de acceso → no vale la pena intento 2 para acceso
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      return { ok: false, status: res.status, error: mapErrorMessage(res.status) }
    }

    // 404/400 u otro → intentar ruta 2
  } catch (err) {
    return { ok: false, status: 0, error: `Error de red (intento 1): ${String(err)}` }
  }

  // Intento 2: endpoint /exercises/exercise/{id}
  try {
    const url = `${BASE}/exercises/exercise/${encodeURIComponent(id)}`
    const res = await fetch(url, { headers })

    if (res.status === 429) return { ok: false, status: 429, error: mapErrorMessage(429) }
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, error: mapErrorMessage(res.status) }

    const contentType = res.headers.get('content-type') ?? ''
    let body: unknown
    if (contentType.includes('application/json')) {
      body = await res.json() as unknown
    } else {
      body = await res.text()
    }

    if (!res.ok) {
      return { ok: false, status: res.status, raw: body, error: mapErrorMessage(res.status) }
    }

    // Buscar campo de imagen en el objeto
    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      const obj = body as Record<string, unknown>
      for (const field of ['gifUrl', 'imageUrl', 'videoUrl', 'image']) {
        const val = obj[field]
        if (typeof val === 'string' && val.length > 0) {
          return { ok: true, status: res.status, imageUrl: val, raw: obj }
        }
      }
    }

    // JSON sin campo de imagen → devolver crudo para diagnóstico
    return { ok: false, status: res.status, raw: body, error: 'Sin campo de imagen en la respuesta. Ver raw.' }
  } catch (err) {
    return { ok: false, status: 0, error: `Error de red (intento 2): ${String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Descarga cualquier URL (blob: o https:) y la convierte a data: URL (base64).
 * headers opcionales: usar para URLs https que requieren auth.
 * Devuelve null si falla.
 */
async function fetchAsDataUrl(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(url, headers ? { headers } : undefined)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => { resolve(reader.result as string) }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Convierte un array de unknown a Exercise[], descartando entradas que no
 * cumplan la forma mínima (id + name).
 */
function parseExercises(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return []
  const results: Exercise[] = []
  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
    const obj = item as Record<string, unknown>
    if (typeof obj['id'] !== 'string' || typeof obj['name'] !== 'string') continue
    results.push({
      id: obj['id'],
      name: obj['name'],
      bodyPart: typeof obj['bodyPart'] === 'string' ? obj['bodyPart'] : '',
      equipment: typeof obj['equipment'] === 'string' ? obj['equipment'] : '',
      target: typeof obj['target'] === 'string' ? obj['target'] : '',
      secondaryMuscles: Array.isArray(obj['secondaryMuscles'])
        ? (obj['secondaryMuscles'] as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
      instructions: Array.isArray(obj['instructions'])
        ? (obj['instructions'] as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
      description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
      difficulty: typeof obj['difficulty'] === 'string' ? obj['difficulty'] : undefined,
      category: typeof obj['category'] === 'string' ? obj['category'] : undefined,
    })
  }
  return results
}

// ---------------------------------------------------------------------------
// API cacheada — usar estas en la UI en vez de las funciones crudas
// ---------------------------------------------------------------------------

/**
 * Busca ejercicios por nombre con caché permanente en localStorage.
 * La 2da llamada con el mismo query devuelve fromCache:true sin tocar la red.
 *
 * TEST: searchExercisesCached('pull up') dos veces → 2da sin requests en Network.
 */
export async function searchExercisesCached(name: string, apiKey: string): Promise<SearchResult> {
  const cached = getCachedSearch(name)
  if (cached) {
    return { ok: true, fromCache: true, results: cached }
  }

  const ping = await searchExerciseByName(name, apiKey)
  if (!ping.ok) {
    return { ok: false, fromCache: false, results: [], error: ping.error }
  }

  const exercises = parseExercises(ping.raw)
  setCachedSearch(name, exercises)
  return { ok: true, fromCache: false, results: exercises }
}

/**
 * Obtiene la URL de imagen de un ejercicio con caché permanente.
 * Solo acepta data: URLs como cache hit válido (https CDN requiere auth para renderizar).
 * Siempre convierte el resultado final a dataURL antes de cachear y devolver.
 * Fallback: si la conversión falla para blob, devuelve blob URL (usable en sesión).
 *           si falla para https, devuelve error (no renderizable sin auth).
 */
export async function getImageUrlCached(id: string, apiKey: string): Promise<CachedImageResult> {
  // Solo data: URLs son cache hits válidos — URLs https del CDN necesitan auth para renderizar
  const cached = getCachedImage(id)
  if (cached?.startsWith('data:')) {
    return { ok: true, fromCache: true, imageUrl: cached }
  }

  const result = await fetchExerciseImageUrl(id, apiKey)
  if (!result.ok || !result.imageUrl) {
    return { ok: false, fromCache: false, error: result.error }
  }

  // Convertir a dataURL para que <img> pueda renderizar sin auth headers
  const authHeaders = result.imageUrl.startsWith('https:')
    ? { 'X-RapidAPI-Key': apiKey.trim(), 'X-RapidAPI-Host': API_HOST }
    : undefined

  const dataUrl = await fetchAsDataUrl(result.imageUrl, authHeaders)
  if (dataUrl) {
    // Intentar cachear; si quota excedida, setCachedImage lo ignora silenciosamente
    setCachedImage(id, dataUrl)
    return { ok: true, fromCache: false, imageUrl: dataUrl }
  }

  // Conversión falló
  if (result.imageUrl.startsWith('blob:')) {
    // blob es funcional en esta sesión aunque no persista
    return { ok: true, fromCache: false, imageUrl: result.imageUrl }
  }
  // https sin conversión = no renderizable → error
  return { ok: false, fromCache: false, error: 'No se pudo convertir la imagen del CDN a dataURL' }
}
