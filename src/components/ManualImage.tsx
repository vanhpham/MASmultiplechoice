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
        <span>Ảnh minh hoạ</span>
        <small>Hiện chưa có ảnh cho câu này</small>
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
