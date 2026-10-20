import type { GoalType } from '../db'

const STORAGE_KEY = 'jumptrack.lastSetup'

export interface SetupState {
  sets: number
  goalType: GoalType
  goalJumps: number
  goalSeconds: number
  restSeconds: number
}

const DEFAULTS: SetupState = { sets: 5, goalType: 'JUMPS', goalJumps: 200, goalSeconds: 60, restSeconds: 45 }

/** Última configuración usada (comodidad por dispositivo; si falla se usan los valores por defecto). */
export function loadLastSetup(): SetupState {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function saveLastSetup(state: SetupState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Recordar la configuración es solo una comodidad.
  }
}
