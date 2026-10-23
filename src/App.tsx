import { CalendarDays, House, Timer } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { useCloud, useLoginSkipped } from './lib/cloud'
import { useReminderSync } from './lib/reminder'
import { useStreakGuard } from './lib/streakGuard'
import { useWidgetSync } from './lib/widget'
import { Calendar } from './screens/Calendar'
import { Home } from './screens/Home'
import { Rewards } from './screens/Rewards'
import { SettingsScreen } from './screens/Settings'
import { SeriesSetup } from './screens/SeriesSetup'
import { Summary } from './screens/Summary'
import { Welcome } from './screens/Welcome'

// MediaPipe es pesado: solo se descarga al entrar a entrenar.
const Training = lazy(() => import('./screens/Training').then((m) => ({ default: m.Training })))

const TABS = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/series', label: 'Entrenar', icon: Timer },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
]

function TabLayout() {
  return (
    <div className="tab-layout">
      <Outlet />
      <nav className="bottom-nav">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end replace={to !== "/series"}>
            <Icon size={24} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  useWidgetSync()
  useReminderSync()
  useStreakGuard()
  const cloud = useCloud()
  const loginSkipped = useLoginSkipped()

  // Mientras se restaura la sesión no se pinta nada, para no mostrar el login un instante a quien ya entró.
  if (!cloud.ready || loginSkipped === undefined) return null
  if (!cloud.user && !loginSkipped) return <Welcome />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<Home />} />
          <Route path="series" element={<SeriesSetup />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="rewards" element={<Rewards />} />
        <Route
          path="training"
          element={
            <Suspense fallback={<main className="training" />}>
              <Training />
            </Suspense>
          }
        />
        <Route path="summary/:id" element={<Summary />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
