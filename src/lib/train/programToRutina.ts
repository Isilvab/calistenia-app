import type { Session as DataSession } from '@/data/routines'
import type { Rutina, RutinaEjercicio } from '@/types'
import { getGifIdForExercise } from '@/data/exerciseGifMap'

// Detect time-based exercises from repsLabel patterns like "20–40 seg", "30 seg / lado".
// Returns { modo: 'tiempo', duracion_seg } on match; 'reps' otherwise.
// Ambiguous cases (e.g. just a number) default to 'reps' — never break the flow.
function detectMode(repsLabel: string): { modo: 'reps' | 'tiempo'; duracion_seg?: number } {
  const m = repsLabel.match(/(\d+)\s*(?:[–\-]\s*(\d+))?\s*seg/)
  if (m) {
    const lo = parseInt(m[1], 10)
    const hi = m[2] ? parseInt(m[2], 10) : lo
    return { modo: 'tiempo', duracion_seg: Math.round((lo + hi) / 2) }
  }
  return { modo: 'reps' }
}

/**
 * Converts a static-program DataSession into the Rutina shape that RutinaGuiada
 * knows how to train — no modifications to TRAINING_PROGRAM or its types.
 *
 * The synthetic id `programa-${dataSession.id}` is stable across blocks, so
 * getUltimaSesionDeRutina("programa-push-b") would find past program sessions of
 * the same session type.  (Program sessions are actually saved without rutina_id;
 * prev-performance lookup is handled separately via listSessions() in RutinaGuiada.)
 */
export function sessionToRutina(dataSession: DataSession): Rutina {
  const ejercicios: RutinaEjercicio[] = dataSession.exercises.map(ex => {
    const { modo, duracion_seg } = detectMode(ex.repsLabel)
    const gifId = getGifIdForExercise(ex.name)
    const ej: RutinaEjercicio = {
      nombre:          ex.name,
      series_objetivo: ex.sets,
      descanso_seg:    ex.restSec,
      modo,
    }
    if (ex.note)                              ej.nota          = ex.note
    if (gifId)                                ej.exercisedb_id = gifId
    if (modo === 'reps')                      ej.reps_objetivo = ex.repsLabel
    if (modo === 'tiempo' && duracion_seg !== undefined) ej.duracion_seg = duracion_seg
    return ej
  })

  return {
    id:         `programa-${dataSession.id}`,
    nombre:     dataSession.name,
    descripcion: dataSession.focus,
    ejercicios,
    creada_en:  new Date().toISOString(),
  }
}
