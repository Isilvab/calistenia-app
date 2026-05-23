/**
 * Shape confirmado del endpoint /exercises/name/{name} de ExerciseDB.
 * Campos opcionales: presentes en algunos ejercicios o planes según suscripción.
 */
export interface Exercise {
  id: string
  name: string
  bodyPart: string
  equipment: string
  target: string
  secondaryMuscles: string[]
  instructions: string[]
  description?: string
  difficulty?: string
  category?: string
}

/** Respuesta cruda de un ejercicio de ExerciseDB (shape desconocido hasta la primera llamada real). */
export type ExerciseRaw = Record<string, unknown>

/** Resultado de cualquier llamada de prueba a la API. */
export interface PingResult {
  ok: boolean
  status: number
  raw: unknown
  error?: string
}
