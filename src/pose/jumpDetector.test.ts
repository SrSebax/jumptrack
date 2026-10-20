import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { JumpDetector } from './jumpDetector'

/** Pose de pie con el cuerpo elevado [lift] (fracción de la imagen). */
function pose(lift: number, noise = 0): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }))
  const jitter = () => (Math.random() - 0.5) * noise
  const set = (i: number, y: number) => (landmarks[i] = { x: 0.5, y: y - lift + jitter(), z: 0, visibility: 1 })
  set(11, 0.3)
  set(12, 0.3)
  set(23, 0.55)
  set(24, 0.55)
  set(27, 0.85)
  set(28, 0.85)
  return landmarks
}

function simulate(frames: (t: number) => number, seconds: number, fps = 30, noise = 0) {
  let jumps = 0
  const detector = new JumpDetector(() => jumps++)
  for (let f = 0; f < seconds * fps; f++) {
    const t = (f * 1000) / fps
    detector.process(pose(frames(t), noise), t)
  }
  return jumps
}

describe('JumpDetector', () => {
  it('cuenta saltos de comba a ~2 por segundo', () => {
    // Saltos de 3 cm en un cuerpo de ~1,3 m de hombros a tobillos, durante 20 s.
    const hop = (t: number) => Math.max(0, Math.sin((2 * Math.PI * t) / 500)) * 0.012
    const jumps = simulate(hop, 20, 30, 0.002)
    expect(jumps).toBeGreaterThanOrEqual(37)
    expect(jumps).toBeLessThanOrEqual(41)
  })

  it('no cuenta nada estando quieto con temblor de landmarks', () => {
    expect(simulate(() => 0, 15, 30, 0.004)).toBe(0)
  })

  it('no detecta el cuerpo si faltan los tobillos', () => {
    const detector = new JumpDetector(() => {})
    const landmarks = pose(0)
    landmarks[27] = { ...landmarks[27], visibility: 0.1 }
    expect(detector.process(landmarks, 0)).toBe(false)
  })
})
