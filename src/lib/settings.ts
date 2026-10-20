import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export const DEFAULT_DAILY_GOAL = 1000

export function useDailyGoal(): number {
  return useLiveQuery(() => db.settings.get('dailyGoal'), [])?.value ?? DEFAULT_DAILY_GOAL
}

export function setDailyGoal(value: number): Promise<unknown> {
  return db.settings.put({ key: 'dailyGoal', value })
}
