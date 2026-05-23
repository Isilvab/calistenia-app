import type { Exercise } from './types'

/**
 * Caché persistente en localStorage para ExerciseDB.
 * Sin vencimiento — permanente hasta clearExercisedbCache().
 *
 * TEST MANUAL: llamar searchExercisesCached('pull up') dos veces.
 * La 2da debe devolver fromCache:true y no aparecer ningún request en Network.
 */

const PREFIX = 'calisteniapp::'

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ')
}

function searchKey(query: string): string {
  return `${PREFIX}exercisedb:search:${normalizeQuery(query)}`
}

function imageKey(id: string): string {
  return `${PREFIX}exercisedb:image:${id}`
}

export function getCachedSearch(query: string): Exercise[] | null {
  try {
    const raw = localStorage.getItem(searchKey(query))
    if (!raw) return null
    return JSON.parse(raw) as Exercise[]
  } catch {
    return null
  }
}

export function setCachedSearch(query: string, results: Exercise[]): void {
  try {
    localStorage.setItem(searchKey(query), JSON.stringify(results))
  } catch {
    // localStorage lleno — no cachear, no romper
  }
}

export function getCachedImage(id: string): string | null {
  try {
    return localStorage.getItem(imageKey(id))
  } catch {
    return null
  }
}

export function setCachedImage(id: string, url: string): void {
  try {
    localStorage.setItem(imageKey(id), url)
  } catch {
    // Quota excedida (frecuente con dataURLs de GIFs grandes) — degradar silenciosamente
  }
}

/** Borra solo las keys exercisedb:* del prefijo calisteniapp:: */
export function clearExercisedbCache(): void {
  const toDelete: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${PREFIX}exercisedb:`)) {
      toDelete.push(key)
    }
  }
  for (const key of toDelete) {
    localStorage.removeItem(key)
  }
}
