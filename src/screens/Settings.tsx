import { ArrowLeft, Globe } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Segmented } from '../components/Segmented'
import { Stepper } from '../components/Stepper'
import { signInWithGoogle, signOut, useCloud } from '../lib/cloud'
import { formatDate, formatNumber } from '../lib/format'
import {
  DEFAULT_REMINDER_MINUTES,
  disableReminder,
  enableReminder,
  formatReminderTime,
  useReminderMinutes,
} from '../lib/reminder'
import { setDailyGoal, useDailyGoal } from '../lib/settings'
import { setTheme, useTheme, type Theme } from '../lib/theme'

const clamp = (n: number) => Math.min(20_000, Math.max(100, n))
const DAY_MINUTES = 24 * 60
const REMINDER_STEP = 30

export function SettingsScreen() {
  const navigate = useNavigate()
  const dailyGoal = useDailyGoal()
  const theme = useTheme()
  const cloud = useCloud()
  const reminder = useReminderMinutes()
  const [reminderDenied, setReminderDenied] = useState(false)

  return (
    <main className="screen">
      <header className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft />
        </button>
        <h2>Ajustes</h2>
      </header>

      <p className="field-label">Perfil</p>
      <section className="card account-card">
        {!cloud.ready ? (
          <p className="muted">Cargando…</p>
        ) : cloud.user ? (
          <>
            <div className="profile">
              <Avatar name={cloud.user.name} photoUrl={cloud.user.photoUrl} size={64} />
              <div>
                <strong>{cloud.user.name ?? cloud.user.email}</strong>
                {cloud.user.name && <p className="muted small">{cloud.user.email}</p>}
              </div>
            </div>
            <p className="muted small">
              {cloud.syncing
                ? 'Sincronizando…'
                : cloud.lastSyncAt
                  ? `Respaldado en la nube · ${formatDate(new Date(cloud.lastSyncAt), { hour: '2-digit', minute: '2-digit' })}`
                  : 'Tus entrenamientos se respaldan en la nube.'}
            </p>
            <button className="btn btn-outline" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <p className="muted small">Inicia sesión para respaldar tus saltos y verlos en otro celular.</p>
            <button className="btn btn-primary" onClick={() => void signInWithGoogle()}>
              Iniciar sesión con Google
            </button>
          </>
        )}
        {cloud.error && <p className="error-text small">{cloud.error}</p>}
      </section>

      <p className="field-label">Apariencia</p>
      <Segmented<Theme>
        options={[
          { value: 'dark', label: 'Oscuro' },
          { value: 'light', label: 'Claro' },
        ]}
        value={theme}
        onChange={setTheme}
      />

      <p className="field-label">Meta</p>
      <Stepper
        label="Meta diaria de saltos"
        value={formatNumber(dailyGoal)}
        onMinus={() => void setDailyGoal(clamp(dailyGoal - 100))}
        onPlus={() => void setDailyGoal(clamp(dailyGoal + 100))}
      />

      <p className="field-label">Recordatorio diario</p>
      <Segmented<boolean>
        options={[
          { value: false, label: 'Apagado' },
          { value: true, label: 'Encendido' },
        ]}
        value={reminder != null}
        onChange={(on) => {
          setReminderDenied(false)
          if (!on) void disableReminder()
          else void enableReminder(DEFAULT_REMINDER_MINUTES).then((ok) => setReminderDenied(!ok))
        }}
      />
      {reminder != null && (
        <Stepper
          label="Hora"
          value={formatReminderTime(reminder)}
          onMinus={() => void enableReminder((reminder - REMINDER_STEP + DAY_MINUTES) % DAY_MINUTES)}
          onPlus={() => void enableReminder((reminder + REMINDER_STEP) % DAY_MINUTES)}
        />
      )}
      {reminderDenied ? (
        <p className="error-text small">Activa las notificaciones de JumpTrack en los ajustes del celular.</p>
      ) : (
        <p className="muted small">Te avisa si aún no llegas a tu meta del día. Si ya la cumpliste, no suena.</p>
      )}

      <footer className="credits">
        <p className="muted small">Hecho por</p>
        <strong>Sebastian Londoño</strong>
        <div className="credits-links">
          <a className="nav-circle" href="https://sebaslondev-portfolio.vercel.app" target="_blank" rel="noreferrer" aria-label="Sitio web">
            <Globe size={20} />
          </a>
          <a className="nav-circle" href="https://instagram.com/sebax_lond" target="_blank" rel="noreferrer" aria-label="Instagram">
            <InstagramIcon />
          </a>
        </div>
      </footer>
    </main>
  )
}

/** lucide-react ya no incluye logos de marcas. */
function InstagramIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
