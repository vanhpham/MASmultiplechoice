import { useState } from 'react'

interface ManualImageProps {
  src: string | null
  alt: string
}

export function ManualImage({ src, alt }: ManualImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="manual-image missing">
        <span>🖼️ Cần ảnh minh họa</span>
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
