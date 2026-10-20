import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fromEpochDay, toEpochDay } from '../lib/dates'
import { formatClock, formatDate, formatNumber } from '../lib/format'
import { useStats } from '../lib/useStats'

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Calendar() {
  const stats = useStats()
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState(stats.today)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const offset = (month.getDay() + 6) % 7 // lunes primero
  const firstDay = toEpochDay(month)
  const trained = (day: number) => (stats.dailyTotals.get(day) ?? 0) > 0
  const trainedThisMonth = Array.from({ length: daysInMonth }, (_, i) => firstDay + i).filter(trained).length

  // Días de la racha actual: terminan hoy, o ayer si hoy aún no se ha entrenado.
  const streakEnd = trained(stats.today) ? stats.today : stats.today - 1
  const inStreak = (day: number) => day <= streakEnd && day > streakEnd - stats.currentStreak

  const dayWorkouts = stats.workouts.filter((w) => w.epochDay === selected)
  const dayLabel =
    (selected === stats.today ? 'Hoy, ' : '') +
    formatDate(fromEpochDay(selected), selected === stats.today ? { day: 'numeric', month: 'long' } : { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="screen tab-screen">
      <h1>Calendario</h1>

      <div className="stat-tiles">
        <div className="tile streak">
          <strong>{stats.currentStreak}</strong>
          <span>Racha actual</span>
        </div>
        <div className="tile">
          <strong>{stats.bestStreak}</strong>
          <span className="muted">Mejor racha</span>
        </div>
        <div className="tile">
          <strong>{trainedThisMonth}</strong>
          <span className="muted">Días este mes</span>
        </div>
      </div>

      <section className="card calendar">
        <div className="nav-row">
          <button className="nav-circle" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </button>
          <h2>{formatDate(month, { month: 'long', year: 'numeric' })}</h2>
          <button className="nav-circle" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Mes siguiente">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          {WEEK_DAYS.map((d, i) => (
            <span key={i} className="weekday">
              {d}
            </span>
          ))}
          {Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
            const dayOfMonth = i - offset + 1
            if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return <span key={i} />
            const day = firstDay + dayOfMonth - 1
            const column = i % 7
            const streak = inStreak(day)
            const cellClasses = [
              'cal-cell',
              streak && 'band',
              streak && (column === 0 || !inStreak(day - 1)) && 'band-start',
              streak && (column === 6 || !inStreak(day + 1)) && 'band-end',
            ]
            const dayClasses = [
              'day',
              streak ? 'streak' : trained(day) && 'trained',
              day > stats.today && 'future',
              day === stats.today && 'today',
              day === selected && day !== stats.today && 'selected',
            ]
            return (
              <span key={i} className={cellClasses.filter(Boolean).join(' ')}>
                <button className={dayClasses.filter(Boolean).join(' ')} onClick={() => setSelected(day)}>
                  {dayOfMonth}
                </button>
              </span>
            )
          })}
        </div>

        <div className="legend">
          <span>
            <i className="streak" /> Racha
          </span>
          <span>
            <i className="trained" /> Entrenaste
          </span>
          <span>
            <i className="today" /> Hoy
          </span>
        </div>
      </section>

      {dayWorkouts.length === 0 ? (
        <section className="card day-card">
          <div>
            <p className="muted">{dayLabel}</p>
            <strong>Sin entrenamientos</strong>
          </div>
        </section>
      ) : (
        dayWorkouts.map((w) => (
          <button key={w.id} className="card day-card" onClick={() => navigate(`/summary/${w.id}`)}>
            <div>
              <p className="muted">
                {dayLabel}
                {dayWorkouts.length > 1 && ` · ${formatDate(new Date(w.startedAt), { hour: '2-digit', minute: '2-digit' })}`}
              </p>
              <strong>
                {formatNumber(w.jumps)} saltos · {w.setsPlanned === 0 ? 'libre' : `${w.setsCompleted} series`}
              </strong>
            </div>
            <span className="day-time">{formatClock(w.durationMs)}</span>
          </button>
        ))
      )}
    </main>
  )
}
