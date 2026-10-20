/**
 * Racha actual: días consecutivos entrenados terminando hoy, o ayer si hoy
 * todavía no se ha entrenado (la racha sigue viva hasta que acabe el día).
 */
export function currentStreak(days: Set<number>, today: number): number {
  let end: number
  if (days.has(today)) end = today
  else if (days.has(today - 1)) end = today - 1
  else return 0
  let count = 0
  while (days.has(end - count)) count++
  return count
}

export function bestStreak(days: Set<number>): number {
  let best = 0
  let run = 0
  let previous: number | null = null
  for (const day of [...days].sort((a, b) => a - b)) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}
