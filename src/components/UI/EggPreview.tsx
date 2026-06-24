import { useState, useEffect, memo } from 'react'
import { getEggPreviewURL } from '@/lib/creaturePreview'

export const EggPreview = memo(function EggPreview({
  tier,
  size = 52,
}: {
  tier: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEggPreviewURL(tier).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [tier])

  return src
    ? <img src={src} width={size} height={size} alt={`${tier} egg`} style={{ display: 'block' }} />
    : <span style={{ fontSize: size * 0.48, lineHeight: 1, opacity: 0.4 }}>🥚</span>
})
