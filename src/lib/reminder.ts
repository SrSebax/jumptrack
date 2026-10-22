import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db'
import { fromEpochDay } from './dates'
import { formatDate, formatNumber, pluralDays } from './format'
import { useDailyGoal } from './settings'
import { useStats } from './useStats'

/** Minutos desde medianoche; ausente = recordatorio apagado. */
const KEY = 'reminderMinutes'
export const DEFAULT_REMINDER_MINUTES = 19 * 60
/** Se programan varios días por si la app no se abre; al abrirla se reprograman con datos frescos. */
const DAYS_AHEAD = 7
const CHANNEL = 'reminders'

export function useReminderMinutes(): number | null | undefined {
  // undefined = cargando; null = apagado.
  const setting = useLiveQuery(async () => (await db.settings.get(KEY)) ?? null, [])
  return setting === undefined ? undefined : (setting?.value ?? null)
}

export function formatReminderTime(minutes: number): string {
  return formatDate(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60), { hour: 'numeric', minute: '2-digit' })
}

/** Enciende el recordatorio pidiendo permiso de notificaciones. Devuelve false si el usuario lo niega. */
export async function enableReminder(minutes: number): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { display } = await LocalNotifications.requestPermissions()
    if (display !== 'granted') return false
  }
  await db.settings.put({ key: KEY, value: minutes })
  return true
}

export function disableReminder(): Promise<unknown> {
  return db.settings.delete(KEY)
}

/** Reprograma las notificaciones cada vez que cambian los saltos de hoy, la meta, la racha o la hora. */
export function useReminderSync(): void {
  const stats = useStats()
  const dailyGoal = useDailyGoal()
  const minutes = useReminderMinutes()
  const key = JSON.stringify([stats.today, stats.todayJumps, stats.currentStreak, dailyGoal, minutes])

  useEffect(() => {
    if (!stats.loaded || minutes === undefined || !Capacitor.isNativePlatform()) return
    void schedule(minutes, stats.today, stats.todayJumps, stats.currentStreak, dailyGoal).catch(() => {
      // Si falla (p. ej. sin permiso), la app sigue igual.
    })
    // `key` resume todos los datos: solo se reprograma cuando algo cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stats.loaded])
}

async function schedule(minutes: number | null, today: number, todayJumps: number, streak: number, goal: number) {
  const ids = Array.from({ length: DAYS_AHEAD }, (_, i) => i + 1)
  await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  if (minutes === null) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return

  await LocalNotifications.createChannel({ id: CHANNEL, name: 'Recordatorio diario', importance: 4 })
  const now = Date.now()
  const notifications = []
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = fromEpochDay(today + i)
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    if (at.getTime() <= now) continue
    if (i === 0 && todayJumps >= goal) continue
    notifications.push({ id: ids[i], channelId: CHANNEL, schedule: { at, allowWhileIdle: true }, ...message(i === 0, todayJumps, streak, goal) })
  }
  if (notifications.length > 0) await LocalNotifications.schedule({ notifications })
}

function message(isToday: boolean, todayJumps: number, streak: number, goal: number) {
  if (isToday && todayJumps > 0) {
    return { title: '¡Ya casi!', body: `Te faltan ${formatNumber(goal - todayJumps)} saltos para tu meta de hoy.` }
  }
  if (isToday && streak > 0) {
    return { title: '¡No pierdas tu racha!', body: `Llevas ${pluralDays(streak)}. Salta hoy para mantenerla.` }
  }
  return { title: '¡Hora de saltar!', body: `Tu meta de hoy: ${formatNumber(goal)} saltos.` }
}
