import { useState } from 'react'

interface Props {
  name: string | null
  photoUrl: string | null
  size: number
}

/** Foto de la cuenta de Google, o la inicial si no hay foto o no carga (sin internet). */
export function Avatar({ name, photoUrl, size }: Props) {
  const [failed, setFailed] = useState(false)
  const initial = (name?.trim()[0] ?? '?').toUpperCase()
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {photoUrl && !failed ? (
        <img src={photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        initial
      )}
    </span>
  )
}
