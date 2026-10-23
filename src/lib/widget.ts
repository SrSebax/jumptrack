import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect } from 'react'
import { useDailyGoal } from './settings'
import { useTheme, type Theme } from './theme'
import { useStats } from './useStats'

export interface WidgetData {
  /**
   * Racha y el último día que la cubre, para que el widget la apague si pasa un día sin entrenar.
   * Los descansos ya planeados y las vidas guardadas la alargan (la app gasta las vidas sola al abrirse).
   */
  streak: number
  streakEndDay: number
  bestStreak: number
  /** Días entrenados de las últimas dos semanas (epochDay), para los puntos de la semana. */
  recentDays: number[]
  /** Descansos y vidas usadas de las últimas dos semanas y los próximos días, que no sean días entrenados. */
  restDays: number[]
  lifeDays: number[]
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

  const recent = (days: Set<number>) =>
    [...days].filter((day) => day > stats.today - 14 && !stats.trainedDays.has(day)).sort((a, b) => a - b)
  const recentDays = [...stats.trainedDays].filter((day) => day > stats.today - 14).sort((a, b) => a - b)
  const restDays = recent(stats.restDays)
  const lifeDays = recent(stats.lifeDays)
  let streakEndDay = stats.streakEnd
  while (stats.restDays.has(streakEndDay + 1)) streakEndDay++
  streakEndDay += stats.lives
  const key = JSON.stringify([
    stats.currentStreak,
    streakEndDay,
    stats.bestStreak,
    recentDays,
    restDays,
    lifeDays,
    stats.todayJumps,
    dailyGoal,
    theme,
  ])

  useEffect(() => {
    if (!stats.loaded || !Capacitor.isNativePlatform()) return
    StreakWidget.update({
      streak: stats.currentStreak,
      streakEndDay,
      bestStreak: stats.bestStreak,
      recentDays,
      restDays,
      lifeDays,
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
