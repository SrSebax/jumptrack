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
  /** Última edición manual (epoch millis), para resolver conflictos al sincronizar. */
  updatedAt?: number
}

export interface SetDetail {
  jumps: number
  durationMs: number
}

/** Entrenamiento borrado que falta avisar a la nube. */
export interface DeletedWorkout {
  startedAt: number
}

export interface Setting {
  key: string
  value: number
}

export const db = new Dexie('jumptrack') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  settings: EntityTable<Setting, 'key'>
  deletedWorkouts: EntityTable<DeletedWorkout, 'startedAt'>
}

db.version(1).stores({
  workouts: '++id, startedAt, epochDay',
})
db.version(2).stores({
  settings: '&key',
})
db.version(3).stores({
  deletedWorkouts: '&startedAt',
})

/** Corrige los saltos de un entrenamiento (la cámara a veces cuenta de más o de menos). */
export function updateWorkoutJumps(id: number, jumps: number): Promise<unknown> {
  return db.workouts.update(id, { jumps, updatedAt: Date.now() })
}

export function deleteWorkout(workout: Workout): Promise<unknown> {
  return db.transaction('rw', db.workouts, db.deletedWorkouts, async () => {
    await db.workouts.delete(workout.id)
    await db.deletedWorkouts.put({ startedAt: workout.startedAt })
  })
}
