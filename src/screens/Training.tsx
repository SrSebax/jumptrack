import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { JumperIllustration } from '../components/JumperIllustration'
import { PoseCamera } from '../components/PoseCamera'
import { keepScreenOn, pushBackHandler } from '../lib/device'
import { formatClock, formatMinSec, formatNumber, jumpsPerMinute } from '../lib/format'
import { useStats } from '../lib/useStats'
import { configFromSearch } from '../training/config'
import { TrainingSession, type TrainingState } from '../training/session'

export function Training() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [session] = useState(() => new TrainingSession(configFromSearch(params)))
  const s = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { todayJumps } = useStats()
  const [confirmFinish, setConfirmFinish] = useState(false)
  const { config } = session

  useEffect(() => {
    session.start()
    keepScreenOn(true)
    return () => {
      session.stop()
      keepScreenOn(false)
    }
  }, [session])

  useEffect(() => pushBackHandler(() => setConfirmFinish(true)), [])

  useEffect(() => {
    if (s.savedId !== null) navigate(`/summary/${s.savedId}`, { replace: true, state: { fromTraining: true } })
    else if (s.discarded) navigate(-1)
  }, [s.savedId, s.discarded, navigate])

  const paused = s.phase === 'paused'
  const shown = paused ? s.pausedFrom : s.phase
  const goalText = !session.isSeries
    ? 'Sin meta'
    : config.goalType === 'JUMPS'
      ? `Meta: ${formatNumber(config.goalValue)} saltos`
      : `Meta: ${formatMinSec(config.goalValue * 1000)} por serie`

  return (
    <main className="screen training">
      <header className="training-header">
        <div>
          <p className="muted">{session.isSeries ? `Serie ${s.currentSet} de ${config.sets}` : 'Entrenamiento libre'}</p>
          <h2>{goalText}</h2>
        </div>
        <span className="chip">
          <i className={s.phase === 'waiting' ? 'off' : 'live'} />
          Cámara activa
        </span>
      </header>

      <section className="view-card">
        <JumperIllustration />
        <PoseCamera facingMode="user" onPose={session.onPose} onReady={session.begin} />
        <span className="view-label">
          {s.phase === 'waiting' || s.bodyDetected ? 'Vista de cámara' : 'Aléjate: que se vea tu cuerpo entero'}
        </span>
      </section>

      <MainDisplay s={s} session={session} paused={paused} shown={shown} />

      <div className="training-stats">
        <div className="tile center">
          <strong>{formatClock(s.activeMs)}</strong>
          <span className="muted">Cronómetro</span>
        </div>
        <div className="tile center">
          <strong>{jumpsPerMinute(s.totalJumps, s.activeMs)}</strong>
          <span className="muted">Saltos/min</span>
        </div>
        <div className="tile center">
          <strong>{formatNumber(todayJumps + s.totalJumps)}</strong>
          <span className="muted">Total hoy</span>
        </div>
      </div>

      <div className="training-controls">
        <ControlButton label="Terminar" onClick={() => setConfirmFinish(true)} disabled={s.phase === 'finished'}>
          <Square size={18} fill="currentColor" />
        </ControlButton>
        <ControlButton
          label={paused ? 'Reanudar' : 'Pausar'}
          primary
          onClick={session.togglePause}
          disabled={s.phase === 'waiting' || s.phase === 'finished'}
        >
          {paused ? <Play size={34} fill="currentColor" /> : <Pause size={34} fill="currentColor" />}
        </ControlButton>
        <ControlButton
          label="Sig. serie"
          onClick={session.nextSet}
          disabled={!session.isSeries || (s.phase !== 'active' && s.phase !== 'rest')}
        >
          <SkipForward size={20} fill="currentColor" />
        </ControlButton>
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="¿Terminar entrenamiento?"
          message={s.totalJumps > 0 ? `Se guardarán ${formatNumber(s.totalJumps)} saltos.` : 'No hay saltos registrados, no se guardará nada.'}
          confirmLabel="Terminar"
          cancelLabel="Seguir"
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            setConfirmFinish(false)
            session.finish()
          }}
        />
      )}
    </main>
  )
}

/** Número grande + etiqueta + barra, según la fase (cuenta atrás, saltos o descanso). */
function MainDisplay({
  s,
  session,
  paused,
  shown,
}: {
  s: TrainingState
  session: TrainingSession
  paused: boolean
  shown: TrainingState['phase'] | null
}) {
  const { config } = session
  let value: string
  let label: string
  let progress: number | null = null
  const rest = shown === 'rest'

  if (s.phase === 'waiting') {
    value = '0'
    label = 'Preparando cámara…'
  } else if (shown === 'ready') {
    value = String(Math.ceil(s.countdownMs / 1000))
    label = 'Prepárate'
  } else if (rest) {
    value = formatClock(s.restRemainingMs + 999)
    label = `Descanso · sigue la serie ${s.setsCompleted + 1}`
    progress = 1 - s.restRemainingMs / s.restTotalMs
  } else if (session.isSeries) {
    value = String(s.setJumps)
    if (config.goalType === 'JUMPS') {
      label = `saltos de ${formatNumber(config.goalValue)}`
      progress = s.setJumps / config.goalValue
    } else {
      const goalMs = config.goalValue * 1000
      label = `saltos · quedan ${formatClock(goalMs - s.setElapsedMs + 999)}`
      progress = s.setElapsedMs / goalMs
    }
  } else {
    value = formatNumber(s.totalJumps)
    label = 'saltos'
  }

  return (
    <div className={`main-display${rest ? ' rest' : ''}`}>
      {rest ? (
        <div className="rest-adjust">
          <button className="step-btn" onClick={() => session.adjustRest(-5)} aria-label="Restar 5 segundos de descanso">
            −5s
          </button>
          <div className="big-counter">{value}</div>
          <button className="step-btn" onClick={() => session.adjustRest(5)} aria-label="Sumar 5 segundos de descanso">
            +5s
          </button>
        </div>
      ) : (
        <div className="big-counter">{value}</div>
      )}
      <div className={paused ? 'paused-label' : 'muted'}>{paused ? 'En pausa' : label}</div>
      {progress !== null && (
        <div className="progress lime">
          <div style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

function ControlButton({
  label,
  primary,
  disabled,
  onClick,
  children,
}: {
  label: string
  primary?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <div className={`control${primary ? ' primary' : ''}`}>
      <button onClick={onClick} disabled={disabled} aria-label={label}>
        {children}
      </button>
      <span>{label}</span>
    </div>
  )
}
