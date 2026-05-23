// Tipos del dominio — fuente de verdad: artifact original (screens/*.jsx + storage-shim.js)
// Convención: snake_case en español, idéntico al source. NO normalizar nombres ni acentos.

// ─── Perfil de usuario ────────────────────────────────────────────────────────
// Clave de storage: "user:profile"
// Los campos objetivo_* se calculan via calcMacros() en Settings y se guardan junto al perfil.
// measurements y photos se embeben en el perfil (no tienen tabla separada).

export interface Profile {
  nombre?: string
  peso_kg: number
  altura_cm: number
  edad: number
  sexo: 'hombre' | 'mujer'
  objetivo: 'recomposicion' | 'definicion' | 'volumen'
  fecha_inicio?: string              // YYYY-MM-DD; cuándo empezó el programa
  objetivo_proteina_g?: number       // g/día; calculado por calcMacros
  objetivo_calorias?: number         // kcal/día; calculado por calcMacros
  objetivo_grasas_g?: number         // g/día; calculado por calcMacros
  objetivo_carbos_g?: number         // g/día; calculado por calcMacros
  measurements?: Measurement[]       // historial de mediciones corporales y tests de fuerza
  photos?: { [weekKey: string]: boolean }  // weekKey = YYYY-MM-DD del lunes de la semana
}

// ─── Medición corporal / test de fuerza ──────────────────────────────────────
// Embebida en Profile.measurements[]. Un mismo objeto cubre tanto medidas
// corporales como resultados de tests de fuerza (todos los campos son opcionales
// excepto fecha). Se ordenan por fecha ascendente.

export interface Measurement {
  fecha: string           // YYYY-MM-DD
  peso_kg?: number
  cintura_cm?: number
  brazo_cm?: number
  pecho_cm?: number
  muslo_cm?: number
  dominadas_max?: number  // reps; test de fuerza
  flexiones_max?: number  // reps; test de fuerza
  plancha_seg?: number    // segundos; test de fuerza
}

// ─── Estado de rutina ─────────────────────────────────────────────────────────
// Clave de storage: "routine:current"
// Avanza automáticamente al finalizar una sesión en Train.
// bloque_actual: 1–3, semana_actual: 1–12, dia_actual: 1–7

export interface RoutineState {
  bloque_actual: number
  semana_actual: number
  dia_actual: number
}

// ─── Sesión de entrenamiento ──────────────────────────────────────────────────
// Clave de storage: "sessions:YYYY-MM-DD"
// draft=true mientras la sesión está en curso; false cuando se finaliza.

export interface Session {
  fecha: string           // YYYY-MM-DD
  tipo_sesion: string     // SessionId: 'push-a' | 'pull-a' | 'legs-a' | 'push-b' | 'pull-b' | 'legs-b' | 'rest'
  nombre_sesion: string   // nombre legible: 'Push A', 'Pull B', etc.
  bloque: number
  semana: number
  dia: number
  duracion_min: number    // minutos efectivos; 0 mientras draft
  notas: string
  draft?: boolean         // true = en progreso, false = finalizada
  rutina_id?: string      // set para sesiones de rutina custom; null/absent para programa fijo
  ejercicios: EjercicioEnSesion[]
}

export interface EjercicioEnSesion {
  nombre: string
  meta: MetaEjercicio
  series: SerieRealizada[]
}

// MetaEjercicio usa camelCase porque se copia directamente de data.js (programa estático)
export interface MetaEjercicio {
  repsLabel: string   // '6–10', 'AMRAP', '20–40 seg', etc.
  rir: string         // '2', '1–2', '—', etc.
  restSec: number     // segundos de descanso
  note?: string
}

// reps/peso/rir se guardan como string porque vienen directo del value de <input>.
// Al leerlos para cálculos, el source usa Number(s.reps).
export interface SerieRealizada {
  reps: string
  peso: string
  rir: string
  completada: boolean
}

// ─── Nutrición diaria ─────────────────────────────────────────────────────────
// Clave de storage: "nutrition:YYYY-MM-DD"

export interface Nutrition {
  proteina_g: number
  calorias_estimadas: number
  agua_litros: number
  comidas: Comida[]
}

export interface Comida {
  id: string
  nombre: string
  proteina_g: number
  t: number   // Unix timestamp en milisegundos (Date.now())
}

// ─── Movilidad diaria ─────────────────────────────────────────────────────────
// Clave de storage: "mobility:YYYY-MM-DD"
// items: cada clave es un id de MobilityExercise (de @/data), valor = si se hizo

export interface Mobility {
  completada: boolean
  items: { [ejercicioId: string]: boolean }
}

// ─── Rutinas custom ───────────────────────────────────────────────────────
// Clave de storage: "rutinas:{id}"
// ejercicios: array embebido como jsonb, igual que sesiones.ejercicios.

export interface RutinaEjercicio {
  nombre: string             // nombre del ejercicio en español
  exercisedb_id?: string     // id de ExerciseDB para el GIF, opcional
  series_objetivo?: number
  reps_objetivo?: string     // string libre: '8–12', 'AMRAP', etc. (modo 'reps')
  nota?: string
  modo?: 'reps' | 'tiempo'  // default implícito: 'reps' si ausente
  duracion_seg?: number      // segundos por serie; solo aplica en modo 'tiempo'
  descanso_seg?: number      // descanso tras el ejercicio en segundos; default 45
}

export interface Rutina {
  id: string
  nombre: string
  descripcion: string
  ejercicios: RutinaEjercicio[]
  creada_en: string          // ISO 8601; lo provee Supabase al insertar
  // user_id no va en el tipo de dominio — lo maneja el adapter via sesión
}

// ─── Configuración de la app ──────────────────────────────────────────────────
// Clave de storage: "settings"

export interface AppSettings {
  tema: 'light' | 'dark' | 'system'
  notifsActivas?: boolean
  apiKeys?: {
    exercisedb?: string
  }
}
