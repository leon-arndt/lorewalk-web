import type { CSSProperties } from 'react'
import { edge, ink, inkHint, line, paper, paperCard, paperLight } from '@/lib/theme'

// The app's surfaces: smooth paper with hairline edges. Only the controls that
// float over the map are see-through.

// One corner for every button, tag, and map marker.
export const RADIUS = 10

export const MONO = "'DM Mono', ui-monospace, monospace"

// The type scale. Text uses these seven sizes and no other. An ESLint rule
// (eslint.config.js) rejects a fontSize that is not in the scale. An emoji
// that stands in for an icon can be 48 or 64.
export const TYPE = { caption: 11, small: 12, body: 13, lead: 15, title: 19, heading: 24, display: 28 } as const

// Small caps captions, counters, and stamps.
export const monoLabel: CSSProperties = {
  fontFamily: MONO, fontSize: 11, lineHeight: '14px', letterSpacing: '0.01em', color: inkHint,
}

// HUD tags, small buttons, status badges.
export const paperTag: CSSProperties = {
  background: paperLight,
  border: `1px solid ${edge}`,
  borderRadius: RADIUS,
  color: ink,
}

// The controls that float over the map: tracing paper. A little of the map
// shows through, softly blurred. This is the one place the app uses a blur.
// Tune the amount here: HUD_ALPHA is how solid the paper is.
const HUD_ALPHA = 0.72
const HUD_BLUR = 'blur(10px) saturate(130%)'
export const hudTag: CSSProperties = {
  ...paperTag,
  background: `rgba(251,246,233,${HUD_ALPHA})`,
  backdropFilter: HUD_BLUR,
  WebkitBackdropFilter: HUD_BLUR,
}
// The same tracing paper for a surface with its own colour, such as an index tab.
export function vellum(r: number, g: number, b: number): CSSProperties {
  return { background: `rgba(${r},${g},${b},${HUD_ALPHA + 0.04})`, backdropFilter: HUD_BLUR, WebkitBackdropFilter: HUD_BLUR }
}

// Bottom sheets and panels over the map.
export const paperPanel: CSSProperties = {
  background: paperLight,
  border: `1px solid ${edge}`,
  boxShadow: '0 -2px 0 rgba(51,40,30,0.08)',
}

// The tab bar. BottomNav draws each tab itself, so this is only the strip behind them.
export const paperNav: CSSProperties = {
  background: 'transparent',
}

// Full-screen pages: smooth cream paper.
export const paperPage: CSSProperties = {
  backgroundColor: paper,
}

// Bottom sheets over a dark scrim.
export const paperSheet: CSSProperties = {
  background: paperLight,
  borderTop: `1px solid ${edge}`,
}

// A card on the page: a specimen card, a list group, a settings block.
export const paperCardStyle: CSSProperties = {
  background: paperCard,
  border: `1px solid ${line}`,
  borderRadius: 6,
  boxShadow: '1px 2px 0 rgba(51,40,30,0.14)',
}

// The dark veil behind a sheet or dialog.
export const SCRIM = 'rgba(51,40,30,0.5)'
// A deeper veil for a celebration, so the page behind does not pull the eye.
export const SCRIM_DEEP = 'rgba(51,40,30,0.74)'

// A strip of striped washi tape. Position it absolutely on the top edge of a card.
const stripes = (a: string, b: string) => `repeating-linear-gradient(45deg, ${a} 0px, ${a} 5px, ${b} 5px, ${b} 10px)`
export const TAPES = [
  stripes('#9FD3C0', '#C6E6DA'),  // mint
  stripes('#E8C15A', '#F3DC9A'),  // mustard
  stripes('#F2A08B', '#F8C7BA'),  // coral
]
export const tape: CSSProperties = {
  position: 'absolute', width: 58, height: 16,
  backgroundImage: TAPES[0], opacity: 0.85, pointerEvents: 'none',
}

// A white edge around a creature or an egg, like a die-cut sticker.
export const STICKER = 'drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff)'
