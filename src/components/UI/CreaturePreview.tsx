import { useState, useEffect, memo } from 'react'
import { getCreaturePreviewURL } from '@/lib/creaturePreview'

export const CreaturePreview = memo(function CreaturePreview({
  category,
  size = 72,
}: {
  category: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(category).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [category])

  return src
    ? <img src={src} width={size} height={size} alt={category} style={{ display: 'block' }} />
    : <div style={{
        width: size, height: size, borderRadius: '50%', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.38, opacity: 0.25 }}>🐾</span>
      </div>
})
