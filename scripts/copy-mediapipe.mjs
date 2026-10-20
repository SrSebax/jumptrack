// Copia el runtime wasm de MediaPipe a public/ para que el detector funcione sin internet.
import { cpSync, existsSync } from 'node:fs'

const from = 'node_modules/@mediapipe/tasks-vision/wasm'
const to = 'public/mediapipe/wasm'

if (!existsSync(from)) {
  console.error(`No se encontró ${from}. ¿Corriste npm install?`)
  process.exit(1)
}
cpSync(from, to, { recursive: true })
