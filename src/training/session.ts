import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { db, type SetDetail } from '../db'
import { syncCloud } from '../lib/cloud'
import { todayEpochDay } from '../lib/dates'
import { bestInWindow } from '../lib/records'
import { speak } from '../lib/voice'
import { JumpDetector } from '../pose/jumpDetector'
import type { TrainingConfig } from './config'

export type Phase = 'waiting' | 'ready' | 'active' | 'paused' | 'rest' | 'finished'

export interface TrainingState {
  phase: Phase
  pausedFrom: Phase | null
  totalJumps: number
  setJumps: number
  currentSet: number
  setsCompleted: number
  /** Tiempo activo total (sin pausas ni descansos). */
  activeMs: number
  setElapsedMs: number
  countdownMs: number
  restRemainingMs: number
  /** Duración total del descanso actual (cambia al ajustarlo con ±5 s). */
  restTotalMs: number
  bodyDetected: boolean
  savedId: number | null
  discarded: boolean
}

const TICK_MS = 100
const COUNTDOWN_MS = 4_000
const ANNOUNCE_EVERY = 50
const MAX_REST_MS = 600_000

/**
 * Máquina de estados del entrenamiento, independiente de React.
 * La UI se suscribe con useSyncExternalStore.
 */
export class TrainingSession {
  readonly config: TrainingConfig
  private state: TrainingState = {
    phase: 'waiting',
    pausedFrom: null,
    totalJumps: 0,
    setJumps: 0,
    currentSet: 1,
    setsCompleted: 0,
    activeMs: 0,
    setElapsedMs: 0,
    countdownMs: 0,
    restRemainingMs: 0,
    restTotalMs: 0,
    bodyDetected: false,
    savedId: null,
    discarded: false,
  }
  private readonly listeners = new Set<() => void>()
  private readonly detector = new JumpDetector(() => this.onJump())
  private readonly startedAt = Date.now()
  /** Tiempo activo (ms) en que ocurrió cada salto, para el récord por minuto. */
  private readonly jumpTimes: number[] = []
  private readonly setDetails: SetDetail[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private lastTick = 0

  constructor(config: TrainingConfig) {
    this.config = config
  }

  get isSeries(): boolean {
    return this.config.sets > 0
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.state

  private set(patch: Partial<TrainingState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Arranca el reloj interno. Idempotente (React puede montar dos veces en desarrollo). */
  start() {
    if (this.timer !== null) return
    this.lastTick = performance.now()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }

  /** La cámara y el detector están listos: empieza la cuenta regresiva. */
  begin = () => {
    if (this.state.phase !== 'waiting') return
    speak('Prepárate', true)
    this.set({ phase: 'ready', countdownMs: COUNTDOWN_MS })
  }

  onPose = (landmarks: NormalizedLandmark[] | null) => {
    let detected = false
    if (landmarks) detected = this.detector.process(landmarks, performance.now())
    else this.detector.reset()
    if (detected !== this.state.bodyDetected) this.set({ bodyDetected: detected })
  }

  togglePause = () => {
    const s = this.state
    switch (s.phase) {
      case 'ready':
      case 'active':
      case 'rest':
        this.set({ phase: 'paused', pausedFrom: s.phase })
        break
      case 'paused':
        this.resetDetectors()
        this.set({ phase: s.pausedFrom ?? 'active', pausedFrom: null })
        break
    }
  }

  /** "Sig. serie": da por terminada la serie actual, o salta el descanso. */
  nextSet = () => {
    if (this.state.phase === 'rest') this.startNextSet()
    else if (this.state.phase === 'active' && this.isSeries) this.completeSet()
  }

  /** Suma o resta segundos al descanso en curso (también en pausa). Si llega a 0, empieza la serie. */
  adjustRest = (deltaSeconds: number) => {
    const s = this.state
    if (s.phase !== 'rest' && !(s.phase === 'paused' && s.pausedFrom === 'rest')) return
    const restRemainingMs = Math.min(MAX_REST_MS, Math.max(0, s.restRemainingMs + deltaSeconds * 1000))
    const restTotalMs = Math.max(restRemainingMs, s.restTotalMs + Math.max(0, deltaSeconds) * 1000)
    this.set({ restRemainingMs, restTotalMs })
  }

  finish = () => {
    const s = this.state
    if (s.phase === 'finished') return
    this.set({ phase: 'finished' })
    if (s.totalJumps === 0) {
      this.set({ discarded: true })
      return
    }
    speak(`Entrenamiento terminado. ${s.totalJumps} saltos`, true)
    void db.workouts
      .add({
        startedAt: this.startedAt,
        epochDay: todayEpochDay(),
        durationMs: s.activeMs,
        jumps: s.totalJumps,
        setsCompleted: s.setsCompleted,
        setsPlanned: this.config.sets,
        goalType: this.isSeries ? this.config.goalType : null,
        goalValue: this.isSeries ? this.config.goalValue : 0,
        bestMinute: bestInWindow(this.jumpTimes, 60_000),
        setDetails: this.isSeries ? this.setDetails : undefined,
      })
      .then((id) => {
        this.set({ savedId: id })
        void syncCloud()
      })
  }

  private tick() {
    const now = performance.now()
    const dt = now - this.lastTick
    this.lastTick = now
    const s = this.state
    switch (s.phase) {
      case 'ready': {
        const remaining = s.countdownMs - dt
        if (remaining <= 0) {
          this.resetDetectors()
          speak('¡Ya!', true)
          this.set({ phase: 'active', countdownMs: 0 })
        } else {
          this.announceSecondChange(s.countdownMs, remaining)
          this.set({ countdownMs: remaining })
        }
        break
      }
      case 'active': {
        const setElapsedMs = s.setElapsedMs + dt
        this.set({ activeMs: s.activeMs + dt, setElapsedMs })
        const { goalType, goalValue } = this.config
        if (this.isSeries && goalType === 'TIME' && setElapsedMs >= goalValue * 1000) this.completeSet()
        break
      }
      case 'rest': {
        const remaining = s.restRemainingMs - dt
        if (remaining <= 0) {
          this.startNextSet()
        } else {
          this.announceSecondChange(s.restRemainingMs, remaining)
          this.set({ restRemainingMs: remaining })
        }
        break
      }
    }
  }

  private onJump() {
    const s = this.state
    if (s.phase !== 'active') return
    const totalJumps = s.totalJumps + 1
    const setJumps = s.setJumps + 1
    this.jumpTimes.push(s.activeMs)
    this.set({ totalJumps, setJumps })
    if (totalJumps % ANNOUNCE_EVERY === 0) speak(`${totalJumps} saltos`)
    const { goalType, goalValue } = this.config
    if (this.isSeries && goalType === 'JUMPS' && setJumps >= goalValue) this.completeSet()
  }

  private completeSet() {
    this.setDetails.push({ jumps: this.state.setJumps, durationMs: this.state.setElapsedMs })
    const done = this.state.setsCompleted + 1
    if (done >= this.config.sets) {
      this.set({ setsCompleted: done })
      this.finish()
    } else if (this.config.restSeconds === 0) {
      speak(`Serie ${done} completada`)
      this.set({ setsCompleted: done, currentSet: done + 1, setJumps: 0, setElapsedMs: 0 })
    } else {
      speak(`Serie ${done} completada. Descanso`)
      const restMs = this.config.restSeconds * 1000
      this.set({ setsCompleted: done, phase: 'rest', restRemainingMs: restMs, restTotalMs: restMs })
    }
  }

  private startNextSet() {
    const next = this.state.setsCompleted + 1
    this.resetDetectors()
    speak(`Serie ${next}. ¡Ya!`, true)
    this.set({ phase: 'active', currentSet: next, setJumps: 0, setElapsedMs: 0, restRemainingMs: 0 })
  }

  private resetDetectors() {
    this.detector.reset()
  }

  /** Dice "3, 2, 1" en los últimos segundos de una cuenta regresiva. */
  private announceSecondChange(before: number, after: number) {
    const secBefore = Math.ceil(before / 1000)
    const secAfter = Math.ceil(after / 1000)
    if (secAfter !== secBefore && secAfter >= 1 && secAfter <= 3) speak(String(secAfter), true)
  }
}
