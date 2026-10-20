import type { GoalType } from '../db'

export interface TrainingConfig {
  /** 0 = modo libre (sin series). */
  sets: number
  goalType: GoalType
  /** Saltos por serie o segundos por serie según goalType. */
  goalValue: number
  restSeconds: number
}

export const FREE_MODE: TrainingConfig = { sets: 0, goalType: 'JUMPS', goalValue: 100, restSeconds: 30 }

export function configToSearch(c: TrainingConfig): string {
  return new URLSearchParams({
    sets: String(c.sets),
    goal: c.goalType,
    value: String(c.goalValue),
    rest: String(c.restSeconds),
  }).toString()
}

export function configFromSearch(params: URLSearchParams): TrainingConfig {
  const int = (key: string, fallback: number) => {
    const n = Number.parseInt(params.get(key) ?? '', 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    sets: int('sets', 0),
    goalType: params.get('goal') === 'TIME' ? 'TIME' : 'JUMPS',
    goalValue: Math.max(1, int('value', 100)),
    restSeconds: int('rest', 30),
  }
}

/** Ritmo típico para estimar la duración de un plan de series. */
const ESTIMATED_JUMPS_PER_MINUTE = 110

export function estimatePlan(c: TrainingConfig): { jumps: number; minutes: number } {
  const restSeconds = c.restSeconds * Math.max(0, c.sets - 1)
  if (c.goalType === 'JUMPS') {
    const jumps = c.sets * c.goalValue
    return { jumps, minutes: jumps / ESTIMATED_JUMPS_PER_MINUTE + restSeconds / 60 }
  }
  const activeSeconds = c.sets * c.goalValue
  return {
    jumps: Math.round((activeSeconds / 60) * ESTIMATED_JUMPS_PER_MINUTE),
    minutes: (activeSeconds + restSeconds) / 60,
  }
}
