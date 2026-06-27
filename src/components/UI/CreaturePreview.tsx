import { memo } from 'react'

const TYPE_STYLE: Record<string, { bg: string; border: string }> = {
  stray:     { bg: '#f0f4ff', border: '#c7d2fe' },
  community: { bg: '#fff7ed', border: '#fed7aa' },
  wild:      { bg: '#f0fdf4', border: '#bbf7d0' },
  mythic:    { bg: '#fdf4ff', border: '#e9d5ff' },
}

export const CreaturePreview = memo(function CreaturePreview({
  emoji,
  creatureType,
  size = 72,
}: {
  emoji: string
  creatureType?: string
  size?: number
}) {
  const style = TYPE_STYLE[creatureType ?? ''] ?? { bg: '#f1f5f9', border: '#e2e8f0' }
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: style.bg, border: `2px solid ${style.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{emoji}</span>
    </div>
  )
})
