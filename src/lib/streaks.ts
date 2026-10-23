/**
 * Los descansos suman a la racha igual que los días entrenados; las vidas solo evitan
 * que se corte. Una racha necesita al menos un día entrenado: solo descansos no cuentan.
 */
const NONE = new Set<number>()

export interface StreakRange {
  /** Primer y último día de la racha (start > end si no hay racha). */
  start: number
  end: number
  /** Días entrenados o de descanso dentro del tramo. */
  days: number
}

/**
 * Racha actual: termina hoy, o ayer si hoy todavía no se ha entrenado ni descansado
 * (la racha sigue viva hasta que acabe el día).
 */
export function currentStreakRange(
  trained: Set<number>,
  today: number,
  restDays: Set<number> = NONE,
  lifeDays: Set<number> = NONE,
): StreakRange {
  const counts = (day: number) => trained.has(day) || restDays.has(day)
  const covered = (day: number) => counts(day) || lifeDays.has(day)
  const end = covered(today) ? today : today - 1
  let start = end + 1
  let days = 0
  let anyTrained = false
  for (let day = end; covered(day); day--) {
    if (!counts(day)) continue
    // El tramo empieza en el primer día que cuenta: las vidas sueltas antes no.
    start = day
    days++
    anyTrained ||= trained.has(day)
  }
  return anyTrained ? { start, end, days } : { start: end + 1, end, days: 0 }
}

export function currentStreak(trained: Set<number>, today: number, restDays: Set<number> = NONE, lifeDays: Set<number> = NONE): number {
  return currentStreakRange(trained, today, restDays, lifeDays).days
}

export function bestStreak(trained: Set<number>, restDays: Set<number> = NONE, lifeDays: Set<number> = NONE): number {
  let best = 0
  let run = 0
  let anyTrained = false
  let previous: number | null = null
  for (const day of [...new Set([...trained, ...restDays, ...lifeDays])].sort((a, b) => a - b)) {
    if (previous === null || day !== previous + 1) {
      run = 0
      anyTrained = false
    }
    if (trained.has(day) || restDays.has(day)) run++
    anyTrained ||= trained.has(day)
    if (anyTrained) best = Math.max(best, run)
    previous = day
  }
  return best
}

/**
 * Días sin entrenar entre la racha y hoy que se pueden tapar con vidas.
 * Hoy no cuenta: todavía hay tiempo de entrenar. Si las vidas no alcanzan para
 * todo el hueco, la racha ya se perdió y no se gasta ninguna.
 */
export function daysToSaveWithLives(trained: Set<number>, today: number, protectedDays: Set<number>, lives: number): number[] {
  const covered = (day: number) => trained.has(day) || protectedDays.has(day)
  let last = today - 1
  while (!covered(last) && today - 1 - last < lives) last--
  if (!covered(last) || last === today - 1) return []
  if (currentStreak(trained, last, NONE, protectedDays) === 0) return []
  return Array.from({ length: today - 1 - last }, (_, i) => last + 1 + i)
}
