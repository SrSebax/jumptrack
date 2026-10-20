import { describe, expect, it } from 'vitest'
import { bestInWindow } from './records'

describe('bestInWindow', () => {
  it('cuenta el máximo de saltos en 60 s seguidos', () => {
    // 100 saltos lentos (1/s) y luego 150 rápidos (2,5/s).
    const slow = Array.from({ length: 100 }, (_, i) => i * 1000)
    const fast = Array.from({ length: 150 }, (_, i) => 100_000 + i * 400)
    expect(bestInWindow([...slow, ...fast], 60_000)).toBe(150)
  })

  it('entrenamientos de menos de un minuto cuentan todos sus saltos', () => {
    expect(bestInWindow([0, 500, 1000], 60_000)).toBe(3)
    expect(bestInWindow([], 60_000)).toBe(0)
  })
})
