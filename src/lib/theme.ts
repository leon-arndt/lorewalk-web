// Field journal palette. The app looks like an explorer's notebook: ruled paper,
// ink outlines, red stamps. See GameDesign.md "UI / UX Decisions".
// Single source of truth - do not hardcode these hex values elsewhere.
export const paper = '#F2E8D0'        // the page itself
export const paperLight = '#FBF6E9'   // tags, notes, and panels taped on the page
export const paperCard = '#FFFDF6'    // specimen cards and list rows
export const paperShade = '#E2D3AE'   // inactive tabs, tracks, pressed areas
export const line = '#B9A885'         // hairlines and card edges
export const ink = '#33281E'          // text and outlines
export const inkSoft = '#6A5843'      // secondary text
export const inkHint = '#75634C'      // hints and captions, still AA on paper
export const stamp = '#A8361F'        // red ink: stamps, alerts, the active tab
export const forest = '#2F6B4F'       // progress and success
export const indigo = '#2E4A7D'       // links, water, cool accents
export const ochre = '#C98A1E'        // coins, medals, Premium
export const ochreInk = '#8A5A12'     // ochre as text: the plain ochre is too light to read
export const pencil = '#8C7A5C'       // dashed outlines of empty slots, never text

// The primary interactive colour: headings, selection, and filled buttons use ink.
export const accent = ink
export const accentSoft = '#EADFC2'

export function accentAlpha(alpha: number) {
  return `rgba(51,40,30,${alpha})`
}

// A creature's type is its POI category. One colour per type, shared by the 3D map
// pins, the map companions, and the collection grid. Muted, like watercolour washes.
export const categoryColors: Record<string, number> = {
  heritage: 0xd9a441,
  landmark: 0x5b6fb0,
  arts: 0x8e6bb8,
  religious: 0xe0be4a,
  museum: 0xc97a8e,
  nature: 0x4e8f5c,
}
export const categoryCss = (category: string) =>
  `#${(categoryColors[category] ?? 0x8c7a5c).toString(16).padStart(6, '0')}`

// Reward and Premium moments use red stamp ink, not the ink accent above.
export const rewardGradient = stamp
export const rewardGradientHorizontal = stamp
