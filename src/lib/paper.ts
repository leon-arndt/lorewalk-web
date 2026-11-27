import type { CSSProperties } from 'react'
import { ink, inkHint, line, paper, paperCard, paperLight } from '@/lib/theme'

// The app's surfaces. Everything is paper: opaque, with an ink edge, no blur.

export const MONO = "'DM Mono', ui-monospace, monospace"

// Small caps captions, counters, and stamps.
export const monoLabel: CSSProperties = {
  fontFamily: MONO, fontSize: 11, lineHeight: '14px', letterSpacing: '0.01em', color: inkHint,
}

// HUD tags, small buttons, status badges.
export const paperTag: CSSProperties = {
  background: paperLight,
  border: `1.5px solid ${ink}`,
  borderRadius: 6,
  color: ink,
}

// Bottom sheets and panels over the map.
export const paperPanel: CSSProperties = {
  background: paperLight,
  border: `1.5px solid ${ink}`,
  boxShadow: '0 -3px 0 rgba(51,40,30,0.12)',
}

// The tab bar. BottomNav draws each tab itself, so this is only the strip behind them.
export const paperNav: CSSProperties = {
  background: 'transparent',
}

const RULES = 'repeating-linear-gradient(0deg, rgba(51,40,30,0.07) 0px, rgba(51,40,30,0.07) 1px, transparent 1px, transparent 28px)'

// Full-screen pages: ruled notebook paper.
export const paperPage: CSSProperties = {
  backgroundColor: paper,
  backgroundImage: RULES,
}

// Bottom sheets over a dark scrim.
export const paperSheet: CSSProperties = {
  background: paperLight,
  borderTop: `1.5px solid ${ink}`,
}

// A card on the page: a specimen card, a list group, a settings block.
export const paperCardStyle: CSSProperties = {
  background: paperCard,
  border: `1px solid ${line}`,
  borderRadius: 4,
  boxShadow: '1px 2px 0 rgba(51,40,30,0.18)',
}

// The dark veil behind a sheet or dialog.
export const SCRIM = 'rgba(51,40,30,0.5)'
// A deeper veil for a celebration, so the page behind does not pull the eye.
export const SCRIM_DEEP = 'rgba(51,40,30,0.74)'

// A strip of paper tape. Position it absolutely on the top edge of a card.
export const tape: CSSProperties = {
  position: 'absolute', width: 58, height: 18,
  background: 'rgba(214,178,94,0.6)', pointerEvents: 'none',
}
