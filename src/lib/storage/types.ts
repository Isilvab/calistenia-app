// Contrato del adapter de persistencia.
// Las pages importan esta interfaz — nunca localStorage ni Supabase directamente.
// Cambiar de backend = cambiar solo la implementación, no los consumidores.

import type {
  Profile,
  RoutineState,
  Session,
  Nutrition,
  Mobility,
  AppSettings,
  Rutina,
} from '@/types'

export interface StorageAdapter {
  // ── Perfil ──────────────────────────────────────────────────────────────────
  getProfile(): Promise<Profile | null>
  setProfile(profile: Profile): Promise<void>

  // ── Estado de rutina ─────────────────────────────────────────────────────────
  getRoutineState(): Promise<RoutineState | null>
  setRoutineState(state: RoutineState): Promise<void>

  // ── Sesiones de entrenamiento ────────────────────────────────────────────────
  // La fecha es la clave externa — NO está implícita solo dentro de Session.
  getSession(date: string): Promise<Session | null>
  saveSession(date: string, session: Session): Promise<void>
  listSessions(fromDate?: string, toDate?: string): Promise<Array<{ date: string; session: Session }>>
  deleteSession(date: string): Promise<void>
  getUltimaSesionDeRutina(rutina_id: string): Promise<Session | null>

  // ── Nutrición ────────────────────────────────────────────────────────────────
  getNutrition(date: string): Promise<Nutrition | null>
  saveNutrition(date: string, log: Nutrition): Promise<void>
  listNutrition(fromDate?: string, toDate?: string): Promise<Array<{ date: string; log: Nutrition }>>

  // ── Movilidad ────────────────────────────────────────────────────────────────
  getMobility(date: string): Promise<Mobility | null>
  saveMobility(date: string, log: Mobility): Promise<void>

  // ── Configuración ────────────────────────────────────────────────────────────
  getSettings(): Promise<AppSettings>
  setSettings(s: AppSettings): Promise<void>

  // ── Rutinas custom ───────────────────────────────────────────────────────────
  listRutinas(): Promise<Rutina[]>
  getRutina(id: string): Promise<Rutina | null>
  saveRutina(rutina: Rutina): Promise<void>     // upsert por id; si id vacío, genera uno
  deleteRutina(id: string): Promise<void>

  // ── Genéricos de bajo nivel ──────────────────────────────────────────────────
  // Para datos no estándar (exercisedb cache, etc.) sin extender la interfaz.
  // Los métodos específicos de arriba son la API preferida.
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  listKeysWithPrefix(prefix: string): Promise<string[]>

  // ── Utilidades ────────────────────────────────────────────────────────────────
  clearAll(): Promise<void>
  exportAll(): Promise<string>        // JSON serializado de todo — para backup
  importAll(json: string): Promise<void>
}
