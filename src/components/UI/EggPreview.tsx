import { useState, useEffect, memo } from 'react'
import { getEggPreviewURL } from '@/lib/creaturePreview'
import { LoadingDot } from '@/components/UI/LoadingDot'

export const EggPreview = memo(function EggPreview({
  tier,
  size = 52,
}: {
  tier: string
  size?: number
}) {
  const [result, setResult] = useState<{ tier: string; url: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    getEggPreviewURL(tier)
      .catch(() => null)
      .then((url) => { if (!cancelled) setResult({ tier, url }) })
    return () => { cancelled = true }
  }, [tier])

  const src = result?.tier === tier ? result.url : undefined
  if (src === undefined) return <LoadingDot size={size} />
  return src
    ? <img src={src} width={size} height={size} alt={`${tier} egg`} style={{ display: 'block' }} />
    : <span style={{ fontSize: size * 0.48, lineHeight: 1, opacity: 0.4 }}>🥚</span>
})
