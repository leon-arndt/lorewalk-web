import { memo, useEffect, useState } from 'react'
import { getCreaturePreviewURL } from '@/lib/creaturePreview'

const TYPE_STYLE: Record<string, { bg: string; border: string }> = {
  stray:     { bg: '#f0f4ff', border: '#c7d2fe' },
  community: { bg: '#fff7ed', border: '#fed7aa' },
  wild:      { bg: '#f0fdf4', border: '#bbf7d0' },
  mythic:    { bg: '#fdf4ff', border: '#e9d5ff' },
}

const SHINY_STYLE = { bg: '#fffbeb', border: '#f59e0b' }

export const CreaturePreview = memo(function CreaturePreview({
  species,
  emoji,
  creatureType,
  isShiny,
  size = 72,
}: {
  species: string
  emoji: string
  creatureType?: string
  isShiny?: boolean
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)
  const style = isShiny ? SHINY_STYLE : (TYPE_STYLE[creatureType ?? ''] ?? { bg: '#f1f5f9', border: '#e2e8f0' })

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    getCreaturePreviewURL(species, isShiny).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [species, isShiny])

  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: style.bg,
      border: `2px solid ${style.border}`,
      boxShadow: isShiny ? '0 0 10px rgba(245,158,11,0.45)' : undefined,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {src
        ? <img src={src} width={Math.round(size * 0.86)} height={Math.round(size * 0.86)} alt={species} style={{ display: 'block' }} />
        : <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{emoji}</span>}
    </div>
  )
})
