// The map's mood: time of day in Singapore plus the current weather. Every value
// is 0 to 1. mapAmbience.ts recolours the base map from it, mapWeather.ts draws
// the clouds and the rain, and the three.js layers dim their lights with it.

export interface Ambience {
  // 0 in daylight, 1 in full night.
  night: number
  // The share of people who are up: 1 in the evening, low in the small hours.
  // It sets how many windows are lit at night.
  awake: number
  cloud: number
  rain: number
}

export interface AmbienceOverride {
  // Singapore local hour, 0 to 24.
  hour?: number
  cloud?: number
  rain?: number
}

const SINGAPORE_UTC_OFFSET_H = 8

// Singapore sits on the equator: sunrise and sunset stay within about 15 minutes
// of 07:00 and 19:00 all year, so fixed hours are close enough.
const DAWN = [6.2, 7.3] as const
const DUSK = [18.6, 19.8] as const
// Lights go out between these hours and come back as the early risers wake.
const BEDTIME = [22.5, 24] as const
const WAKING = [5.3, 6.3] as const
const LIGHTS_LATE_NIGHT = 0.15
const LIGHTS_EARLY_MORNING = 0.7

let weather = { cloud: 0, rain: 0 }
let override: AmbienceOverride | null = null
const listeners = new Set<() => void>()

function ramp(x: number, [from, to]: readonly [number, number]): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export function singaporeHour(nowMs = Date.now()): number {
  return ((nowMs / 3_600_000 + SINGAPORE_UTC_OFFSET_H) % 24 + 24) % 24
}

export function getAmbience(): Ambience {
  const hour = override?.hour ?? singaporeHour()
  const afternoon = hour >= 12
  const night = afternoon ? ramp(hour, DUSK) : 1 - ramp(hour, DAWN)
  const awake = afternoon
    ? 1 - (1 - LIGHTS_LATE_NIGHT) * ramp(hour, BEDTIME)
    : LIGHTS_LATE_NIGHT + (LIGHTS_EARLY_MORNING - LIGHTS_LATE_NIGHT) * ramp(hour, WAKING)
  return {
    night,
    awake,
    cloud: override?.cloud ?? weather.cloud,
    rain: override?.rain ?? weather.rain,
  }
}

export function setWeather(next: { cloud: number; rain: number }) {
  weather = next
  listeners.forEach((fn) => fn())
}

// For testing a time or a weather without waiting for it. Pass null to clear.
export function setAmbienceOverride(next: AmbienceOverride | null) {
  override = next
  listeners.forEach((fn) => fn())
}

export function onAmbienceChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// How much a dull sky flattens the daylight.
export function gloom(a: Ambience): number {
  return Math.min(1, a.cloud * 0.6 + a.rain * 0.4)
}

interface SceneLight {
  color: { setRGB: (r: number, g: number, b: number) => unknown }
  intensity: number
}

// Dims and cools a three.js layer's lights to match the map under it. The models
// stay brighter than the ground on purpose, so pins and creatures read at night.
export function lightScene(ambient: SceneLight, sun: SceneLight, ambientBase: number, sunBase: number) {
  const a = getAmbience()
  const g = gloom(a)
  ambient.intensity = ambientBase * (1 - 0.3 * a.night - 0.1 * g)
  ambient.color.setRGB(1 - 0.32 * a.night, 1 - 0.22 * a.night, 1)
  sun.intensity = sunBase * (1 - 0.7 * a.night) * (1 - 0.35 * g)
  sun.color.setRGB(1 - 0.35 * a.night, 1 - 0.25 * a.night, 1)
}
