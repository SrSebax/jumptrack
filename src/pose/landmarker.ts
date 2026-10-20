import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

let instance: Promise<PoseLandmarker> | null = null

/** Carga (una sola vez) el detector de pose con el wasm y el modelo empaquetados en la app. */
export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  instance ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    const create = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    try {
      return await create('GPU')
    } catch {
      return await create('CPU')
    }
  })()
  instance.catch(() => {
    instance = null
  })
  return instance
}
