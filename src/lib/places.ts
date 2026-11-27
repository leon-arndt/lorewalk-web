import { FOODS } from '@/data/foods'
import { haversineDistance } from '@/lib/mapUtils'
import type { DailyFind, FindKind, FoodSpot, Poi, PoiTier } from '@/types'

// The imported places of Singapore: heritage markers, local spots, food spots,
// and the public spots where a daily find can lie. tools/poi-import builds the
// file from open data. The curated landmarks stay in data/singapore-pois.ts.

const PLACES_URL = '/pois/sg-places.json'

export interface LatLon {
  lat: number
  lon: number
}

export interface PlacesData {
  places: Poi[]
  foodSpots: FoodSpot[]
  anchorCells: Map<string, LatLon[]>
}

interface PlaceRow {
  id: string
  name: string
  lat: number
  lon: number
  tier: PoiTier
  category: string
  src: string
  area?: string
  url?: string
  desc?: string
}

interface PlacesFile {
  sources: Record<string, string>
  places: PlaceRow[]
  foodSpots: FoodSpot[]
  anchors: number[]
}

const TIER_POINTS: Record<PoiTier, number> = { landmark: 5, marker: 3, spot: 2 }

export function poiTier(poi: Poi): PoiTier {
  return poi.tier ?? 'landmark'
}

// FNV-1a. The daily finds and the trail need the same answer on every device.
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// ─── Loading ─────────────────────────────────────────────────────────────────

const FIND_CELL_DEG = 0.004   // about 440 m

function cellKey(lat: number, lon: number): string {
  return `${Math.floor(lat / FIND_CELL_DEG)}_${Math.floor(lon / FIND_CELL_DEG)}`
}

function parsePlaces(file: PlacesFile): PlacesData {
  const places: Poi[] = file.places.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.desc ?? '',
    lat: r.lat,
    lon: r.lon,
    kind: 'permanent',
    points: TIER_POINTS[r.tier],
    category: r.category,
    learnMoreUrl: r.url,
    tier: r.tier,
    source: file.sources[r.src] ?? r.src,
    area: r.area,
  }))
  // The file stores each anchor as two integers: 1e5 x (lat - 1), 1e5 x (lon - 103).
  const anchorCells = new Map<string, LatLon[]>()
  for (let i = 0; i + 1 < file.anchors.length; i += 2) {
    const lat = 1 + file.anchors[i] / 1e5
    const lon = 103 + file.anchors[i + 1] / 1e5
    const key = cellKey(lat, lon)
    const cell = anchorCells.get(key)
    if (cell) cell.push({ lat, lon })
    else anchorCells.set(key, [{ lat, lon }])
  }
  return { places, foodSpots: file.foodSpots, anchorCells }
}

let loaded: PlacesData | null = null
let pending: Promise<PlacesData | null> | null = null

// Resolves to null when the file does not load. A later call tries again.
export function loadPlaces(): Promise<PlacesData | null> {
  if (loaded) return Promise.resolve(loaded)
  pending ??= fetch(PLACES_URL)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((file: PlacesFile) => { loaded = parsePlaces(file); return loaded })
    .catch((err) => {
      console.warn('The places file did not load', err)
      pending = null
      return null
    })
  return pending
}

// ─── Pins near the camera ────────────────────────────────────────────────────

const NEARBY_PIN_RADIUS_M = 1300
const NEARBY_PIN_MAX = 160
const NEARBY_PIN_MIN_ZOOM = 14

// The pins that the map draws. A landmark and an event always show. A marker
// and a spot show only near the middle of the screen, and only after a zoom in:
// the island holds thousands of them.
export function poisInView(pois: Poi[], view: (LatLon & { zoom: number }) | null, keep: Poi | null): Poi[] {
  const always: Poi[] = []
  const near: { poi: Poi; m: number }[] = []
  const showSmall = !!view && view.zoom >= NEARBY_PIN_MIN_ZOOM
  for (const poi of pois) {
    if (poiTier(poi) === 'landmark' || poi.kind === 'temporary' || poi === keep) {
      always.push(poi)
    } else if (showSmall) {
      const m = haversineDistance(view.lat, view.lon, poi.lat, poi.lon)
      if (m <= NEARBY_PIN_RADIUS_M) near.push({ poi, m })
    }
  }
  near.sort((a, b) => a.m - b.m)
  return [...always, ...near.slice(0, NEARBY_PIN_MAX).map((n) => n.poi)]
}

// ─── Daily finds ─────────────────────────────────────────────────────────────

export const FIND_PICKUP_RADIUS_M = 50
const FIND_VIEW_RADIUS_M = 900

// The share of cells that hold a find of each kind on one day, out of 100.
const FIND_CHANCE: Record<FindKind, number> = { day: 65, night: 30, rain: 40 }
const FIND_KINDS: FindKind[] = ['day', 'night', 'rain']

function findReward(kind: FindKind, h: number): { coins: number; foodId: string | null } {
  const food = FOODS[(h >>> 4) % FOODS.length].id
  const roll = (h >>> 16) % 100
  if (kind === 'night') return { coins: 12 + (h % 9), foodId: roll < 35 ? food : null }
  if (kind === 'rain') return { coins: 8 + (h % 7), foodId: food }
  return { coins: 4 + (h % 7), foodId: roll < 20 ? food : null }
}

// The finds near a place. A night find shows only at night, and a rain find
// only in the rain, so the map changes with the sky. `taken` holds the ids
// that the player already picked up today.
export function dailyFinds(
  data: PlacesData,
  focus: LatLon,
  dateKey: string,
  sky: { night: boolean; rain: boolean },
  taken: string[],
): DailyFind[] {
  const finds: DailyFind[] = []
  const done = new Set(taken)
  const cLat = Math.floor(focus.lat / FIND_CELL_DEG)
  const cLon = Math.floor(focus.lon / FIND_CELL_DEG)
  for (let i = cLat - 3; i <= cLat + 3; i++) {
    for (let j = cLon - 3; j <= cLon + 3; j++) {
      const key = `${i}_${j}`
      const anchors = data.anchorCells.get(key)
      if (!anchors) continue
      const used = new Set<number>()
      for (const kind of FIND_KINDS) {
        const h = hash(`${dateKey}|${key}|${kind}`)
        if (h % 100 >= FIND_CHANCE[kind]) continue
        let slot = (h >>> 8) % anchors.length
        if (used.has(slot)) slot = (slot + 1) % anchors.length
        if (used.has(slot)) continue
        used.add(slot)
        if (kind === 'night' && !sky.night) continue
        if (kind === 'rain' && !sky.rain) continue
        const id = `find-${dateKey}-${key}-${kind}`
        const at = anchors[slot]
        if (done.has(id) || haversineDistance(focus.lat, focus.lon, at.lat, at.lon) > FIND_VIEW_RADIUS_M) continue
        finds.push({ id, kind, lat: at.lat, lon: at.lon, ...findReward(kind, h) })
      }
    }
  }
  return finds
}

// ─── Trail of the week ───────────────────────────────────────────────────────

export const TRAIL_STOPS = 5
const TRAIL_STOP_POINTS = 8
const TRAIL_STOP_GAP_M = 60

const WEEK_MS = 7 * 24 * 3_600_000
const SGT_OFFSET_MS = 8 * 3_600_000
// 1970-01-05 was a Monday.
const FIRST_MONDAY_MS = 4 * 24 * 3_600_000

// A week runs from Monday to Sunday on the Singapore clock.
export function trailWeek(nowMs = Date.now()): { key: string; endsAt: string } {
  const index = Math.floor((nowMs + SGT_OFFSET_MS - FIRST_MONDAY_MS) / WEEK_MS)
  const endMs = (index + 1) * WEEK_MS + FIRST_MONDAY_MS - SGT_OFFSET_MS
  return { key: `w${index}`, endsAt: new Date(endMs).toISOString() }
}

let trailCache: { places: Poi[]; week: string; stops: Poi[] } | null = null

// Five markers in one planning area, the same for every player in a week. Each
// stop is an event POI with its own id, so a player can check in again at a
// marker that they visited before. The stop replaces its marker for the week.
export function trailOfTheWeek(places: Poi[], nowMs = Date.now()): Poi[] {
  const week = trailWeek(nowMs)
  if (trailCache && trailCache.places === places && trailCache.week === week.key) return trailCache.stops

  const byArea = new Map<string, Poi[]>()
  for (const p of places) {
    if (p.tier !== 'marker' || !p.area) continue
    const list = byArea.get(p.area)
    if (list) list.push(p)
    else byArea.set(p.area, [p])
  }
  const areas = [...byArea.keys()].filter((a) => byArea.get(a)!.length >= TRAIL_STOPS * 2).sort()
  let stops: Poi[] = []
  if (areas.length > 0) {
    const area = areas[hash(week.key) % areas.length]
    const markers = byArea.get(area)!
    const seed = markers[hash(`${week.key}|seed`) % markers.length]
    const byDistance = markers
      .map((poi) => ({ poi, m: haversineDistance(seed.lat, seed.lon, poi.lat, poi.lon) }))
      .sort((a, b) => a.m - b.m || a.poi.id.localeCompare(b.poi.id))
    const chosen: Poi[] = []
    for (const { poi } of byDistance) {
      if (chosen.length >= TRAIL_STOPS) break
      // Keep the stops apart, so one position does not check in at two of them.
      if (chosen.every((c) => haversineDistance(c.lat, c.lon, poi.lat, poi.lon) >= TRAIL_STOP_GAP_M)) chosen.push(poi)
    }
    if (chosen.length === TRAIL_STOPS) {
      const stopIds = chosen.map((p) => trailStopId(week.key, p.id))
      stops = chosen.map((p, i) => ({
        ...p,
        id: stopIds[i],
        kind: 'temporary',
        points: TRAIL_STOP_POINTS,
        activeUntil: week.endsAt,
        trail: { week: week.key, area, stopIds },
      }))
    }
  }
  trailCache = { places, week: week.key, stops }
  return stops
}

function trailStopId(week: string, placeId: string): string {
  return `trail-${week}-${placeId}`
}

// The place id below a trail stop id, or null for any other POI.
export function trailBaseId(poi: Poi): string | null {
  return poi.trail ? poi.id.slice(`trail-${poi.trail.week}-`.length) : null
}
