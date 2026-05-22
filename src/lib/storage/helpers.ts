// Utilidades de fecha y datos para el adapter de storage

/**
 * Retorna la fecha de hoy como string YYYY-MM-DD en zona horaria local.
 * Usar siempre esta función en vez de new Date().toISOString() (que devuelve UTC).
 */
export function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Retorna un array con todas las fechas (YYYY-MM-DD) entre from y to, inclusive.
 * Si from > to retorna array vacío.
 */
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  // Parsear como fecha local agregando hora fija para evitar desfase UTC
  const current = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * Suma la proteína total de un array de entradas de nutrición.
 * Útil para recalcular proteinaTotal si se editan las entradas manualmente.
 */
export function sumProtein(entradas: Array<{ proteina: number }>): number {
  return entradas.reduce((acc, e) => acc + e.proteina, 0)
}
