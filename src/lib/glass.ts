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

// Gradient background for non-map pages — gives glass chrome something to refract
export const pageBackground = 'linear-gradient(160deg, #f8faff 0%, #f2efff 55%, #fdf6ff 100%)'
