import { memo, useEffect, useState } from 'react'
import { getPlaceholderPreviewURL } from '@/lib/creaturePreview'

// Generic emoji -> 3D swap-in for anything that isn't a creature (food, rewards,
// party avatars): a hashed-colour cube until each gets a bespoke model.
export const EmojiSprite = memo(function EmojiSprite({ id, emoji, size = 32 }: {
  id: string
  emoji: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPlaceholderPreviewURL(id).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [id])

  return src
    ? <img src={src} width={size} height={size} alt={emoji} style={{ display: 'block' }} />
    : <span style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}>{emoji}</span>
})
