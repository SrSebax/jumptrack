import { ChevronLeft, Play } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented } from '../components/Segmented'
import { Stepper } from '../components/Stepper'
import type { GoalType } from '../db'
import { formatMinSec, formatNumber } from '../lib/format'
import { configToSearch, estimatePlan, type TrainingConfig } from '../training/config'
import { loadLastSetup, saveLastSetup, type SetupState } from '../training/lastSetup'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function SeriesSetup() {
  const navigate = useNavigate()
  const [s, setS] = useState(loadLastSetup)
  const update = (patch: Partial<SetupState>) => setS((prev) => ({ ...prev, ...patch }))

  const config: TrainingConfig = {
    sets: s.sets,
    goalType: s.goalType,
    goalValue: s.goalType === 'JUMPS' ? s.goalJumps : s.goalSeconds,
    restSeconds: s.restSeconds,
  }
  const plan = estimatePlan(config)

  const start = () => {
    saveLastSetup(s)
    navigate(`/training?${configToSearch(config)}`)
  }

  return (
    <main className="screen series-setup">
      <header className="top-bar">
        <button className="icon-btn outlined" onClick={() => navigate(-1)} aria-label="Volver">
          <ChevronLeft size={22} />
        </button>
        <h2>Entrenar por series</h2>
      </header>

      <div className="setup-body">
        <p className="field-label">Cada serie termina por</p>
        <Segmented<GoalType>
          options={[
            { value: 'JUMPS', label: 'Saltos' },
            { value: 'TIME', label: 'Tiempo' },
          ]}
          value={s.goalType}
          onChange={(goalType) => update({ goalType })}
        />

        <Stepper
          label="Número de series"
          value={String(s.sets)}
          onMinus={() => update({ sets: clamp(s.sets - 1, 1, 30) })}
          onPlus={() => update({ sets: clamp(s.sets + 1, 1, 30) })}
        />
        {s.goalType === 'JUMPS' ? (
          <Stepper
            label="Saltos por serie"
            value={formatNumber(s.goalJumps)}
            onMinus={() => update({ goalJumps: clamp(s.goalJumps - 10, 10, 2000) })}
            onPlus={() => update({ goalJumps: clamp(s.goalJumps + 10, 10, 2000) })}
          />
        ) : (
          <Stepper
            label="Tiempo por serie"
            value={formatMinSec(s.goalSeconds * 1000)}
            onMinus={() => update({ goalSeconds: clamp(s.goalSeconds - 15, 15, 1800) })}
            onPlus={() => update({ goalSeconds: clamp(s.goalSeconds + 15, 15, 1800) })}
          />
        )}
        <Stepper
          label="Descanso entre series"
          value={formatMinSec(s.restSeconds * 1000)}
          onMinus={() => update({ restSeconds: clamp(s.restSeconds - 5, 0, 600) })}
          onPlus={() => update({ restSeconds: clamp(s.restSeconds + 5, 0, 600) })}
        />

      </div>

      <div className="plan-summary">
        <span className="muted">Total del entrenamiento</span>
        <strong>
          {formatNumber(plan.jumps)} saltos · ~{Math.max(1, Math.round(plan.minutes))} min
        </strong>
      </div>
      <button className="btn btn-primary btn-lg" onClick={start}>
        <Play size={20} fill="currentColor" /> Empezar series
      </button>
    </main>
  )
}

