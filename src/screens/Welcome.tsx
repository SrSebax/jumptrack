import { CloudUpload } from 'lucide-react'
import { useState } from 'react'
import { signInWithGoogle, skipLogin, useCloud } from '../lib/cloud'

/** Primera pantalla si no hay sesión: invita a iniciar sesión para respaldar los saltos. */
export function Welcome() {
  const { error } = useCloud()
  const [busy, setBusy] = useState(false)

  return (
    <main className="screen welcome">
      <div className="welcome-hero">
        <img src="/logo.png" alt="" width={112} height={112} />
        <h1>JumpTrack</h1>
        <p className="muted">Cuenta tus saltos con la cámara y mantén tu racha.</p>
      </div>

      <section className="card welcome-card">
        <CloudUpload size={28} />
        <div>
          <strong>Respalda tus saltos</strong>
          <p className="muted small">Inicia sesión para guardar tus entrenamientos en la nube y no perderlos si cambias o borras la app.</p>
        </div>
      </section>

      <div className="welcome-actions">
        <button
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void signInWithGoogle().finally(() => setBusy(false))
          }}
        >
          {busy ? 'Abriendo Google…' : 'Iniciar sesión con Google'}
        </button>
        <button className="btn btn-text" onClick={() => void skipLogin()}>
          Continuar sin cuenta
        </button>
        {error && <p className="error-text small center">{error}</p>}
      </div>
    </main>
  )
}
