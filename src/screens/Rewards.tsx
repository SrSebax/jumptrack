import { ArrowLeft, Gem, Heart, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatNumber } from '../lib/format'
import { buyLife, LIFE_COST, MAX_LIVES, restsInWeek, setRestDay, useRestDaysPerWeek } from '../lib/rewards'
import { useStats } from '../lib/useStats'

/** Puntos ganados entrenando, vidas para salvar la racha y el día de descanso. */
export function Rewards() {
  const navigate = useNavigate()
  const stats = useStats()
  const restDaysPerWeek = useRestDaysPerWeek()
  const restingToday = stats.restDays.has(stats.today)
  const trainedToday = stats.trainedDays.has(stats.today)
  const restsLeft = restDaysPerWeek - restsInWeek(stats.restDays, stats.trainedDays, stats.today)
  const fullLives = stats.lives >= MAX_LIVES
  const missing = LIFE_COST - stats.points

  return (
    <main className="screen rewards">
      <header className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft />
        </button>
        <h2>Puntos y vidas</h2>
      </header>

      <section className="card rewards-card">
        <div className="rewards-head">
          <div className="points">
            <Gem size={22} />
            <strong>{formatNumber(stats.points)}</strong>
            <span className="muted">puntos</span>
          </div>
          <div className="lives" aria-label={`${stats.lives} de ${MAX_LIVES} vidas`}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <Heart key={i} size={24} className={i < stats.lives ? 'full' : ''} fill={i < stats.lives ? 'currentColor' : 'none'} />
            ))}
          </div>
        </div>
        <p className="muted small">
          {fullLives
            ? 'Tienes todas las vidas. Si un día no entrenas, se gasta una sola y tu racha sigue.'
            : missing > 0
              ? `Te faltan ${formatNumber(missing)} puntos para una vida.`
              : 'Si un día no entrenas, la vida se gasta sola y tu racha sigue.'}
        </p>
        <button className="btn btn-primary" disabled={fullLives || missing > 0} onClick={() => void buyLife()}>
          <Heart size={18} /> Canjear vida · {LIFE_COST}
        </button>
      </section>

      <section className="card rewards-card">
        <h3>Día de descanso</h3>
        <p className="muted small">
          {trainedToday
            ? 'Hoy ya entrenaste.'
            : restingToday
              ? 'Hoy descansas: cuenta como un día más de racha.'
              : restDaysPerWeek === 0
                ? 'Activa días de descanso en Ajustes.'
                : restsLeft > 0
                  ? `Cuenta como día de racha. Te quedan ${restsLeft} esta semana; también puedes marcarlos en el calendario.`
                  : 'Ya usaste tus descansos de esta semana.'}
        </p>
        {!trainedToday && (
          <button
            className="btn btn-secondary"
            disabled={!restingToday && restsLeft <= 0}
            onClick={() => void setRestDay(stats.today, !restingToday)}
          >
            <Moon size={18} /> {restingToday ? 'Quitar descanso' : 'Descansar hoy'}
          </button>
        )}
      </section>

      <section className="card rewards-card">
        <h3>Cómo ganar puntos</h3>
        <ul className="points-rules">
          <li>
            <span>Cada 10 saltos</span>
            <strong>+1</strong>
          </li>
          <li>
            <span>Cada serie completada</span>
            <strong>+5</strong>
          </li>
          <li>
            <span>Cada minuto saltando</span>
            <strong>+2</strong>
          </li>
        </ul>
      </section>
    </main>
  )
}
