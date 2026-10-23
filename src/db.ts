import { Dexie, type EntityTable, type Table } from 'dexie'

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

export type DayMarkKind = 'rest' | 'life'

/** Día sin entrenar que no rompe la racha: descanso planeado o vida gastada. */
export interface DayMark {
  epochDay: number
  kind: DayMarkKind
  updatedAt: number
  /** Marca quitada (solo descansos); se guarda borrada para que la nube también la quite. */
  deleted?: boolean
}

/** Vida comprada con puntos. Los puntos gastados son la suma de `cost`. */
export interface LifePurchase {
  createdAt: number
  cost: number
}

export interface Setting {
  key: string
  value: number
}

export const db = new Dexie('jumptrack') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  settings: EntityTable<Setting, 'key'>
  deletedWorkouts: EntityTable<DeletedWorkout, 'startedAt'>
  dayMarks: Table<DayMark, number>
  lifePurchases: Table<LifePurchase, number>
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
db.version(4).stores({
  dayMarks: '&epochDay',
  lifePurchases: '&createdAt',
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
