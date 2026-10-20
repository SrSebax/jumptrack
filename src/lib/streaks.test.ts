import { describe, expect, it } from 'vitest'
import { bestStreak, currentStreak } from './streaks'

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
})
