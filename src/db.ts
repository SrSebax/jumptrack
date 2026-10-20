import { Dexie, type EntityTable } from 'dexie'

export type GoalType = 'JUMPS' | 'TIME'

export interface Workout {
  id: number
  /** Inicio del entrenamiento en epoch millis. */
  startedAt: number
  /** Día local del entrenamiento (ver toEpochDay) para agrupar por día. */
  epochDay: number
  /** Tiempo activo saltando, sin pausas ni descansos. */
  durationMs: number
  jumps: number
  setsCompleted: number
  /** 0 = modo libre. */
  setsPlanned: number
  goalType: GoalType | null
  goalValue: number
  /** Máximo de saltos en 60 s seguidos de tiempo activo. Ausente en entrenamientos antiguos. */
  bestMinute?: number
  /** Saltos y tiempo de cada serie completada (solo modo series). */
  setDetails?: SetDetail[]
}

export interface SetDetail {
  jumps: number
  durationMs: number
}

export interface Setting {
  key: string
  value: number
}

export const db = new Dexie('jumptrack') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  workouts: '++id, startedAt, epochDay',
})
db.version(2).stores({
  settings: '&key',
})
