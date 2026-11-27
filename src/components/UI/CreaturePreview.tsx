import { memo, useEffect, useState } from 'react'
import { getCreaturePreviewURL } from '@/lib/creaturePreview'
import { LoadingDot } from '@/components/UI/LoadingDot'
import { categoryCss, line, ochre, paperCard } from '@/lib/theme'

// A wash per creature type, in the same muted colours as the map pins.
const TYPE_WASH: Record<string, string> = {
  stray: categoryCss('landmark'),
  community: categoryCss('heritage'),
  wild: categoryCss('nature'),
  critter: categoryCss('religious'),
  mythic: categoryCss('arts'),
}

export const CreaturePreview = memo(function CreaturePreview({
  species,
  emoji,
  creatureType,
  isShiny,
  size = 72,
  wash,
}: {
  species: string
  emoji: string
  creatureType?: string
  isShiny?: boolean
  size?: number
  // A colour for the wash, in place of the one for the creature type.
  wash?: string
}) {
  const [result, setResult] = useState<{ key: string; url: string | null } | null>(null)
  const key = `${species}|${!!isShiny}`
  const tint = wash ?? TYPE_WASH[creatureType ?? ''] ?? categoryCss('')

  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(species, isShiny)
      .catch(() => null)
      .then((url) => { if (!cancelled) setResult({ key, url }) })
    return () => { cancelled = true }
  }, [species, isShiny]) // eslint-disable-line react-hooks/exhaustive-deps
  const src = result?.key === key ? result.url : undefined

  return (
    <div style={{
      width: size, height: size, borderRadius: 3,
      // Two flat layers, so the tile stays opaque over a scrim.
      backgroundColor: paperCard,
      backgroundImage: `linear-gradient(${tint}38, ${tint}38)`,
      border: isShiny ? `1.5px solid ${ochre}` : `1px solid ${line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {src === undefined ? <LoadingDot size={Math.round(size * 0.6)} /> : src
        ? <img src={src} width={Math.round(size * 0.86)} height={Math.round(size * 0.86)} alt={species} style={{ display: 'block' }} />
        : <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{emoji}</span>}
    </div>
  )
})
