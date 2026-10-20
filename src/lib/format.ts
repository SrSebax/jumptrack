const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** "1:38", "0:45": minutos sin cero a la izquierda. */
export function formatMinSec(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatStopwatch(ms: number): string {
  return `${formatClock(ms)}.${Math.floor((Math.max(0, ms) % 1000) / 100)}`
}

export function jumpsPerMinute(jumps: number, ms: number): number {
  return ms < 1000 ? 0 : Math.round((jumps * 60_000) / ms)
}

export function pluralDays(n: number): string {
  return n === 1 ? '1 día' : `${n} días`
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return capitalize(new Intl.DateTimeFormat('es', options).format(date))
}

/** Miles con punto ("4.820"), también para 4 cifras, como se escribe en Colombia. */
export function formatNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
