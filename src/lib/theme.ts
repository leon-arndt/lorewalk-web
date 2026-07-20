// Quiet green - primary interactive accent for navigation, selection, headings, and CTAs.
// See GameDesign.md "UI / UX Decisions" for the color rationale (chosen over Duolingo-bright
// or Geocaching-muted references). Single source of truth - don't hardcode '#166534' elsewhere.
export const accent = '#166534'
export const accentSoft = '#eaf6ec'

export function accentAlpha(alpha: number) {
  return `rgba(22,101,52,${alpha})`
}

// Indigo -> purple gradient reserved for premium/reward moments (level up, hatch reveal,
// collect reward, purchases) - deliberately distinct from the accent above, not a CTA color.
export const rewardGradient = 'linear-gradient(135deg, #818cf8, #c084fc)'
export const rewardGradientHorizontal = 'linear-gradient(90deg, #818cf8, #c084fc)'
