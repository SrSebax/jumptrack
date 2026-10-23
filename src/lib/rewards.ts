import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DayMark, type LifePurchase, type Workout } from '../db'
import { syncCloud } from './cloud'
import { weekStart } from './dates'

/** Una vida cuesta más o menos día y medio de meta (1.000 saltos en series ≈ 140 puntos). */
export const LIFE_COST = 200
export const MAX_LIVES = 2
export const DEFAULT_REST_DAYS_PER_WEEK = 1
export const MAX_REST_DAYS_PER_WEEK = 3
const REST_KEY = 'restDaysPerWeek'

/** 1 punto cada 10 saltos, 5 por serie completada y 2 por minuto activo. */
export function workoutPoints(w: Pick<Workout, 'jumps' | 'setsCompleted' | 'durationMs'>): number {
  return Math.floor(w.jumps / 10) + w.setsCompleted * 5 + Math.floor(w.durationMs / 60_000) * 2
}

export interface Wallet {
  points: number
  lives: number
}

/**
 * Puntos ganados menos gastados, y vidas compradas menos usadas.
 * Una vida gastada en un día que al final sí se entrenó (p. ej. llegó de otro celular) se devuelve.
 */
export function wallet(workouts: Workout[], purchases: LifePurchase[], marks: DayMark[]): Wallet {
  const trained = new Set(workouts.filter((w) => w.jumps > 0).map((w) => w.epochDay))
  const earned = workouts.reduce((sum, w) => sum + workoutPoints(w), 0)
  const spent = purchases.reduce((sum, p) => sum + p.cost, 0)
  const used = marks.filter((m) => m.kind === 'life' && !m.deleted && !trained.has(m.epochDay)).length
  return { points: Math.max(0, earned - spent), lives: Math.max(0, purchases.length - used) }
}

/** Descansos ya puestos en la semana de [day]. Los días que al final se entrenaron no gastan descanso. */
export function restsInWeek(restDays: Set<number>, trained: Set<number>, day: number): number {
  const monday = weekStart(day)
  return [...restDays].filter((d) => d >= monday && d < monday + 7 && !trained.has(d)).length
}

export function useRestDaysPerWeek(): number {
  return useLiveQuery(() => db.settings.get(REST_KEY), [])?.value ?? DEFAULT_REST_DAYS_PER_WEEK
}

export function setRestDaysPerWeek(value: number): Promise<unknown> {
  return db.settings.put({ key: REST_KEY, value })
}

/** Compra una vida si alcanzan los puntos. Revisa el saldo dentro de la transacción para no gastar de más. */
export async function buyLife(): Promise<boolean> {
  const bought = await db.transaction('rw', db.workouts, db.lifePurchases, db.dayMarks, async () => {
    const current = wallet(await db.workouts.toArray(), await db.lifePurchases.toArray(), await db.dayMarks.toArray())
    if (current.points < LIFE_COST || current.lives >= MAX_LIVES) return false
    await db.lifePurchases.add({ createdAt: Date.now(), cost: LIFE_COST })
    return true
  })
  if (bought) void syncCloud()
  return bought
}

export async function setRestDay(epochDay: number, rest: boolean): Promise<void> {
  await db.dayMarks.put({ epochDay, kind: 'rest', updatedAt: Date.now(), deleted: !rest })
  void syncCloud()
}
