import { describe, expect, it } from 'vitest'
import { bestStreak, currentStreak, currentStreakRange, daysToSaveWithLives } from './streaks'

describe('rachas', () => {
  it('la racha actual sigue viva si se entrenó ayer', () => {
    expect(currentStreak(new Set([8, 9, 10]), 11)).toBe(3)
    expect(currentStreak(new Set([8, 9, 10, 11]), 11)).toBe(4)
    expect(currentStreak(new Set([8, 9]), 11)).toBe(0)
  })

  it('la mejor racha encuentra el tramo más largo', () => {
    expect(bestStreak(new Set([1, 2, 3, 7, 8, 20, 21, 22, 23]))).toBe(4)
    expect(bestStreak(new Set())).toBe(0)
  })

  it('los descansos suman a la racha y las vidas solo la salvan', () => {
    const none = new Set<number>()
    expect(currentStreak(new Set([7, 8, 10]), 11, new Set([9]))).toBe(4)
    expect(currentStreak(new Set([7, 8, 10]), 11, none, new Set([9]))).toBe(3)
    expect(currentStreakRange(new Set([7, 8, 10]), 11, none, new Set([9]))).toEqual({ start: 7, end: 10, days: 3 })
    // Descansar hoy suma.
    expect(currentStreakRange(new Set([9, 10]), 11, new Set([11]))).toEqual({ start: 9, end: 11, days: 3 })
    // Solo descansos, sin entrenar, no hacen racha.
    expect(currentStreak(new Set(), 11, new Set([10, 11]))).toBe(0)
    expect(bestStreak(new Set([1, 2, 4, 5]), new Set([3]))).toBe(5)
    expect(bestStreak(new Set([1, 2, 4, 5]), none, new Set([3]))).toBe(4)
    expect(bestStreak(new Set([1]), new Set([10, 11, 12]))).toBe(1)
  })

  it('las vidas tapan el hueco solo si alcanzan', () => {
    const trained = new Set([5, 6, 7])
    expect(daysToSaveWithLives(trained, 9, new Set(), 2)).toEqual([8])
    expect(daysToSaveWithLives(trained, 10, new Set(), 2)).toEqual([8, 9])
    expect(daysToSaveWithLives(trained, 11, new Set(), 2)).toEqual([])
    expect(daysToSaveWithLives(trained, 9, new Set(), 0)).toEqual([])
    // Ayer entrenado o descansado: no hace falta nada.
    expect(daysToSaveWithLives(trained, 8, new Set(), 2)).toEqual([])
    expect(daysToSaveWithLives(trained, 9, new Set([8]), 2)).toEqual([])
    // Sin racha que salvar.
    expect(daysToSaveWithLives(new Set(), 9, new Set(), 2)).toEqual([])
  })
})
