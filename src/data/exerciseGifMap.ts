/**
 * Diccionario manual: nombre EXACTO en español (del TRAINING_PROGRAM) → id de ExerciseDB.
 * IDs vacíos ('') = pendiente de completar manualmente via /buscar.
 * Comentarios con términos de búsqueda en inglés para encontrar el id correcto.
 *
 * Total: 40 ejercicios únicos del programa (3 bloques, todas las sesiones).
 *
 * CÓMO COMPLETAR:
 * 1. Ir a /buscar en la app.
 * 2. Buscar con los términos sugeridos en el comentario.
 * 3. Copiar el id del resultado correcto y pegarlo como valor del string.
 */
export const EXERCISE_GIF_MAP: Record<string, string> = {
  // ─── Push A ────────────────────────────────────────────────────────────────
  'Pike push-up':                                           '', // buscar: "pike push up"
  'Flexión estándar (tempo 3-1-1-0)':                      '', // buscar: "push up" / "standard push up"
  'Fondos en silla / paralelas':                           '', // buscar: "dips" / "tricep dips" / "chair dip"
  'Flexión diamante':                                      '', // buscar: "diamond push up" / "close grip push up"

  // ─── Pull A ────────────────────────────────────────────────────────────────
  'Dominada prona':                                        '', // buscar: "pull up" / "overhand pull up"
  'Remo invertido (pies elevados si puedes)':              '', // buscar: "inverted row" / "australian pull up"
  'Dominada supina':                                       '', // buscar: "chin up" / "underhand pull up"
  'Curl con mancuernas':                                   '', // buscar: "dumbbell curl" / "bicep curl"

  // ─── Piernas A ─────────────────────────────────────────────────────────────
  'Sentadilla búlgara con mancuernas':                     '', // buscar: "bulgarian split squat" / "dumbbell split squat"
  'Peso muerto rumano con mancuernas':                     '', // buscar: "romanian deadlift" / "dumbbell RDL"
  'Puente glúteo a una pierna':                            '', // buscar: "single leg glute bridge" / "single leg hip thrust"
  'Hollow body hold':                                      '', // buscar: "hollow body hold" / "hollow hold"
  'Plancha lateral':                                       '', // buscar: "side plank"

  // ─── Push B ────────────────────────────────────────────────────────────────
  'Pike push-up con pies elevados':                        '', // buscar: "elevated pike push up" / "feet elevated pike"
  'Press mancuernas en el suelo':                          '', // buscar: "dumbbell floor press" / "floor press"
  'Flexión declinada (pies en silla)':                     '', // buscar: "decline push up" / "feet elevated push up"
  'Extensión tríceps con mancuerna':                       '', // buscar: "dumbbell tricep extension" / "overhead tricep extension"

  // ─── Pull B ────────────────────────────────────────────────────────────────
  'Dominada supina (chin-up)':                             '', // buscar: "chin up" / "underhand pull up"
  'Remo a una mano con mancuerna':                         '', // buscar: "dumbbell row" / "single arm row"
  'Dominada agarre neutro o ancha':                        '', // buscar: "neutral grip pull up" / "wide grip pull up" / "hammer pull up"
  'Curl martillo':                                         '', // buscar: "hammer curl" / "dumbbell hammer curl"
  'Face pulls / YTW livianos':                             '', // buscar: "face pull" / "YTW" / "band pull apart"

  // ─── Piernas B ─────────────────────────────────────────────────────────────
  'Sentadilla goblet con mancuerna':                       '', // buscar: "goblet squat" / "dumbbell goblet squat"
  'Zancadas reversas con mancuernas':                      '', // buscar: "reverse lunge" / "dumbbell reverse lunge"
  'Elevación de talón a una pierna':                       '', // buscar: "single leg calf raise" / "calf raise"
  'Toes-to-bar o leg raises colgado':                      '', // buscar: "toes to bar" / "hanging leg raise" / "knee raise"
  'Dead bug':                                              '', // buscar: "dead bug"

  // ─── Bloque 2 — nuevos ejercicios ──────────────────────────────────────────
  'Pike push-up pies elevados altos':                      '', // buscar: "pike push up elevated" / "high feet pike push up"
  'Dominada prona (con mochila si llegas a 10)':           '', // buscar: "weighted pull up" / "pull up"
  'Remo invertido pies elevados':                          '', // buscar: "inverted row feet elevated" / "elevated inverted row"
  'Pistol squat asistido (bajada lenta)':                  '', // buscar: "pistol squat" / "assisted pistol squat"
  'Tuck L-sit progresivo':                                 '', // buscar: "L-sit" / "tuck L-sit" / "parallel bar L-sit"
  'Archer pull-ups':                                       '', // buscar: "archer pull up"
  'Nordic curl negativo asistido':                         '', // buscar: "nordic curl" / "nordic hamstring curl" / "negative nordic"
  'L-sit una pierna extendida':                            '', // buscar: "L-sit" / "one leg L-sit"

  // ─── Bloque 3 — skill work ─────────────────────────────────────────────────
  'Skill — transición muscle-up (banda / negativas)':      '', // buscar: "muscle up" / "muscle-up transition"
  'Skill — handstand contra pared':                        '', // buscar: "wall handstand" / "handstand"
  'Skill — front lever (tuck → advanced → straddle)':      '', // buscar: "front lever" / "tuck front lever"
  'Skill — pistol squat completo':                         '', // buscar: "pistol squat"
  'Skill — shrimp squat asistido':                         '', // buscar: "shrimp squat" / "assisted shrimp squat"
}

/** Normaliza para comparar tolerando mayúsculas, acentos y espacios extra. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Índice normalizado construido una vez al cargar el módulo
const NORMALIZED_INDEX: Map<string, string> = new Map(
  Object.entries(EXERCISE_GIF_MAP).map(([name, id]) => [normalize(name), id])
)

/**
 * Busca el id de ExerciseDB para un nombre de ejercicio en español.
 * Tolera diferencias de mayúsculas, acentos y espacios.
 * Devuelve null si no hay entrada o si el id está vacío (pendiente de mapear).
 */
export function getGifIdForExercise(nombre: string): string | null {
  const id = NORMALIZED_INDEX.get(normalize(nombre))
  if (!id) return null  // undefined (no existe) o '' (vacío = pendiente) → null
  return id
}
