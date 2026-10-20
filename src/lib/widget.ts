import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect } from 'react'
import { useDailyGoal } from './settings'
import { useTheme, type Theme } from './theme'
import { useStats } from './useStats'

export interface WidgetData {
  /** Racha y el día en que termina, para que el widget la apague si pasa un día sin entrenar. */
  streak: number
  streakEndDay: number
  bestStreak: number
  /** Días entrenados de las últimas dos semanas (epochDay), para los puntos de la semana. */
  recentDays: number[]
  todayJumps: number
  today: number
  dailyGoal: number
  theme: Theme
}

const StreakWidget = registerPlugin<{ update(data: WidgetData): Promise<void> }>('StreakWidget')

/** Mantiene el widget de la pantalla de inicio al día con la base de datos. Solo en Android. */
export function useWidgetSync(): void {
  const stats = useStats()
  const dailyGoal = useDailyGoal()
  const theme = useTheme()

  const recentDays = [...stats.dailyTotals]
    .filter(([day, jumps]) => jumps > 0 && day > stats.today - 14)
    .map(([day]) => day)
    .sort((a, b) => a - b)
  const streakEndDay = (stats.dailyTotals.get(stats.today) ?? 0) > 0 ? stats.today : stats.today - 1
  const key = JSON.stringify([stats.currentStreak, streakEndDay, stats.bestStreak, recentDays, stats.todayJumps, dailyGoal, theme])

  useEffect(() => {
    if (!stats.loaded || !Capacitor.isNativePlatform()) return
    StreakWidget.update({
      streak: stats.currentStreak,
      streakEndDay,
      bestStreak: stats.bestStreak,
      recentDays,
      todayJumps: stats.todayJumps,
      today: stats.today,
      dailyGoal,
      theme,
    }).catch(() => {
      // El widget es opcional: si falla, la app sigue igual.
    })
    // `key` resume todos los datos: solo se actualiza el widget cuando algo cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stats.loaded])
}
