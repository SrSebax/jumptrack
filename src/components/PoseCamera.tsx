import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import { loadPoseLandmarker } from '../pose/landmarker'

type Status = 'loading' | 'ready' | 'denied' | 'error'

interface Props {
  facingMode: 'user' | 'environment'
  onPose: (landmarks: NormalizedLandmark[] | null) => void
  onReady: () => void
}

/** Vídeo de la cámara a pantalla completa + detección de pose en cada frame. */
export function PoseCamera({ facingMode, onPose, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onPoseRef = useRef(onPose)
  const onReadyRef = useRef(onReady)
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    onPoseRef.current = onPose
    onReadyRef.current = onReady
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let stream: MediaStream | null = null
    let frame = 0

    const run = async () => {
      try {
        const landmarker = await loadPoseLandmarker()
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) return
        video.srcObject = stream
        await video.play()
        if (cancelled) return
        setStatus('ready')
        onReadyRef.current()

        let lastTime = -1
        const loop = () => {
          if (cancelled) return
          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime
            const result = landmarker.detectForVideo(video, performance.now())
            onPoseRef.current(result.landmarks[0] ?? null)
          }
          frame = requestAnimationFrame(loop)
        }
        loop()
      } catch (error) {
        if (cancelled) return
        console.error('Cámara o detector no disponibles', error)
        setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'error')
      }
    }
    setStatus('loading')
    void run()

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [facingMode, attempt])

  return (
    <>
      <video
        ref={videoRef}
        className={`camera${facingMode === 'user' ? ' mirrored' : ''}`}
        playsInline
        muted
      />
      {(status === 'denied' || status === 'error') && (
        <div className="camera-status">
          <p>
            {status === 'denied'
              ? 'JumpTrack necesita la cámara para contar tus saltos. Las imágenes se procesan en el teléfono y no se guardan.'
              : 'No se pudo abrir la cámara.'}
          </p>
          <button className="btn btn-primary" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}
    </>
  )
}
