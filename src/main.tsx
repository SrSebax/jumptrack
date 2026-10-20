import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@fontsource-variable/manrope'
import '@fontsource-variable/space-grotesk'
import './index.css'
import { installBackButton } from './lib/device'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())
installBackButton()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
