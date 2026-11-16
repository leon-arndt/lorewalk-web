import { setWeather } from '@/lib/ambience'
import { haversineDistance } from '@/lib/mapUtils'

// Live Singapore weather from data.gov.sg (National Environment Agency). Both
// endpoints are public, need no key, and allow any origin.
// - rainfall: a 5-minute total in mm for each of about 90 rain gauges.
// - two-hr-forecast: a text forecast, such as "Thundery Showers", per town.
// Rain shows only when the nearest gauge measures it. The forecast sets the cloud.

const API = 'https://api-open.data.gov.sg/v2/real-time/api'
const REFRESH_MS = 5 * 60_000
const TIMEOUT_MS = 10_000
// 5-minute total that counts as a downpour: 2.5 mm is 30 mm per hour.
const HEAVY_RAIN_MM = 2.5

interface LatLon { latitude: number; longitude: number }

interface RainfallResponse {
  data?: {
    stations?: { id: string; location: LatLon }[]
    readings?: { data?: { stationId: string; value: number }[] }[]
  }
}

interface ForecastResponse {
  data?: {
    area_metadata?: { name: string; label_location: LatLon }[]
    items?: { forecasts?: { area: string; forecast: string }[] }[]
  }
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

function nearest<T>(items: T[], at: LatLon, where: (item: T) => LatLon | undefined): T | null {
  let best: T | null = null
  let bestDist = Infinity
  for (const item of items) {
    const p = where(item)
    if (!p) continue
    const d = haversineDistance(at.latitude, at.longitude, p.latitude, p.longitude)
    if (d < bestDist) { bestDist = d; best = item }
  }
  return best
}

function rainAt(res: RainfallResponse | null, at: LatLon): number | null {
  const readings = res?.data?.readings?.[0]?.data
  const stations = res?.data?.stations
  if (!readings?.length || !stations?.length) return null
  // A gauge that is down has no reading, so search the readings, not the stations.
  const where = new Map(stations.map((s) => [s.id, s.location]))
  const mm = nearest(readings, at, (r) => where.get(r.stationId))?.value ?? 0
  return mm <= 0 ? 0 : Math.min(1, 0.25 + 0.75 * (mm / HEAVY_RAIN_MM))
}

function cloudAt(res: ForecastResponse | null, at: LatLon): number | null {
  const areas = res?.data?.area_metadata
  const forecasts = res?.data?.items?.[0]?.forecasts
  if (!areas?.length || !forecasts?.length) return null
  const area = nearest(areas, at, (a) => a.label_location)
  const text = forecasts.find((f) => f.area === area?.name)?.forecast.toLowerCase() ?? ''
  if (/thunder|heavy/.test(text)) return 1
  if (/rain|shower|drizzle/.test(text)) return 0.9
  if (/partly|hazy|haze|mist|fog|windy/.test(text)) return 0.45
  if (/cloudy|overcast/.test(text)) return 0.75
  if (/fair|sunny|clear/.test(text)) return 0.15
  return 0.3
}

export async function fetchWeather(at: LatLon): Promise<{ cloud: number; rain: number } | null> {
  const [rainfall, forecast] = await Promise.all([
    getJson<RainfallResponse>('rainfall'),
    getJson<ForecastResponse>('two-hr-forecast'),
  ])
  const rain = rainAt(rainfall, at)
  const cloud = cloudAt(forecast, at)
  if (rain === null && cloud === null) return null
  // It cannot rain from a clear sky, whatever the forecast said two hours ago.
  return { rain: rain ?? 0, cloud: Math.max(cloud ?? 0.3, rain ? 0.85 : 0) }
}

// Keeps the shared ambience in step with the weather at the player's position.
// A failed fetch keeps the last known weather. Returns a function that stops it.
export function startWeatherUpdates(position: () => LatLon): () => void {
  let stopped = false
  let lastMs = 0
  const refresh = async () => {
    // The timer and a return to the tab can both fire: one fetch per period.
    if (document.hidden || Date.now() - lastMs < REFRESH_MS - 1000) return
    lastMs = Date.now()
    const next = await fetchWeather(position())
    if (next && !stopped) setWeather(next)
  }
  refresh()
  const timer = setInterval(refresh, REFRESH_MS)
  document.addEventListener('visibilitychange', refresh)
  return () => {
    stopped = true
    clearInterval(timer)
    document.removeEventListener('visibilitychange', refresh)
  }
}
