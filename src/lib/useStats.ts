import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '../db'
import { todayEpochDay, weekStart } from './dates'
import { wallet } from './rewards'
import { bestStreak, currentStreakRange } from './streaks'

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
  trainedDays: Set<number>
  /** Días de descanso planeados (pueden ser futuros). */
  restDays: Set<number>
  /** Días salvados con una vida. */
  lifeDays: Set<number>
  /** Descansos y vidas: no rompen la racha (los descansos además suman). */
  protectedDays: Set<number>
  currentStreak: number
  /** Primer y último día de la racha actual (start > end si no hay racha). */
  streakStart: number
  streakEnd: number
  bestStreak: number
  points: number
  lives: number
}

/** Estadísticas en vivo: se recalculan solas cuando cambia la base de datos. */
export function useStats(): Stats {
  // Una sola consulta: si llegaran por separado, la pantalla se pintaría un instante sin descansos ni vidas.
  const data = useLiveQuery(
    () =>
      Promise.all([
        db.workouts.orderBy('startedAt').reverse().toArray(),
        db.dayMarks.filter((m) => !m.deleted).toArray(),
        db.lifePurchases.toArray(),
      ]),
    [],
  )
  const [workouts, marks, purchases] = data ?? []
  const today = todayEpochDay()
  const dailyTotals = new Map<number, number>()
  for (const w of workouts ?? []) dailyTotals.set(w.epochDay, (dailyTotals.get(w.epochDay) ?? 0) + w.jumps)
  const trainedDays = new Set([...dailyTotals].filter(([, jumps]) => jumps > 0).map(([day]) => day))
  const restDays = new Set((marks ?? []).filter((m) => m.kind === 'rest').map((m) => m.epochDay))
  const lifeDays = new Set((marks ?? []).filter((m) => m.kind === 'life').map((m) => m.epochDay))
  const protectedDays = new Set([...restDays, ...lifeDays])
  const streak = currentStreakRange(trainedDays, today, restDays, lifeDays)
  const { points, lives } = wallet(workouts ?? [], purchases ?? [], marks ?? [])
  return {
    loaded: data !== undefined,
    workouts: workouts ?? [],
    dailyTotals,
    today,
    todayJumps: dailyTotals.get(today) ?? 0,
    weekJumps: (workouts ?? []).filter((w) => w.epochDay >= weekStart(today)).reduce((sum, w) => sum + w.jumps, 0),
    bestMinute: Math.max(0, ...(workouts ?? []).map((w) => w.bestMinute ?? 0)),
    trainedDays,
    restDays,
    lifeDays,
    protectedDays,
    currentStreak: streak.days,
    streakStart: streak.start,
    streakEnd: streak.end,
    // Los descansos ya planeados para días futuros todavía no cuentan.
    bestStreak: bestStreak(trainedDays, new Set([...restDays].filter((day) => day <= today)), lifeDays),
    points,
    lives,
  }
}
