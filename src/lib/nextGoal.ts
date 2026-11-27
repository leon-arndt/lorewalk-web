import { haversineDistance } from '@/lib/mapUtils'
import { isEggReady, isPoiLocked } from '@/lib/profile'
import type { PlayerPosition, PlayerProfile, Poi } from '@/types'

// The one most useful thing for the player to do next. The map shows it as a slim bar.
export type NextGoal =
  | { kind: 'egg'; poiName: string }
  | { kind: 'squad'; name: string }
  | { kind: 'chest' }
  | { kind: 'poi'; poi: Poi; distanceM: number | null }

// Something to collect comes first: it is a reward the player already earned.
// After that comes the nearest landmark that the player can still check in at.
// With no GPS fix the first such landmark shows without a distance. Returns
// null when nothing is ready and every nearby landmark is visited.
export function pickNextGoal(input: {
  profile: PlayerProfile
  readySquadName: string | null
  pois: Poi[]
  visitedPois: Set<string>
  position: PlayerPosition | null
}): NextGoal | null {
  const { profile, readySquadName, pois, visitedPois, position } = input

  const egg = profile.eggs.find(isEggReady)
  if (egg) return { kind: 'egg', poiName: egg.poiName }
  if (readySquadName) return { kind: 'squad', name: readySquadName }
  if (profile.pendingStreakChest) return { kind: 'chest' }

  const open = pois.filter((p) => !visitedPois.has(p.id) && !isPoiLocked(p, profile))
  if (open.length === 0) return null
  if (!position) return { kind: 'poi', poi: open[0], distanceM: null }

  let best = open[0]
  let bestM = Infinity
  for (const poi of open) {
    const m = haversineDistance(position.latitude, position.longitude, poi.lat, poi.lon)
    if (m < bestM) { best = poi; bestM = m }
  }
  return { kind: 'poi', poi: best, distanceM: bestM }
}

// "320 m" below a kilometre, in steps of 10 m so the number does not flicker. "1.4 km" above.
export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`
}
