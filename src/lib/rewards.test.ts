import { describe, expect, it } from 'vitest'
import type { Workout } from '../db'
import { weekStart } from './dates'
import { restsInWeek, wallet, workoutPoints } from './rewards'

const workout = (epochDay: number, jumps: number, setsCompleted = 0, minutes = 0) =>
  ({ epochDay, jumps, setsCompleted, durationMs: minutes * 60_000 }) as Workout

describe('puntos y vidas', () => {
  it('da puntos por saltos, series y minutos', () => {
    expect(workoutPoints(workout(1, 1000, 5, 10))).toBe(100 + 25 + 20)
    expect(workoutPoints(workout(1, 9))).toBe(0)
  })

  it('resta lo gastado y devuelve vidas de días que sí se entrenaron', () => {
    const workouts = [workout(1, 3000), workout(3, 100)]
    const purchases = [{ createdAt: 1, cost: 200 }]
    expect(wallet(workouts, purchases, [])).toEqual({ points: 110, lives: 1 })
    expect(wallet(workouts, purchases, [{ epochDay: 2, kind: 'life', updatedAt: 1 }])).toEqual({ points: 110, lives: 0 })
    expect(wallet(workouts, purchases, [{ epochDay: 3, kind: 'life', updatedAt: 1 }])).toEqual({ points: 110, lives: 1 })
    expect(wallet(workouts, purchases, [{ epochDay: 2, kind: 'rest', updatedAt: 1 }])).toEqual({ points: 110, lives: 1 })
  })

  it('cuenta los descansos de la semana sin los días entrenados', () => {
    const monday = weekStart(20_000)
    expect(restsInWeek(new Set([monday, monday + 2, monday + 7]), new Set([monday + 2]), monday + 3)).toBe(1)
  })
})
