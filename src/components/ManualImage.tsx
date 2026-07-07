import { useState } from 'react'
import { en } from '../i18n/en'

interface ManualImageProps {
  src: string | null
  alt: string
}

export function ManualImage({ src, alt }: ManualImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="manual-image missing">
        <span>{en.manualImage.title}</span>
        <small>{en.manualImage.placeholder}</small>
      </div>
    )
  }

  return (
    <img
      className="manual-image"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  )
}
