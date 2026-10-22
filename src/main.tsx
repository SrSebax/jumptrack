import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@fontsource-variable/manrope'
import '@fontsource-variable/space-grotesk'
import './index.css'
import { initCloud } from './lib/cloud'
import { installBackButton } from './lib/device'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())
installBackButton()
initCloud()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
