const EARTH_RADIUS_M = 6_371_000

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Another tab covers the map with a frosted page. The map stays mounted so it
// shows through the blur, but its 3D layers stop requesting frames meanwhile.
let paused = false
export function setMapPaused(value: boolean) { paused = value }
export function isMapPaused() { return paused }

// The 3D layers never stop: a creature idles, a pin bobs, a cloud drifts. Each
// asks for the next frame from its own render(). Without a limit the map then
// draws on every display refresh, 120 times a second on a current phone, tiles
// and buildings included, and the phone gets warm. So an idle frame waits for
// this interval. A gesture or a camera ease still draws at the full rate,
// because MapLibre asks for those frames itself.
const IDLE_FRAME_MS = 1000 / 30
// The timer fires this long before the frame is due, so the frame lands on the
// display refresh at 33 ms and not on the one after it. It is longer than a
// late timer and shorter than one refresh of a 120 Hz display.
const FRAME_SLACK_MS = 6
let frameTimer: ReturnType<typeof setTimeout> | null = null

export function requestMapFrame(map: { triggerRepaint: () => void }) {
  if (paused || frameTimer !== null) return
  // Inside render(), the timeline holds the start of the frame that draws now.
  const now = performance.now()
  const frameStart = Number(document.timeline.currentTime ?? now)
  frameTimer = setTimeout(() => {
    frameTimer = null
    if (!paused && !(map as { _removed?: boolean })._removed) map.triggerRepaint()
  }, Math.max(0, frameStart + IDLE_FRAME_MS - FRAME_SLACK_MS - now))
}
