// Utilidades de fecha y formato (genéricas, sin lógica de dominio)

/**
 * Retorna fecha como YYYY-MM-DD. Acepta Date opcional (a diferencia de
 * storage/helpers#todayKey que siempre usa hoy).
 */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** "2024-05-21" → "21/05" */
export function formatDate(key: string): string {
  const parts = key.split("-")
  return `${parts[2]}/${parts[1]}`
}

/** Rellena número con cero hasta 2 dígitos. */
export function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** Segundos → "MM:SS" */
export function fmtMMSS(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${pad(m)}:${pad(sec)}`
}

/** Retorna la fecha del lunes de la semana que contiene `d`. */
export function getWeekStartKey(d: Date = new Date()): string {
  const dt = new Date(d)
  const day = (dt.getDay() + 6) % 7 // lunes = 0
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return todayKey(dt)
}

/**
 * Wrapper de isDeloadWeek con firma de 2 args igual al source original.
 * El bloque (_bloque) no afecta el resultado — la semana 4, 8 y 12 son siempre deload.
 * En data/routines.ts existe una versión de 1 arg; esta es la canónica para las pages.
 * TODO: unificar ambas firmas en un prompt de deuda técnica.
 */
export function isDeloadWeek(_bloque: number, semana: number): boolean {
  return [4, 8, 12].includes(semana)
}

/** Retorna array de 7 claves YYYY-MM-DD de la semana actual (lunes → domingo). */
export function getWeekDays(): string[] {
  const out: string[] = []
  const start = new Date()
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    out.push(todayKey(dt))
  }
  return out
}
