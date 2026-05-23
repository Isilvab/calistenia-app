// SupabaseAdapter: implementa StorageAdapter sobre Supabase.
// Mapea los tipos de dominio (camelCase TS) a columnas snake_case de la DB.
// Las tablas con PK user_id usan UPSERT con onConflict:'user_id'.
// Las tablas con PK (user_id, fecha) usan onConflict:'user_id,fecha'.
// Las keys 'exercisedb:' y 'exercise_link:' se delegan a localStorage (caché de API externa).

import type { StorageAdapter } from './types'
import type {
  Profile,
  RoutineState,
  Session,
  Nutrition,
  Mobility,
  AppSettings,
  Measurement,
  EjercicioEnSesion,
  Comida,
  Rutina,
  RutinaEjercicio,
} from '@/types'
import { supabase } from '@/lib/supabase/client'

// ─── Constantes ──────────────────────────────────────────────────────────────

const LS_PREFIX = 'calisteniapp::'
const DEFAULT_SETTINGS: AppSettings = { tema: 'system', notifsActivas: false }

// ─── Row shapes (forma exacta de las filas de Supabase) ──────────────────────

interface PerfilRow {
  user_id: string
  nombre: string | null
  peso_kg: number
  altura_cm: number
  edad: number
  sexo: string
  objetivo: string
  fecha_inicio: string | null
  objetivo_proteina_g: number | null
  objetivo_calorias: number | null
  objetivo_grasas_g: number | null
  objetivo_carbos_g: number | null
  measurements: Measurement[]
  photos: { [weekKey: string]: boolean }
}

interface RutinaEstadoRow {
  user_id: string
  bloque_actual: number
  semana_actual: number
  dia_actual: number
}

interface SesionesRow {
  user_id: string
  fecha: string
  tipo_sesion: string | null     // null para rutinas custom
  nombre_sesion: string | null   // null para rutinas custom
  bloque: number | null          // null para rutinas custom
  semana: number | null          // null para rutinas custom
  dia: number | null             // null para rutinas custom
  duracion_min: number
  notas: string
  draft: boolean | null
  ejercicios: EjercicioEnSesion[]
  rutina_id?: string | null      // set para sesiones de rutina custom
}

interface NutricionRow {
  user_id: string
  fecha: string
  proteina_g: number
  calorias_estimadas: number
  agua_litros: number
  comidas: Comida[]
}

interface MovilidadRow {
  user_id: string
  fecha: string
  completada: boolean
  items: { [ejercicioId: string]: boolean }
}

interface RutinasRow {
  id: string
  user_id: string
  nombre: string
  descripcion: string
  ejercicios: RutinaEjercicio[]   // jsonb — Supabase devuelve objeto ya parseado
  creada_en: string
  updated_at: string
}

interface ConfiguracionRow {
  user_id: string
  tema: string
  notifs_activas: boolean
  api_keys: { exercisedb?: string }   // NOT NULL en DB — nunca mandar null
}

// ─── Mappers row ↔ tipo TS ───────────────────────────────────────────────────

function rowToProfile(row: PerfilRow): Profile {
  return {
    nombre: row.nombre ?? undefined,
    peso_kg: row.peso_kg,
    altura_cm: row.altura_cm,
    edad: row.edad,
    sexo: row.sexo as Profile['sexo'],
    objetivo: row.objetivo as Profile['objetivo'],
    fecha_inicio: row.fecha_inicio ?? undefined,
    objetivo_proteina_g: row.objetivo_proteina_g ?? undefined,
    objetivo_calorias: row.objetivo_calorias ?? undefined,
    objetivo_grasas_g: row.objetivo_grasas_g ?? undefined,
    objetivo_carbos_g: row.objetivo_carbos_g ?? undefined,
    measurements: row.measurements ?? undefined,
    photos: row.photos ?? undefined,
  }
}

function profileToRow(userId: string, p: Profile): PerfilRow {
  return {
    user_id: userId,
    nombre: p.nombre ?? null,
    peso_kg: p.peso_kg,
    altura_cm: p.altura_cm,
    edad: p.edad,
    sexo: p.sexo,
    objetivo: p.objetivo,
    fecha_inicio: p.fecha_inicio ?? null,
    objetivo_proteina_g: p.objetivo_proteina_g ?? null,
    objetivo_calorias: p.objetivo_calorias ?? null,
    objetivo_grasas_g: p.objetivo_grasas_g ?? null,
    objetivo_carbos_g: p.objetivo_carbos_g ?? null,
    measurements: p.measurements ?? [],
    photos: p.photos ?? {},
  }
}

function rowToRoutineState(row: RutinaEstadoRow): RoutineState {
  return {
    bloque_actual: row.bloque_actual,
    semana_actual: row.semana_actual,
    dia_actual: row.dia_actual,
  }
}

function rowToSession(row: SesionesRow): Session {
  return {
    fecha: row.fecha,
    tipo_sesion: row.tipo_sesion ?? 'custom',
    nombre_sesion: row.nombre_sesion ?? '',
    bloque: row.bloque ?? 0,
    semana: row.semana ?? 0,
    dia: row.dia ?? 0,
    duracion_min: row.duracion_min,
    notas: row.notas,
    draft: row.draft ?? undefined,
    rutina_id: row.rutina_id ?? undefined,
    ejercicios: row.ejercicios,
  }
}

function rowToNutrition(row: NutricionRow): Nutrition {
  return {
    proteina_g: row.proteina_g,
    calorias_estimadas: row.calorias_estimadas,
    agua_litros: row.agua_litros,
    comidas: row.comidas,
  }
}

function rowToMobility(row: MovilidadRow): Mobility {
  return {
    completada: row.completada,
    items: row.items,
  }
}

function rowToRutina(row: RutinasRow): Rutina {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    ejercicios: row.ejercicios,
    creada_en: row.creada_en,
  }
}

function rutinaToRow(userId: string, r: Rutina): RutinasRow {
  return {
    id: r.id,
    user_id: userId,
    nombre: r.nombre,
    descripcion: r.descripcion,
    ejercicios: r.ejercicios,
    creada_en: r.creada_en,
    updated_at: new Date().toISOString(),
  }
}

function rowToSettings(row: ConfiguracionRow): AppSettings {
  return {
    tema: row.tema as AppSettings['tema'],
    notifsActivas: row.notifs_activas,
    apiKeys: row.api_keys ?? undefined,
  }
}

// ─── Clase ───────────────────────────────────────────────────────────────────

export class SupabaseAdapter implements StorageAdapter {

  // ── Auth helper ─────────────────────────────────────────────────────────────

  private async requireUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error('SupabaseAdapter: sin sesión activa')
    return session.user.id
  }

  // ── localStorage cache helpers (para keys exercisedb: / exercise_link:) ────

  private lsRead<T>(key: string): T | null {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (raw === null) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }

  private lsWrite(key: string, value: unknown): void {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  }

  private lsRemove(key: string): void {
    localStorage.removeItem(LS_PREFIX + key)
  }

  private lsKeysWithSubPrefix(subPrefix: string): string[] {
    const result: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(LS_PREFIX + subPrefix)) {
        result.push(k.slice(LS_PREFIX.length))
      }
    }
    return result
  }

  private isCacheKey(key: string): boolean {
    return key.startsWith('exercisedb:') || key.startsWith('exercise_link:')
  }

  // ── Perfil ──────────────────────────────────────────────────────────────────

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('perfil')
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToProfile(data as PerfilRow)
  }

  async setProfile(profile: Profile): Promise<void> {
    const userId = await this.requireUserId()
    const { error } = await supabase
      .from('perfil')
      .upsert(profileToRow(userId, profile), { onConflict: 'user_id' })
    if (error) throw error
  }

  // ── Estado de rutina ─────────────────────────────────────────────────────────

  async getRoutineState(): Promise<RoutineState | null> {
    const { data, error } = await supabase
      .from('rutina_estado')
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToRoutineState(data as RutinaEstadoRow)
  }

  async setRoutineState(state: RoutineState): Promise<void> {
    const userId = await this.requireUserId()
    const row: RutinaEstadoRow = { user_id: userId, ...state }
    const { error } = await supabase
      .from('rutina_estado')
      .upsert(row, { onConflict: 'user_id' })
    if (error) throw error
  }

  // ── Sesiones ─────────────────────────────────────────────────────────────────

  async getSession(date: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sesiones')
      .select('*')
      .eq('fecha', date)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToSession(data as SesionesRow)
  }

  async saveSession(date: string, session: Session): Promise<void> {
    const userId = await this.requireUserId()
    const row: SesionesRow = {
      user_id: userId,
      fecha: date,
      tipo_sesion: session.tipo_sesion,
      nombre_sesion: session.nombre_sesion,
      bloque: session.bloque,
      semana: session.semana,
      dia: session.dia,
      duracion_min: session.duracion_min,
      notas: session.notas,
      draft: session.draft ?? null,
      ejercicios: session.ejercicios,
      rutina_id: session.rutina_id ?? null,
    }
    const { error } = await supabase
      .from('sesiones')
      .upsert(row, { onConflict: 'user_id,fecha' })
    if (error) throw error
  }

  async listSessions(fromDate?: string, toDate?: string): Promise<Array<{ date: string; session: Session }>> {
    let query = supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: true })
    if (fromDate) query = query.gte('fecha', fromDate)
    if (toDate) query = query.lte('fecha', toDate)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(row => ({
      date: (row as SesionesRow).fecha,
      session: rowToSession(row as SesionesRow),
    }))
  }

  async getUltimaSesionDeRutina(rutina_id: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sesiones')
      .select('*')
      .eq('rutina_id', rutina_id)
      .order('fecha', { ascending: false })
      .limit(1)
    if (error) throw error
    if (!data || data.length === 0) return null
    return rowToSession(data[0] as SesionesRow)
  }

  async deleteSession(date: string): Promise<void> {
    const userId = await this.requireUserId()
    const { error } = await supabase
      .from('sesiones')
      .delete()
      .eq('user_id', userId)
      .eq('fecha', date)
    if (error) throw error
  }

  // ── Nutrición ────────────────────────────────────────────────────────────────

  async getNutrition(date: string): Promise<Nutrition | null> {
    const { data, error } = await supabase
      .from('nutricion')
      .select('*')
      .eq('fecha', date)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToNutrition(data as NutricionRow)
  }

  async saveNutrition(date: string, log: Nutrition): Promise<void> {
    const userId = await this.requireUserId()
    const row: NutricionRow = {
      user_id: userId,
      fecha: date,
      proteina_g: log.proteina_g,
      calorias_estimadas: log.calorias_estimadas,
      agua_litros: log.agua_litros,
      comidas: log.comidas,
    }
    const { error } = await supabase
      .from('nutricion')
      .upsert(row, { onConflict: 'user_id,fecha' })
    if (error) throw error
  }

  async listNutrition(fromDate?: string, toDate?: string): Promise<Array<{ date: string; log: Nutrition }>> {
    let query = supabase
      .from('nutricion')
      .select('*')
      .order('fecha', { ascending: true })
    if (fromDate) query = query.gte('fecha', fromDate)
    if (toDate) query = query.lte('fecha', toDate)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(row => ({
      date: (row as NutricionRow).fecha,
      log: rowToNutrition(row as NutricionRow),
    }))
  }

  // ── Movilidad ────────────────────────────────────────────────────────────────

  async getMobility(date: string): Promise<Mobility | null> {
    const { data, error } = await supabase
      .from('movilidad')
      .select('*')
      .eq('fecha', date)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToMobility(data as MovilidadRow)
  }

  async saveMobility(date: string, log: Mobility): Promise<void> {
    const userId = await this.requireUserId()
    const row: MovilidadRow = {
      user_id: userId,
      fecha: date,
      completada: log.completada,
      items: log.items,
    }
    const { error } = await supabase
      .from('movilidad')
      .upsert(row, { onConflict: 'user_id,fecha' })
    if (error) throw error
  }

  // ── Configuración ────────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) return { ...DEFAULT_SETTINGS }
    return rowToSettings(data as ConfiguracionRow)
  }

  async setSettings(s: AppSettings): Promise<void> {
    const userId = await this.requireUserId()
    // api_keys es NOT NULL en DB — mandar {} vacío cuando no hay key, nunca null
    const row: ConfiguracionRow = {
      user_id: userId,
      tema: s.tema,
      notifs_activas: s.notifsActivas ?? false,
      api_keys: s.apiKeys ?? {},
    }
    const { error } = await supabase
      .from('configuracion')
      .upsert(row, { onConflict: 'user_id' })
    if (error) throw error
  }

  // ── Rutinas custom ───────────────────────────────────────────────────────────

  async listRutinas(): Promise<Rutina[]> {
    const { data, error } = await supabase
      .from('rutinas')
      .select('*')
      .order('creada_en', { ascending: true })
    if (error) throw error
    return (data ?? []).map(row => rowToRutina(row as RutinasRow))
  }

  async getRutina(id: string): Promise<Rutina | null> {
    const { data, error } = await supabase
      .from('rutinas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToRutina(data as RutinasRow)
  }

  async saveRutina(rutina: Rutina): Promise<void> {
    const userId = await this.requireUserId()
    const resolved: Rutina = rutina.id
      ? rutina
      : { ...rutina, id: crypto.randomUUID(), creada_en: new Date().toISOString() }
    const { error } = await supabase
      .from('rutinas')
      .upsert(rutinaToRow(userId, resolved), { onConflict: 'id' })
    if (error) throw error
  }

  async deleteRutina(id: string): Promise<void> {
    const userId = await this.requireUserId()
    const { error } = await supabase
      .from('rutinas')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
    if (error) throw error
  }

  // ── Genéricos de bajo nivel ──────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (this.isCacheKey(key)) return this.lsRead<T>(key)
    if (key === 'user:profile') return (await this.getProfile()) as T | null
    if (key === 'routine:current') return (await this.getRoutineState()) as T | null
    if (key === 'settings') return (await this.getSettings()) as T
    if (key.startsWith('sessions:')) return (await this.getSession(key.slice(9))) as T | null
    if (key.startsWith('nutrition:')) return (await this.getNutrition(key.slice(10))) as T | null
    if (key.startsWith('mobility:')) return (await this.getMobility(key.slice(9))) as T | null
    return null
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.isCacheKey(key)) { this.lsWrite(key, value); return }
    if (key === 'user:profile') { await this.setProfile(value as Profile); return }
    if (key === 'routine:current') { await this.setRoutineState(value as RoutineState); return }
    if (key === 'settings') { await this.setSettings(value as AppSettings); return }
    if (key.startsWith('sessions:')) { await this.saveSession(key.slice(9), value as Session); return }
    if (key.startsWith('nutrition:')) { await this.saveNutrition(key.slice(10), value as Nutrition); return }
    if (key.startsWith('mobility:')) { await this.saveMobility(key.slice(9), value as Mobility); return }
    if (key.startsWith('rutinas:')) { await this.saveRutina(value as Rutina); return }
  }

  async remove(key: string): Promise<void> {
    if (this.isCacheKey(key)) { this.lsRemove(key); return }
    if (key.startsWith('sessions:')) { await this.deleteSession(key.slice(9)); return }

    const userId = await this.requireUserId()
    if (key === 'user:profile') {
      await supabase.from('perfil').delete().eq('user_id', userId)
    } else if (key === 'routine:current') {
      await supabase.from('rutina_estado').delete().eq('user_id', userId)
    } else if (key === 'settings') {
      await supabase.from('configuracion').delete().eq('user_id', userId)
    } else if (key.startsWith('nutrition:')) {
      await supabase.from('nutricion').delete().eq('user_id', userId).eq('fecha', key.slice(10))
    } else if (key.startsWith('mobility:')) {
      await supabase.from('movilidad').delete().eq('user_id', userId).eq('fecha', key.slice(9))
    }
  }

  async listKeysWithPrefix(prefix: string): Promise<string[]> {
    if (this.isCacheKey(prefix)) return this.lsKeysWithSubPrefix(prefix)

    if (prefix === 'sessions:') {
      const { data } = await supabase.from('sesiones').select('fecha')
      return (data ?? []).map(r => `sessions:${(r as { fecha: string }).fecha}`)
    }
    if (prefix === 'nutrition:') {
      const { data } = await supabase.from('nutricion').select('fecha')
      return (data ?? []).map(r => `nutrition:${(r as { fecha: string }).fecha}`)
    }
    if (prefix === 'mobility:') {
      const { data } = await supabase.from('movilidad').select('fecha')
      return (data ?? []).map(r => `mobility:${(r as { fecha: string }).fecha}`)
    }

    // Single-row tables
    const keys: string[] = []
    if ('user:profile'.startsWith(prefix)) {
      const p = await this.getProfile()
      if (p) keys.push('user:profile')
    }
    if ('routine:current'.startsWith(prefix)) {
      const r = await this.getRoutineState()
      if (r) keys.push('routine:current')
    }
    if ('settings'.startsWith(prefix)) {
      keys.push('settings')
    }
    return keys
  }

  // ── Utilidades ───────────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    const userId = await this.requireUserId()
    const results = await Promise.all([
      supabase.from('perfil').delete().eq('user_id', userId),
      supabase.from('rutina_estado').delete().eq('user_id', userId),
      supabase.from('sesiones').delete().eq('user_id', userId),
      supabase.from('nutricion').delete().eq('user_id', userId),
      supabase.from('movilidad').delete().eq('user_id', userId),
      supabase.from('configuracion').delete().eq('user_id', userId),
      supabase.from('rutinas').delete().eq('user_id', userId),
    ])
    const tables = ['perfil', 'rutina_estado', 'sesiones', 'nutricion', 'movilidad', 'configuracion', 'rutinas']
    const deleteErrors = results
      .map((r, i) => r.error ? `${tables[i]}: ${r.error.message}` : null)
      .filter(Boolean) as string[]
    if (deleteErrors.length > 0) {
      throw new Error(`clearAll: falló al borrar — ${deleteErrors.join('; ')}`)
    }
    // Limpiar caché externa de localStorage
    for (const key of this.lsKeysWithSubPrefix('exercisedb:')) this.lsRemove(key)
    for (const key of this.lsKeysWithSubPrefix('exercise_link:')) this.lsRemove(key)
  }

  async exportAll(): Promise<string> {
    const data: Record<string, unknown> = {}

    const profile = await this.getProfile()
    if (profile) data['user:profile'] = profile

    const routineState = await this.getRoutineState()
    if (routineState) data['routine:current'] = routineState

    data['settings'] = await this.getSettings()

    for (const { date, session } of await this.listSessions()) {
      data[`sessions:${date}`] = session
    }
    for (const { date, log } of await this.listNutrition()) {
      data[`nutrition:${date}`] = log
    }

    for (const rutina of await this.listRutinas()) {
      data[`rutinas:${rutina.id}`] = rutina
    }

    // movilidad no tiene listMobility en interfaz — consulta directa
    const { data: movRows } = await supabase.from('movilidad').select('*')
    for (const row of (movRows ?? [])) {
      const r = row as MovilidadRow
      data[`mobility:${r.fecha}`] = rowToMobility(r)
    }

    // Caché localStorage
    for (const key of this.lsKeysWithSubPrefix('exercisedb:')) {
      data[key] = this.lsRead(key)
    }
    for (const key of this.lsKeysWithSubPrefix('exercise_link:')) {
      data[key] = this.lsRead(key)
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
      throw new Error(`JSON inválido — ${String(err)}`)
    }

    // Validar antes de borrar — al menos una key reconocible
    const KNOWN_PREFIXES = [
      'user:profile', 'routine:current', 'settings',
      'sessions:', 'nutrition:', 'mobility:', 'rutinas:',
      'exercisedb:', 'exercise_link:',
    ]
    const hasKnown = Object.keys(parsed).some(k =>
      KNOWN_PREFIXES.some(p => k === p || k.startsWith(p))
    )
    if (!hasKnown) {
      throw new Error('El archivo no contiene datos reconocibles — no se borró nada')
    }

    await this.clearAll()

    // Escribir rutinas antes que sesiones para respetar FK sesiones_rutina_id_fkey.
    // Sesiones van al final; el resto puede ir en cualquier orden.
    const entries = Object.entries(parsed)
    const sessions = entries.filter(([k]) => k.startsWith('sessions:'))
    const rest     = entries.filter(([k]) => !k.startsWith('sessions:'))
    const ordered  = [...rest, ...sessions]

    const failed: string[] = []
    for (const [key, value] of ordered) {
      try {
        await this.set(key, value)
      } catch (err) {
        const detail = err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err)
            ? String((err as { message: unknown }).message)
            : JSON.stringify(err)
        failed.push(`${key}: ${detail}`)
      }
    }

    if (failed.length > 0) {
      throw new Error(
        `PARTIAL_IMPORT: ${failed.length} entrada${failed.length > 1 ? 's' : ''} no se importaron — ` +
        `recargá para ver lo que sí se restauró.\n${failed.join('\n')}`
      )
    }
  }
}
