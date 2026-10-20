import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'jumptrack.theme'
const BACKGROUNDS: Record<Theme, string> = { dark: '#0e0f12', light: '#f3f4ef' }

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Aplica el tema a la página y a las barras del sistema (iconos claros u oscuros). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUNDS[theme])
  SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {
    // En el navegador no hay barras del sistema que ajustar.
  })
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento el tema dura solo esta sesión.
  }
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}
