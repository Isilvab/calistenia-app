// Implementación del StorageAdapter sobre localStorage.
// Prefijo 'calisteniapp::' coincide exactamente con el storage-shim.js del source original,
// lo que garantiza compatibilidad de claves si se migran datos del artifact.
// Todos los métodos son async aunque sean síncronos hoy: el contrato no cambia al migrar a Supabase.

import type { StorageAdapter } from './types'
import type {
  Profile,
  RoutineState,
  Session,
  Nutrition,
  Mobility,
  AppSettings,
} from '@/types'

const PREFIX = 'calisteniapp::'

// Claves fijas
const KEY_PROFILE   = 'user:profile'
const KEY_ROUTINE   = 'routine:current'
const KEY_SETTINGS  = 'settings'

// Prefijos de claves por fecha
const KEY_SESSION   = 'sessions:'
const KEY_NUTRITION = 'nutrition:'
const KEY_MOBILITY  = 'mobility:'

const DEFAULT_SETTINGS: AppSettings = {
  tema: 'system',
  notifsActivas: false,
}

export class LocalStorageAdapter implements StorageAdapter {
  // ─── Helpers privados ───────────────────────────────────────────────────────

  private read<T>(key: string): T | null {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  private write(key: string, value: unknown): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  }

  private removeKey(key: string): void {
    localStorage.removeItem(PREFIX + key)
  }

  /** Retorna las sub-claves (sin PREFIX) que empiezan con subPrefix */
  private keysWithSubPrefix(subPrefix: string): string[] {
    const result: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX + subPrefix)) {
        result.push(k.slice(PREFIX.length))
      }
    }
    return result
  }

  // ─── Perfil ─────────────────────────────────────────────────────────────────

  async getProfile(): Promise<Profile | null> {
    return this.read<Profile>(KEY_PROFILE)
  }

  async setProfile(profile: Profile): Promise<void> {
    this.write(KEY_PROFILE, profile)
  }

  // ─── Estado de rutina ────────────────────────────────────────────────────────

  async getRoutineState(): Promise<RoutineState | null> {
    return this.read<RoutineState>(KEY_ROUTINE)
  }

  async setRoutineState(state: RoutineState): Promise<void> {
    this.write(KEY_ROUTINE, state)
  }

  // ─── Sesiones de entrenamiento ───────────────────────────────────────────────

  async getSession(date: string): Promise<Session | null> {
    return this.read<Session>(KEY_SESSION + date)
  }

  async saveSession(date: string, session: Session): Promise<void> {
    this.write(KEY_SESSION + date, session)
  }

  async listSessions(fromDate?: string, toDate?: string): Promise<Array<{ date: string; session: Session }>> {
    const allKeys = this.keysWithSubPrefix(KEY_SESSION)
    const result: Array<{ date: string; session: Session }> = []

    for (const key of allKeys) {
      const date = key.slice(KEY_SESSION.length)
      if (fromDate && date < fromDate) continue
      if (toDate && date > toDate) continue
      const session = this.read<Session>(key)
      if (session) result.push({ date, session })
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  async deleteSession(date: string): Promise<void> {
    this.removeKey(KEY_SESSION + date)
  }

  // ─── Nutrición ───────────────────────────────────────────────────────────────

  async getNutrition(date: string): Promise<Nutrition | null> {
    return this.read<Nutrition>(KEY_NUTRITION + date)
  }

  async saveNutrition(date: string, log: Nutrition): Promise<void> {
    this.write(KEY_NUTRITION + date, log)
  }

  async listNutrition(fromDate?: string, toDate?: string): Promise<Array<{ date: string; log: Nutrition }>> {
    const allKeys = this.keysWithSubPrefix(KEY_NUTRITION)
    const result: Array<{ date: string; log: Nutrition }> = []

    for (const key of allKeys) {
      const date = key.slice(KEY_NUTRITION.length)
      if (fromDate && date < fromDate) continue
      if (toDate && date > toDate) continue
      const log = this.read<Nutrition>(key)
      if (log) result.push({ date, log })
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  // ─── Movilidad ───────────────────────────────────────────────────────────────

  async getMobility(date: string): Promise<Mobility | null> {
    return this.read<Mobility>(KEY_MOBILITY + date)
  }

  async saveMobility(date: string, log: Mobility): Promise<void> {
    this.write(KEY_MOBILITY + date, log)
  }

  // ─── Configuración ────────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    return this.read<AppSettings>(KEY_SETTINGS) ?? { ...DEFAULT_SETTINGS }
  }

  async setSettings(s: AppSettings): Promise<void> {
    this.write(KEY_SETTINGS, s)
  }

  // ─── Genéricos de bajo nivel ──────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    return this.read<T>(key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.write(key, value)
  }

  async remove(key: string): Promise<void> {
    this.removeKey(key)
  }

  async listKeysWithPrefix(prefix: string): Promise<string[]> {
    return this.keysWithSubPrefix(prefix)
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    for (const key of this.keysWithSubPrefix('')) {
      this.removeKey(key)
    }
  }

  async exportAll(): Promise<string> {
    const data: Record<string, unknown> = {}
    for (const key of this.keysWithSubPrefix('')) {
      data[key] = this.read<unknown>(key)
    }
    return JSON.stringify(data, null, 2)
  }

  async importAll(json: string): Promise<void> {
    let parsed: Record<string, unknown>
    try {
      const raw: unknown = JSON.parse(json)
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error('Formato inválido: se esperaba un objeto JSON')
      }
      parsed = raw as Record<string, unknown>
    } catch (err) {
      throw new Error(`importAll: JSON inválido — ${String(err)}`)
    }

    await this.clearAll()
    for (const [key, value] of Object.entries(parsed)) {
      this.write(key, value)
    }
  }
}
