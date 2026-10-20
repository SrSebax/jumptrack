const DAY_MS = 86_400_000

/** Día local como entero (días desde 1970-01-01), independiente de la zona horaria. */
export function toEpochDay(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

export function fromEpochDay(day: number): Date {
  const utc = new Date(day * DAY_MS)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

export function todayEpochDay(): number {
  return toEpochDay(new Date())
}

/** Lunes de la semana que contiene [day]. */
export function weekStart(day: number): number {
  const weekday = (fromEpochDay(day).getDay() + 6) % 7 // 0 = lunes
  return day - weekday
}
