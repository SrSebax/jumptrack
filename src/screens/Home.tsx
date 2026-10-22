import { Check, Flame, ListOrdered, Play, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useCloud } from '../lib/cloud'
import { fromEpochDay, weekStart } from '../lib/dates'
import { formatDate, formatNumber, pluralDays } from '../lib/format'
import { useDailyGoal } from '../lib/settings'
import { useStats } from '../lib/useStats'
import { FREE_MODE, configToSearch } from '../training/config'

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Home() {
  const stats = useStats()
  const dailyGoal = useDailyGoal()
  const navigate = useNavigate()
  const { user } = useCloud()
  const firstName = user?.name?.split(' ')[0]
  const monday = weekStart(stats.today)
  const progress = Math.min(1, stats.todayJumps / dailyGoal)

  return (
    <main className="screen home">
      <header className="home-header">
        <div>
          <p className="muted">{formatDate(fromEpochDay(stats.today), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{firstName ? `¡A saltar, ${firstName}!` : '¡A saltar!'}</h1>
        </div>
        {user ? (
          <button className="avatar-btn" onClick={() => navigate('/settings')} aria-label="Perfil y ajustes">
            <Avatar name={user.name} photoUrl={user.photoUrl} size={52} />
          </button>
        ) : (
          <button className="icon-btn outlined" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Settings size={22} />
          </button>
        )}
      </header>

      <section className="card streak-card">
        <div className="streak-head">
          <div className="flame-tile">
            <Flame size={26} />
          </div>
          <div>
            <div className="streak-days">{pluralDays(stats.currentStreak)}</div>
            <div className="muted">Racha actual · Mejor: {pluralDays(stats.bestStreak)}</div>
          </div>
        </div>
        <div className="week-dots">
          {WEEK_DAYS.map((label, i) => {
            const day = monday + i
            const trained = (stats.dailyTotals.get(day) ?? 0) > 0
            const state = trained ? 'done' : day === stats.today ? 'today' : 'pending'
            return (
              <div key={i} className="week-dot">
                <span className="muted">{label}</span>
                <i className={state}>{trained && <Check size={18} strokeWidth={3} />}</i>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card today-card">
        <div className="today-head">
          <span className="label">Saltos de hoy</span>
          <span className="muted">Meta {formatNumber(dailyGoal)}</span>
        </div>
        <div className="today-jumps">{formatNumber(stats.todayJumps)}</div>
        <div className="progress lime" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="row">
          <div className="tile">
            <span className="muted">Esta semana</span>
            <strong>{formatNumber(stats.weekJumps)}</strong>
          </div>
          <div className="tile">
            <span className="muted">Récord en 1 min</span>
            <strong>{formatNumber(stats.bestMinute)}</strong>
          </div>
        </div>
      </section>

      <div className="row start-buttons">
        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/training?${configToSearch(FREE_MODE)}`)}>
          <Play size={20} fill="currentColor" /> Libre
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/series')}>
          <ListOrdered size={22} /> Series
        </button>
      </div>
    </main>
  )
}
