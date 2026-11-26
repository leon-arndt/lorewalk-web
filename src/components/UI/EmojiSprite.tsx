import { memo, useEffect, useState } from 'react'
import { getSpritePreviewURL } from '@/lib/creaturePreview'
import { LoadingDot } from '@/components/UI/LoadingDot'

// Emoji -> 3D swap-in for anything that isn't a creature. An id of the form
// food_<id> or item_<type> gets its model. A dot pulses while it loads. The
// emoji shows only when there is no model or the render fails.
export const EmojiSprite = memo(function EmojiSprite({ id, emoji, size = 32 }: {
  id: string
  emoji: string
  size?: number
}) {
  // undefined: loading. null: no render.
  const [result, setResult] = useState<{ id: string; url: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    getSpritePreviewURL(id)
      .catch(() => null)
      .then((url) => { if (!cancelled) setResult({ id, url }) })
    return () => { cancelled = true }
  }, [id])

  const src = result?.id === id ? result.url : undefined
  if (src === undefined) return <LoadingDot size={size} />
  return src
    ? <img src={src} width={size} height={size} alt={emoji} style={{ display: 'block' }} />
    : <span style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}>{emoji}</span>
})
