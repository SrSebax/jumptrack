import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_HIP = 23
const RIGHT_HIP = 24
const LEFT_ANKLE = 27
const RIGHT_ANKLE = 28

const MIN_VISIBILITY = 0.5
/** Altura mínima del cuerpo como fracción del alto de la imagen. */
const MIN_BODY_HEIGHT = 0.15
const ANKLE_WEIGHT = 0.6
const SMOOTHING = 0.6
const MEAN_RATE = 0.05
const WARMUP_FRAMES = 8
/** Desviación mínima, como fracción de la altura del cuerpo. */
const MIN_THRESHOLD = 0.008
const AMPLITUDE_FACTOR = 0.5
const LANDING_FACTOR = 0.3
/** Más rápido que ~5 saltos/s se considera ruido. */
const MIN_JUMP_INTERVAL_MS = 180

/**
 * Detecta saltos a partir de la altura de tobillos y caderas en cada frame.
 *
 * La señal vertical se normaliza por la altura del cuerpo (hombros a tobillos) para que
 * no dependa de la distancia a la cámara, y se compara con su media móvil lenta: el pie
 * "sube" cuando la señal queda claramente por encima de la media y el salto se cuenta
 * cuando vuelve a bajar (histéresis), lo que evita contar el temblor de los landmarks.
 */
export class JumpDetector {
  private smoothed = NaN
  private mean = NaN
  private amplitude = 0
  private inAir = false
  private lastJumpAt = -Infinity
  private framesWithBody = 0
  private readonly onJump: () => void

  constructor(onJump: () => void) {
    this.onJump = onJump
  }

  /** Procesa una pose y devuelve si el cuerpo completo está visible. */
  process(landmarks: NormalizedLandmark[], timestampMs: number): boolean {
    const y = (index: number) => {
      const point = landmarks[index]
      return point && (point.visibility ?? 1) >= MIN_VISIBILITY ? point.y : null
    }
    const points = [LEFT_ANKLE, RIGHT_ANKLE, LEFT_HIP, RIGHT_HIP, LEFT_SHOULDER, RIGHT_SHOULDER].map(y)
    if (points.some((p) => p === null)) {
      this.reset()
      return false
    }
    const [la, ra, lh, rh, ls, rs] = points as number[]
    const ankleY = (la + ra) / 2
    const hipY = (lh + rh) / 2
    const shoulderY = (ls + rs) / 2
    const bodyHeight = ankleY - shoulderY
    if (bodyHeight < MIN_BODY_HEIGHT) {
      this.reset()
      return false
    }

    // En coordenadas de imagen la Y crece hacia abajo: valores menores = más alto.
    const raw = (ANKLE_WEIGHT * ankleY + (1 - ANKLE_WEIGHT) * hipY) / bodyHeight
    if (Number.isNaN(this.smoothed)) {
      this.smoothed = raw
      this.mean = raw
    }
    this.smoothed += SMOOTHING * (raw - this.smoothed)
    this.mean += MEAN_RATE * (this.smoothed - this.mean)
    const deviation = this.smoothed - this.mean
    this.amplitude += MEAN_RATE * (Math.abs(deviation) - this.amplitude)

    this.framesWithBody++
    if (this.framesWithBody < WARMUP_FRAMES) return true

    const threshold = Math.max(MIN_THRESHOLD, this.amplitude * AMPLITUDE_FACTOR)
    if (!this.inAir && deviation < -threshold) {
      this.inAir = true
    } else if (this.inAir && deviation > -threshold * LANDING_FACTOR) {
      this.inAir = false
      if (timestampMs - this.lastJumpAt >= MIN_JUMP_INTERVAL_MS) {
        this.lastJumpAt = timestampMs
        this.onJump()
      }
    }
    return true
  }

  reset(): void {
    this.smoothed = NaN
    this.mean = NaN
    this.amplitude = 0
    this.inAir = false
    this.framesWithBody = 0
  }
}
