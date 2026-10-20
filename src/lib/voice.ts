import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech'

/**
 * Avisos por voz. En Android usa el TTS nativo; en el navegador, speechSynthesis.
 * [interrupt] corta lo que se esté diciendo (cuentas regresivas).
 */
export function speak(text: string, interrupt = false): void {
  TextToSpeech.speak({
    text,
    lang: 'es-ES',
    rate: 1.05,
    queueStrategy: interrupt ? QueueStrategy.Flush : QueueStrategy.Add,
  }).catch(() => {
    // Sin motor de voz disponible: el entrenamiento sigue sin avisos.
  })
}
