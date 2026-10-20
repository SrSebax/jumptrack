import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/Stepper'
import { formatNumber } from '../lib/format'
import { setDailyGoal, useDailyGoal } from '../lib/settings'

const clamp = (n: number) => Math.min(20_000, Math.max(100, n))

export function SettingsScreen() {
  const navigate = useNavigate()
  const dailyGoal = useDailyGoal()

  return (
    <main className="screen">
      <header className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft />
        </button>
        <h2>Ajustes</h2>
      </header>

      <Stepper
        label="Meta diaria de saltos"
        value={formatNumber(dailyGoal)}
        onMinus={() => void setDailyGoal(clamp(dailyGoal - 100))}
        onPlus={() => void setDailyGoal(clamp(dailyGoal + 100))}
      />
      <p className="muted small">Tus datos se guardan solo en este dispositivo.</p>
    </main>
  )
}
