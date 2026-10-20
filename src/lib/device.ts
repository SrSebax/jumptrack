import { App } from '@capacitor/app'
import { KeepAwake } from '@capacitor-community/keep-awake'

export function keepScreenOn(on: boolean): void {
  ;(on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {})
}

type BackHandler = () => void
const backHandlers: BackHandler[] = []

/** Intercepta el botón atrás de Android mientras el componente esté montado. */
export function pushBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler)
  return () => {
    const index = backHandlers.lastIndexOf(handler)
    if (index >= 0) backHandlers.splice(index, 1)
  }
}

export function installBackButton(): void {
  App.addListener('backButton', ({ canGoBack }) => {
    const handler = backHandlers.at(-1)
    if (handler) handler()
    else if (canGoBack) window.history.back()
    else App.exitApp()
  }).catch(() => {
    // En el navegador no existe el botón atrás nativo.
  })
}
