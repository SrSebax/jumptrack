import { useEffect } from 'react'
import { db } from '../db'
import { syncCloud, useCloud } from './cloud'
import { daysToSaveWithLives } from './streaks'
import { useStats } from './useStats'

/**
 * Gasta vidas solas, como Duolingo, cuando falta un día para no perder la racha.
 * Espera a la primera sincronización: el día pudo entrenarse en otro celular.
 */
export function useStreakGuard(): void {
  const stats = useStats()
  const cloud = useCloud()
  const synced = cloud.ready && (!cloud.user || cloud.lastSyncAt !== null || cloud.error !== null)
  const days = stats.loaded && synced ? daysToSaveWithLives(stats.trainedDays, stats.today, stats.protectedDays, stats.lives) : []
  const key = days.join()

  useEffect(() => {
    if (days.length === 0) return
    const now = Date.now()
    void db.dayMarks.bulkPut(days.map((epochDay) => ({ epochDay, kind: 'life' as const, updatedAt: now }))).then(() => syncCloud())
    // `key` resume los días: solo se escribe cuando cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
