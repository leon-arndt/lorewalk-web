import { skinToneById, hairColorById, eyeColorById, cosmeticItemById, toCssColor } from '@/data/cosmetics'
import type { PlayerAppearance } from '@/types'

interface PlayerFaceIconProps {
  appearance: PlayerAppearance
  size?: number
}

// A small animated 2D portrait built from the player's own PlayerAppearance,
// replacing the generic compass-emoji placeholder in the profile header. Blinks
// via SMIL <animate> (self-contained, no JS timers needed for a tiny HUD icon)
// and idles with a gentle sway (player-face-idle, see index.css).
export function PlayerFaceIcon({ appearance, size = 64 }: PlayerFaceIconProps) {
  const skin = toCssColor(skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69)
  const hair = toCssColor(hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a)
  const eye = toCssColor(eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621)
  const headItem = appearance.headItemId !== 'none' ? cosmeticItemById(appearance.headItemId) : undefined
  const itemColor = headItem ? toCssColor(headItem.color) : undefined

  return (
    <div className="player-face-idle" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="56" r="34" fill={skin} />

        <path d="M16 56 A34 34 0 0 1 84 56 L84 40 A34 28 0 0 0 16 40 Z" fill={hair} />

        <ellipse cx="38" cy="54" rx="4" ry="4" fill={eye}>
          <animate attributeName="ry" values="4;4;0.5;4;4" keyTimes="0;0.92;0.96;1;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="62" cy="54" rx="4" ry="4" fill={eye}>
          <animate attributeName="ry" values="4;4;0.5;4;4" keyTimes="0;0.92;0.96;1;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>

        <path d="M41 67 Q50 73 59 67" stroke="#00000055" strokeWidth={2.5} fill="none" strokeLinecap="round" />

        {headItem?.id === 'beanie' && (
          <>
            <path d="M13 44 A37 36 0 0 1 87 44 L87 26 A37 30 0 0 0 13 26 Z" fill={itemColor} />
            <rect x="13" y="40" width="74" height="8" rx="4" fill={itemColor} />
            <circle cx="50" cy="16" r="5" fill={itemColor} />
          </>
        )}
        {headItem?.id === 'sunhat' && (
          <>
            <path d="M20 34 A30 24 0 0 1 80 34 Z" fill={itemColor} />
            <ellipse cx="50" cy="34" rx="44" ry="6" fill={itemColor} />
          </>
        )}
        {headItem && headItem.id !== 'beanie' && headItem.id !== 'sunhat' && (
          <>
            <path d="M13 44 A37 36 0 0 1 87 44 L87 26 A37 30 0 0 0 13 26 Z" fill={itemColor} />
            <path d="M13 44 Q50 52 87 44 L87 39 Q50 47 13 39 Z" fill={itemColor} opacity={0.75} />
          </>
        )}
      </svg>
    </div>
  )
}
