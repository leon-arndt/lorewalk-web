import { useEffect, useState } from 'react'
import { skinToneById, hairColorById, eyeColorById, cosmeticItemById, toCssColor } from '@/data/cosmetics'
import { appearanceKey, getAvatarPortraitURL } from '@/lib/creaturePreview'
import type { PlayerAppearance } from '@/types'

interface PlayerFaceIconProps {
  appearance: PlayerAppearance
  size?: number
}

// A small portrait of a player's cube avatar: a head-and-shoulders render of the
// real model (getAvatarPortraitURL), so friends look like they do on the map.
// Until the render is ready, or without WebGL, a blocky SVG face in the same style
// stands in and blinks via SMIL. Both idle with a gentle sway (player-face-idle).
export function PlayerFaceIcon({ appearance, size = 64 }: PlayerFaceIconProps) {
  const key = appearanceKey(appearance)
  const [portrait, setPortrait] = useState<{ key: string; url: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    getAvatarPortraitURL(appearance).then((url) => { if (!cancelled) setPortrait({ key, url }) })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const url = portrait?.key === key ? portrait.url : null

  return (
    <div className="player-face-idle" style={{ width: size, height: size }}>
      {url
        ? <img src={url} width={size} height={size} alt="" style={{ display: 'block' }} />
        : <BlockyFace appearance={appearance} size={size} />}
    </div>
  )
}

function BlockyFace({ appearance, size }: PlayerFaceIconProps) {
  const skin = toCssColor(skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69)
  const hair = toCssColor(hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a)
  const eye = toCssColor(eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621)
  const headItem = appearance.headItemId !== 'none' ? cosmeticItemById(appearance.headItemId) : undefined
  const itemColor = headItem ? toCssColor(headItem.color) : undefined
  const longHair = appearance.bodyId === 'longHair'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {longHair && <rect x="14" y="22" width="72" height="66" rx="6" fill={hair} />}
      <rect x="20" y="24" width="60" height="58" rx="7" fill={skin} />
      <rect x="17" y="17" width="66" height="20" rx="6" fill={hair} />
      {!longHair && <rect x="58" y="31" width="20" height="10" rx="3" fill={hair} />}

      {[33, 60].map((x) => (
        <rect key={x} x={x} y="48" width="7" height="12" rx="1.5" fill={eye}>
          <animate attributeName="height" values="12;12;1.5;12;12" keyTimes="0;0.92;0.96;1;1" dur="4.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="48;48;53;48;48" keyTimes="0;0.92;0.96;1;1" dur="4.2s" repeatCount="indefinite" />
        </rect>
      ))}

      {headItem?.id === 'beanie' && (
        <>
          <rect x="14" y="8" width="72" height="26" rx="5" fill={itemColor} />
          <rect x="43" y="1" width="14" height="10" rx="2" fill={itemColor} opacity={0.85} />
        </>
      )}
      {headItem?.id === 'sunhat' && (
        <>
          <rect x="22" y="4" width="56" height="20" rx="4" fill={itemColor} />
          <rect x="2" y="20" width="96" height="8" rx="3" fill={itemColor} />
        </>
      )}
      {headItem && headItem.id !== 'beanie' && headItem.id !== 'sunhat' && (
        <>
          <rect x="15" y="9" width="70" height="20" rx="5" fill={itemColor} />
          <rect x="15" y="25" width="70" height="6" rx="2" fill={itemColor} opacity={0.75} />
        </>
      )}
    </svg>
  )
}
