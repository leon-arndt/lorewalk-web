import { memo, useEffect, useState } from 'react'
import { getSpritePreviewURL } from '@/lib/creaturePreview'

// Emoji -> 3D swap-in for anything that isn't a creature. An id of the form
// food_<id> gets the dish model. Other ids still get a hashed-colour cube.
export const EmojiSprite = memo(function EmojiSprite({ id, emoji, size = 32 }: {
  id: string
  emoji: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSpritePreviewURL(id).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [id])

  return src
    ? <img src={src} width={size} height={size} alt={emoji} style={{ display: 'block' }} />
    : <span style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}>{emoji}</span>
})
