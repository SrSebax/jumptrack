import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '../db'
import { todayEpochDay, weekStart } from './dates'
import { bestStreak, currentStreak } from './streaks'

export interface Stats {
  loaded: boolean
  /** Más reciente primero. */
  workouts: Workout[]
  /** Saltos totales por epochDay. */
  dailyTotals: Map<number, number>
  today: number
  todayJumps: number
  /** Saltos de lunes a hoy. */
  weekJumps: number
  /** Récord de saltos en 60 s seguidos. */
  bestMinute: number
  currentStreak: number
  bestStreak: number
}

/** Estadísticas en vivo: se recalculan solas cuando cambia la base de datos. */
export function useStats(): Stats {
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), [])
  const today = todayEpochDay()
  const dailyTotals = new Map<number, number>()
  for (const w of workouts ?? []) dailyTotals.set(w.epochDay, (dailyTotals.get(w.epochDay) ?? 0) + w.jumps)
  const trainedDays = new Set([...dailyTotals].filter(([, jumps]) => jumps > 0).map(([day]) => day))
  return {
    loaded: workouts !== undefined,
    workouts: workouts ?? [],
    dailyTotals,
    today,
    todayJumps: dailyTotals.get(today) ?? 0,
    weekJumps: (workouts ?? []).filter((w) => w.epochDay >= weekStart(today)).reduce((sum, w) => sum + w.jumps, 0),
    bestMinute: Math.max(0, ...(workouts ?? []).map((w) => w.bestMinute ?? 0)),
    currentStreak: currentStreak(trainedDays, today),
    bestStreak: bestStreak(trainedDays),
  }
}
