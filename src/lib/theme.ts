// Quiet green - primary interactive accent for navigation, selection, headings, and CTAs.
// See GameDesign.md "UI / UX Decisions" for the color rationale (chosen over Duolingo-bright
// or Geocaching-muted references). Single source of truth - don't hardcode '#166534' elsewhere.
export const accent = '#166534'
export const accentSoft = '#eaf6ec'

export function accentAlpha(alpha: number) {
  return `rgba(22,101,52,${alpha})`
}

// Indigo -> purple gradient reserved for premium/reward moments (hatch reveal, collect
// reward, purchases) - deliberately distinct from the accent above, not a CTA color.
// Level indicators use the green accent instead, not this gradient.
// A creature's type is its POI category. One colour per type, shared by the 3D map
// pins, the map companions, and the collection grid.
export const categoryColors: Record<string, number> = {
  heritage: 0xf59e0b,
  landmark: 0x6366f1,
  arts: 0xa855f7,
  religious: 0xfacc15,
  museum: 0xf472b6,
  nature: 0x22c55e,
}
export const categoryCss = (category: string) =>
  `#${(categoryColors[category] ?? 0x94a3b8).toString(16).padStart(6, '0')}`

export const rewardGradient = 'linear-gradient(135deg, #818cf8, #c084fc)'
export const rewardGradientHorizontal = 'linear-gradient(90deg, #818cf8, #c084fc)'
