import type { CSSProperties } from 'react'

const BD = 'blur(40px) saturate(200%) brightness(1.04)'
const BD_HEAVY = 'blur(60px) saturate(200%) brightness(1.02)'
// Top-edge specular: the key detail that makes glass read as a physical material
const SPEC = 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -0.5px 0 rgba(0,0,0,0.04)'

// HUD pills, small buttons, status badges
export const glassChrome: CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: BD,
  WebkitBackdropFilter: BD,
  border: '1px solid rgba(255,255,255,0.72)',
  boxShadow: `${SPEC}, 0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)`,
}

// Bottom sheets, large panels floating over the map
export const glassPanel: CSSProperties = {
  background: 'rgba(255,255,255,0.76)',
  backdropFilter: BD_HEAVY,
  WebkitBackdropFilter: BD_HEAVY,
  border: '1px solid rgba(255,255,255,0.72)',
  boxShadow: `${SPEC}, 0 -8px 40px rgba(0,0,0,0.10), 0 -2px 10px rgba(0,0,0,0.05)`,
}

// Nav pill outer container
export const glassNav: CSSProperties = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: BD,
  WebkitBackdropFilter: BD,
  border: '1px solid rgba(255,255,255,0.75)',
  boxShadow: `${SPEC}, 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)`,
  borderRadius: 999,
}

// Full-screen pages (every tab but the map, the journal, the news). The map stays
// mounted under them, so it shows through as a soft blur of the player's area.
// Tune the see-through here: lower alpha shows more map, lower blur more detail.
const PAGE_BD = 'blur(24px) saturate(170%)'
export const glassPage: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(244,250,245,0.80) 0%, rgba(236,246,238,0.62) 45%, rgba(236,246,238,0.70) 100%)',
  backdropFilter: PAGE_BD,
  WebkitBackdropFilter: PAGE_BD,
}

// Bottom sheets over a dark scrim. Same material as glassPage, but opaque enough
// that the scrim does not turn the sheet grey.
export const glassSheet: CSSProperties = {
  background: 'rgba(246,251,247,0.90)',
  backdropFilter: BD_HEAVY,
  WebkitBackdropFilter: BD_HEAVY,
}
