import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Flame, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { db, deleteWorkout, updateWorkoutJumps, type Workout } from '../db'
import { syncWorkouts } from '../lib/cloud'
import { formatClock, formatDate, formatMinSec, formatNumber, jumpsPerMinute, pluralDays } from '../lib/format'
import { useStats } from '../lib/useStats'

export function Summary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fromTraining = (useLocation().state as { fromTraining?: boolean } | null)?.fromTraining
  const workout = useLiveQuery(() => db.workouts.get(Number(id)), [id])
  const { currentStreak } = useStats()
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

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

          <div className="summary-edit">
            <button className="btn btn-outline" onClick={() => setDialog('edit')}>
              <Pencil size={18} /> Corregir saltos
            </button>
            <button className="btn btn-outline danger-text" onClick={() => setDialog('delete')}>
              <Trash2 size={18} /> Borrar
            </button>
          </div>

          {dialog === 'edit' && (
            <EditJumpsDialog
              initial={workout.jumps}
              onCancel={() => setDialog(null)}
              onSave={(jumps) => {
                setDialog(null)
                void updateWorkoutJumps(workout.id, jumps).then(() => syncWorkouts())
              }}
            />
          )}
          {dialog === 'delete' && (
            <ConfirmDialog
              title="¿Borrar entrenamiento?"
              message={`Se borrarán ${formatNumber(workout.jumps)} saltos de este celular y de la nube. No se puede deshacer.`}
              confirmLabel="Borrar"
              onCancel={() => setDialog(null)}
              onConfirm={() => {
                setDialog(null)
                if (fromTraining) navigate('/', { replace: true })
                else navigate(-1)
                void deleteWorkout(workout).then(() => syncWorkouts())
              }}
            />
          )}
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

function EditJumpsDialog({ initial, onSave, onCancel }: { initial: number; onSave: (jumps: number) => void; onCancel: () => void }) {
  const [text, setText] = useState(String(initial))
  const jumps = Number(text)
  const valid = text !== '' && Number.isInteger(jumps) && jumps > 0 && jumps <= 100_000

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Corregir saltos</h2>
        <p>Si la cámara contó de más o de menos, pon los saltos reales.</p>
        <input
          className="number-input"
          type="number"
          inputMode="numeric"
          min={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="dialog-actions">
          <button className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(jumps)}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
