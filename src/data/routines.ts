// Static training program data — 12-week calisthenics program
// Each session: { id, name, focus, exercises:[{ name, sets, repsLabel, restSec, rir, note? }] }

export interface Exercise {
  name: string
  sets: number
  repsLabel: string   // '6–10', 'AMRAP', '20–40 seg', '10 / pierna', etc.
  restSec: number
  rir: string         // '2', '1–2', '0–1', '1', '—' (isometric holds use '—')
  note?: string
}

export type SessionId = 'push-a' | 'pull-a' | 'legs-a' | 'push-b' | 'pull-b' | 'legs-b' | 'rest'

export interface Session {
  id: SessionId
  name: string
  focus: string
  rest?: boolean
  exercises: Exercise[]
}

export interface Block {
  id: number
  name: string
  subtitle: string
  weeks: number[]
  sessions: Session[]
}

export interface ProgressionRule {
  week: string
  text: string
}

// ─── Bloque 1 — Base de fuerza e hipertrofia ─────────────────────────────────

const B1_PUSH_A: Session = {
  id: 'push-a', name: 'Push A', focus: 'Empuje · Hipertrofia',
  exercises: [
    { name: 'Pike push-up', sets: 4, repsLabel: '6–10', restSec: 90, rir: '2' },
    { name: 'Flexión estándar (tempo 3-1-1-0)', sets: 3, repsLabel: 'AMRAP', restSec: 75, rir: '1–2' },
    { name: 'Fondos en silla / paralelas', sets: 3, repsLabel: '8–12', restSec: 75, rir: '1–2' },
    { name: 'Flexión diamante', sets: 2, repsLabel: 'AMRAP', restSec: 60, rir: '0–1' },
  ],
}

const B1_PULL_A: Session = {
  id: 'pull-a', name: 'Pull A', focus: 'Tracción · Fuerza',
  exercises: [
    { name: 'Dominada prona', sets: 5, repsLabel: '4–6', restSec: 120, rir: '2' },
    { name: 'Remo invertido (pies elevados si puedes)', sets: 3, repsLabel: '8–12', restSec: 90, rir: '1–2' },
    { name: 'Dominada supina', sets: 3, repsLabel: 'AMRAP', restSec: 90, rir: '1' },
    { name: 'Curl con mancuernas', sets: 3, repsLabel: '10–12', restSec: 60, rir: '0–1' },
  ],
}

const B1_LEGS_A: Session = {
  id: 'legs-a', name: 'Piernas A', focus: 'Unilateral · Core',
  exercises: [
    { name: 'Sentadilla búlgara con mancuernas', sets: 4, repsLabel: '8–10 / pierna', restSec: 90, rir: '2' },
    { name: 'Peso muerto rumano con mancuernas', sets: 3, repsLabel: '10–12', restSec: 90, rir: '1–2' },
    { name: 'Puente glúteo a una pierna', sets: 3, repsLabel: '10 / pierna', restSec: 60, rir: '1' },
    { name: 'Hollow body hold', sets: 3, repsLabel: '20–40 seg', restSec: 45, rir: '—' },
    { name: 'Plancha lateral', sets: 2, repsLabel: '30 seg / lado', restSec: 30, rir: '—' },
  ],
}

const B1_PUSH_B: Session = {
  id: 'push-b', name: 'Push B', focus: 'Empuje · Vertical',
  exercises: [
    { name: 'Pike push-up con pies elevados', sets: 4, repsLabel: '5–8', restSec: 120, rir: '2' },
    { name: 'Press mancuernas en el suelo', sets: 3, repsLabel: '8–12', restSec: 90, rir: '1–2' },
    { name: 'Flexión declinada (pies en silla)', sets: 3, repsLabel: 'AMRAP', restSec: 75, rir: '1' },
    { name: 'Extensión tríceps con mancuerna', sets: 3, repsLabel: '10–12', restSec: 60, rir: '0–1' },
  ],
}

const B1_PULL_B: Session = {
  id: 'pull-b', name: 'Pull B', focus: 'Tracción · Bíceps',
  exercises: [
    { name: 'Dominada supina (chin-up)', sets: 5, repsLabel: '4–6', restSec: 120, rir: '2' },
    { name: 'Remo a una mano con mancuerna', sets: 3, repsLabel: '10–12 / brazo', restSec: 75, rir: '1–2' },
    { name: 'Dominada agarre neutro o ancha', sets: 3, repsLabel: 'AMRAP', restSec: 90, rir: '1' },
    { name: 'Curl martillo', sets: 2, repsLabel: '10–12', restSec: 60, rir: '0–1' },
    { name: 'Face pulls / YTW livianos', sets: 2, repsLabel: '12–15', restSec: 45, rir: '1' },
  ],
}

const B1_LEGS_B: Session = {
  id: 'legs-b', name: 'Piernas B', focus: 'Bilateral · Gemelos · Core',
  exercises: [
    { name: 'Sentadilla goblet con mancuerna', sets: 4, repsLabel: '10–12', restSec: 90, rir: '2' },
    { name: 'Zancadas reversas con mancuernas', sets: 3, repsLabel: '10 / pierna', restSec: 75, rir: '1–2' },
    { name: 'Elevación de talón a una pierna', sets: 3, repsLabel: '12–15', restSec: 45, rir: '1' },
    { name: 'Toes-to-bar o leg raises colgado', sets: 3, repsLabel: '8–12', restSec: 60, rir: '1' },
    { name: 'Dead bug', sets: 3, repsLabel: '10 / lado', restSec: 30, rir: '—' },
  ],
}

const REST_DAY: Session = {
  id: 'rest', name: 'Descanso', focus: 'Recuperación activa', rest: true,
  exercises: [],
}

// ─── Bloque 2 — Intensificación ───────────────────────────────────────────────

const B2_PUSH_A: Session = {
  ...B1_PUSH_A, focus: 'Empuje · Intensificación',
  exercises: [
    { name: 'Pike push-up pies elevados altos', sets: 4, repsLabel: '5–8', restSec: 120, rir: '2', note: 'Camino a HSPU' },
    { name: 'Flexión estándar (tempo 3-1-1-0)', sets: 3, repsLabel: 'AMRAP', restSec: 75, rir: '1–2' },
    { name: 'Fondos en silla / paralelas', sets: 3, repsLabel: '8–12', restSec: 75, rir: '1–2' },
    { name: 'Flexión diamante', sets: 2, repsLabel: 'AMRAP', restSec: 60, rir: '0–1' },
  ],
}

const B2_PULL_A: Session = {
  ...B1_PULL_A, focus: 'Tracción · Carga progresiva',
  exercises: [
    { name: 'Dominada prona (con mochila si llegas a 10)', sets: 5, repsLabel: '5 con peso / 4–6 sin', restSec: 120, rir: '2' },
    { name: 'Remo invertido pies elevados', sets: 3, repsLabel: '8–12', restSec: 90, rir: '1–2' },
    { name: 'Dominada supina', sets: 3, repsLabel: 'AMRAP', restSec: 90, rir: '1' },
    { name: 'Curl con mancuernas', sets: 3, repsLabel: '10–12', restSec: 60, rir: '0–1' },
  ],
}

const B2_LEGS_A: Session = {
  ...B1_LEGS_A, focus: 'Unilateral · Pistol',
  exercises: [
    { name: 'Pistol squat asistido (bajada lenta)', sets: 4, repsLabel: '5 / pierna', restSec: 120, rir: '2' },
    { name: 'Peso muerto rumano con mancuernas', sets: 3, repsLabel: '10–12', restSec: 90, rir: '1–2' },
    { name: 'Puente glúteo a una pierna', sets: 3, repsLabel: '10 / pierna', restSec: 60, rir: '1' },
    { name: 'Tuck L-sit progresivo', sets: 3, repsLabel: '15–30 seg', restSec: 60, rir: '—' },
    { name: 'Plancha lateral', sets: 2, repsLabel: '30 seg / lado', restSec: 30, rir: '—' },
  ],
}

// Bloque 2 Push B = mismo que Bloque 1 Push B (sin cambios)
const B2_PUSH_B: Session = B1_PUSH_B

const B2_PULL_B: Session = {
  ...B1_PULL_B, focus: 'Tracción · Archer',
  exercises: [
    { name: 'Dominada supina (chin-up)', sets: 5, repsLabel: '4–6', restSec: 120, rir: '2' },
    { name: 'Archer pull-ups', sets: 3, repsLabel: '3–5 / lado', restSec: 120, rir: '2' },
    { name: 'Remo a una mano con mancuerna', sets: 3, repsLabel: '10–12 / brazo', restSec: 75, rir: '1–2' },
    { name: 'Curl martillo', sets: 2, repsLabel: '10–12', restSec: 60, rir: '0–1' },
    { name: 'Face pulls / YTW livianos', sets: 2, repsLabel: '12–15', restSec: 45, rir: '1' },
  ],
}

const B2_LEGS_B: Session = {
  ...B1_LEGS_B, focus: 'Posterior · Nordic',
  exercises: [
    { name: 'Sentadilla goblet con mancuerna', sets: 4, repsLabel: '10–12', restSec: 90, rir: '2' },
    { name: 'Nordic curl negativo asistido', sets: 3, repsLabel: '5', restSec: 120, rir: '2' },
    { name: 'Zancadas reversas con mancuernas', sets: 3, repsLabel: '10 / pierna', restSec: 75, rir: '1–2' },
    { name: 'Elevación de talón a una pierna', sets: 3, repsLabel: '12–15', restSec: 45, rir: '1' },
    { name: 'L-sit una pierna extendida', sets: 3, repsLabel: '10–20 seg', restSec: 60, rir: '—' },
  ],
}

// ─── Bloque 3 — Habilidades específicas ──────────────────────────────────────
// Skill work se añade al INICIO de cada sesión (SNC fresco)

const B3_PUSH_A: Session = {
  ...B2_PUSH_A, focus: 'Skill: muscle-up + handstand',
  exercises: [
    { name: 'Skill — transición muscle-up (banda / negativas)', sets: 4, repsLabel: '3 reps', restSec: 90, rir: '—', note: '8–10 min con SNC fresco' },
    { name: 'Skill — handstand contra pared', sets: 3, repsLabel: '20–40 seg', restSec: 60, rir: '—' },
    ...B2_PUSH_A.exercises,
  ],
}

const B3_PULL_A: Session = {
  ...B2_PULL_A, focus: 'Skill: front lever',
  exercises: [
    { name: 'Skill — front lever (tuck → advanced → straddle)', sets: 5, repsLabel: '5–15 seg', restSec: 90, rir: '—' },
    ...B2_PULL_A.exercises,
  ],
}

const B3_LEGS_A: Session = {
  ...B2_LEGS_A, focus: 'Skill: pistol completo',
  exercises: [
    { name: 'Skill — pistol squat completo', sets: 4, repsLabel: '3–5 / pierna', restSec: 90, rir: '—' },
    { name: 'Skill — shrimp squat asistido', sets: 3, repsLabel: '3 / pierna', restSec: 90, rir: '—' },
    // .slice(1) elimina 'Pistol squat asistido' de B2 — reemplazado por el skill work
    ...B2_LEGS_A.exercises.slice(1),
  ],
}

// B3 Push B / Pull B / Legs B: mismos ejercicios que B2, solo cambia el focus
const B3_PUSH_B: Session = { ...B2_PUSH_B, focus: 'Push B · Skill HSPU' }
const B3_PULL_B: Session = { ...B2_PULL_B, focus: 'Pull B · Archer + lever' }
const B3_LEGS_B: Session = { ...B2_LEGS_B, focus: 'Piernas B · Pistol + Nordic' }

// ─── Programa completo ────────────────────────────────────────────────────────

export const TRAINING_PROGRAM: Block[] = [
  {
    id: 1, name: 'Bloque 1', subtitle: 'Base de fuerza e hipertrofia',
    weeks: [1, 2, 3, 4],
    sessions: [B1_PUSH_A, B1_PULL_A, B1_LEGS_A, B1_PUSH_B, B1_PULL_B, B1_LEGS_B, REST_DAY],
  },
  {
    id: 2, name: 'Bloque 2', subtitle: 'Intensificación',
    weeks: [5, 6, 7, 8],
    sessions: [B2_PUSH_A, B2_PULL_A, B2_LEGS_A, B2_PUSH_B, B2_PULL_B, B2_LEGS_B, REST_DAY],
  },
  {
    id: 3, name: 'Bloque 3', subtitle: 'Habilidades específicas',
    weeks: [9, 10, 11, 12],
    sessions: [B3_PUSH_A, B3_PULL_A, B3_LEGS_A, B3_PUSH_B, B3_PULL_B, B3_LEGS_B, REST_DAY],
  },
]

// 7-day cycle order
export const DAY_ORDER: SessionId[] = [
  'push-a', 'pull-a', 'legs-a', 'push-b', 'pull-b', 'legs-b', 'rest',
]

export function getSessionForDay(blockIdx: number, dayIdx: number): Session {
  const block = TRAINING_PROGRAM[Math.min(2, Math.max(0, blockIdx - 1))]
  const id = DAY_ORDER[(dayIdx - 1) % 7]
  return block.sessions.find(s => s.id === id) ?? block.sessions[0]
}

// NOTE: source original tenía isDeloadWeek(bloqueIdx, semana) — bloqueIdx nunca se usaba.
// Eliminado para cumplir noUnusedParameters.
export function isDeloadWeek(week: number): boolean {
  // Semana 4 (fin bloque 1), 8 (fin bloque 2), 12 (fin bloque 3) = deload
  return [4, 8, 12].includes(week)
}

export const PROGRESSION_RULES: ProgressionRule[] = [
  { week: 'Semana 1', text: 'Establece tu baseline. Anota todo: reps, peso, RIR.' },
  { week: 'Semana 2', text: 'Suma 1–2 reps por serie respecto a la semana anterior.' },
  { week: 'Semana 3', text: 'Suma 1 rep o añade 1 serie al ejercicio principal.' },
  { week: 'Semana 4', text: 'Deload: 2 series por ejercicio, mismas reps, RIR 3.' },
  { week: 'Si te estancas', text: 'Si en 2 semanas no progresas en reps: cambia variable (tempo, descanso, progresión más dura o añade peso).' },
]

export const QUOTES: string[] = [
  'La constancia es la suma de pequeñas decisiones.',
  'Hoy entrena al que serás en seis meses.',
  'Mejor 25 minutos hoy que 2 horas mañana.',
  'No tienes que ser extremo, solo consistente.',
  'Lo que se mide, mejora.',
  'Una repetición más cuenta.',
  'Calidad antes que cantidad: cada serie como una práctica.',
  'No compares tu día 30 con el día 300 de otro.',
]
