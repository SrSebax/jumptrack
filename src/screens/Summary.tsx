import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Flame } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { db, type Workout } from '../db'
import { formatClock, formatDate, formatMinSec, formatNumber, jumpsPerMinute, pluralDays } from '../lib/format'
import { useStats } from '../lib/useStats'

export function Summary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fromTraining = (useLocation().state as { fromTraining?: boolean } | null)?.fromTraining
  const workout = useLiveQuery(() => db.workouts.get(Number(id)), [id])
  const { currentStreak } = useStats()

  return (
    <main className="screen summary">
      {workout && (
        <>
          <header className="summary-header">
            <div className="done-badge">
              <Check size={34} strokeWidth={3} />
            </div>
            <h1>{fromTraining ? '¡Entrenamiento completado!' : 'Entrenamiento'}</h1>
            {fromTraining ? (
              <span className="streak-chip">
                <Flame size={16} /> Racha: {pluralDays(currentStreak)}
              </span>
            ) : (
              <p className="muted">
                {formatDate(new Date(workout.startedAt), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </header>

          <section className="card summary-total">
            <div className="summary-jumps">{formatNumber(workout.jumps)}</div>
            <span className="muted">saltos en total</span>
          </section>

          <div className="stat-tiles">
            <div className="tile center">
              <strong>{formatClock(workout.durationMs)}</strong>
              <span className="muted">Tiempo</span>
            </div>
            <div className="tile center">
              <strong>{jumpsPerMinute(workout.jumps, workout.durationMs)}</strong>
              <span className="muted">Saltos/min</span>
            </div>
            <div className="tile center">
              <strong>{workout.setsPlanned === 0 ? 'Libre' : `${workout.setsCompleted}/${workout.setsPlanned}`}</strong>
              <span className="muted">Series</span>
            </div>
          </div>

          <SetBreakdown workout={workout} />
        </>
      )}
      {workout === null && <p className="muted center">Entrenamiento no encontrado.</p>}

      <div className="summary-actions">
        {fromTraining ? (
          <>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/', { replace: true })}>
              Guardar y volver
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/calendar', { replace: true })}>
              Ver mi calendario
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={() => navigate(-1)}>
            Volver
          </button>
        )}
      </div>
    </main>
  )
}

/** Barras por serie: tiempo de cada una (meta por saltos) o saltos de cada una (meta por tiempo). */
function SetBreakdown({ workout }: { workout: Workout }) {
  const sets = workout.setDetails ?? []
  if (sets.length === 0) return null

  const byJumps = workout.goalType === 'JUMPS'
  const title = byJumps
    ? `Velocidad por serie (${formatNumber(workout.goalValue)} saltos c/u)`
    : `Saltos por serie (${formatMinSec(workout.goalValue * 1000)} c/u)`
  const fastest = Math.min(...sets.map((set) => set.durationMs))
  const most = Math.max(1, ...sets.map((set) => set.jumps))

  return (
    <section className="card set-breakdown">
      <h3>{title}</h3>
      {sets.map((set, i) => {
        // La serie más rápida (o con más saltos) llena la barra.
        const ratio = byJumps ? fastest / Math.max(1, set.durationMs) : set.jumps / most
        return (
          <div key={i} className="set-row">
            <span>Serie {i + 1}</span>
            <div className="progress lime">
              <div style={{ width: `${ratio * 100}%` }} />
            </div>
            <strong>{byJumps ? formatMinSec(set.durationMs) : formatNumber(set.jumps)}</strong>
          </div>
        )
      })}
    </section>
  )
}
