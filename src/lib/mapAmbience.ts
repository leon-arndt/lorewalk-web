import type * as maplibregl from 'maplibre-gl'
import { getAmbience, gloom, onAmbienceChange } from '@/lib/ambience'

// Recolours the base map for the time of day and the weather (lib/ambience.ts).
// It reads every colour of the loaded style once, then writes a tinted copy back
// whenever the ambience moves: bluer and darker at night, greyer under cloud.
//
// At night the 3D buildings show lit windows. MapLibre cannot light one window,
// but it can tile an image over an extrusion's walls, so the windows are a small
// generated image: a grid of windows, some lit. Fewer stay lit as people go to
// bed. The image also covers the roof, so a thin plain slab caps each building.

type Rgb = [number, number, number]
type Rgba = [number, number, number, number]

const NIGHT_TINT: Rgb = [0.3, 0.38, 0.66]
const GLOOM_TINT: Rgb = [0.8, 0.84, 0.9]
const NIGHT_TEXT: Rgb = [220, 229, 255]
const NIGHT_HALO: Rgb = [12, 20, 46]
const WINDOW_GLOW: Rgb = [255, 214, 140]
// Buildings fall into three groups by height. Each group has its own shade and
// its own window image, so neighbours differ a little.
const GROUP_SHADE: Rgb[] = [[1, 1, 1], [0.95, 0.94, 0.92], [0.9, 0.91, 0.94]]
const GROUP_OF = ['%', ['round', ['coalesce', ['get', 'render_height'], 0]], GROUP_SHADE.length]
// The window image: WINDOW_GRID windows a side, each in a cell of WINDOW_CELL pixels.
const WINDOW_GRID = 10
const WINDOW_CELL = 6
// The share of windows lit in the evening, when everyone is up.
const LIT_SHARE = 0.55
const UNLIT_SHADE = 0.86
const ROOF_SLAB_M = 0.4

const SKY = {
  day: { sky: [128, 190, 255], horizon: [222, 238, 255], fog: [240, 238, 232] },
  night: { sky: [8, 14, 40], horizon: [34, 48, 104], fog: [22, 32, 70] },
  dull: { sky: [150, 160, 172], horizon: [196, 202, 208], fog: [206, 208, 210] },
} satisfies Record<string, Record<string, Rgb>>

const REFRESH_MS = 30_000
// Layers that keep their own colours: the MRT lines stay in their brand colours.
const KEEP_COLOUR = /^mrt-lines/

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const css = (c: Rgb, alpha = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`

// The canvas parses every CSS colour form the style uses (hex, rgb, hsl, hsla)
// and rejects operator names such as "interpolate", so a style expression can be
// walked without knowing its grammar.
let parser: CanvasRenderingContext2D | null = null
function parseColor(text: string): Rgba | null {
  parser ??= document.createElement('canvas').getContext('2d')
  if (!parser) return null
  parser.fillStyle = '#000000'
  parser.fillStyle = text
  const first = parser.fillStyle
  parser.fillStyle = '#ffffff'
  parser.fillStyle = text
  if (parser.fillStyle !== first) return null
  if (first.startsWith('#')) {
    const n = parseInt(first.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const parts = first.match(/[\d.]+/g)?.map(Number)
  return parts && parts.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : null
}

// Applies `fn` to every colour inside a paint value: a plain string, an
// expression array, or a legacy `{ stops }` function.
function mapColors(value: unknown, fn: (c: Rgba) => string): unknown {
  if (typeof value === 'string') {
    const c = parseColor(value)
    return c ? fn(c) : value
  }
  if (Array.isArray(value)) return value.map((v) => mapColors(v, fn))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapColors(v, fn)]))
  }
  return value
}

interface Swatch { layer: string; type: string; prop: string; value: unknown }
interface Tower { layer: string; roof: string; color: Rgba; windowsOn?: boolean }

// A stable pseudo-random number in 0 to 1 for a window, so the same windows stay lit.
function windowRank(group: number, x: number, y: number, salt: number): number {
  let h = Math.imul(group * 73856093 ^ x * 19349663 ^ y * 83492791 ^ salt * 2654435761, 0x45d9f3b)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

function windowImage(group: number, wall: Rgb, night: number, awake: number): ImageData | null {
  const size = WINDOW_GRID * WINDOW_CELL
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = css(wall)
  ctx.fillRect(0, 0, size, size)
  for (let y = 0; y < WINDOW_GRID; y++) {
    for (let x = 0; x < WINDOW_GRID; x++) {
      const lit = windowRank(group, x, y, 0) < LIT_SHARE * awake
      const strength = night * (0.7 + 0.3 * windowRank(group, x, y, 1))
      const dark: Rgb = [wall[0] * UNLIT_SHADE, wall[1] * UNLIT_SHADE, wall[2] * UNLIT_SHADE]
      ctx.fillStyle = css(lit ? mixRgb(wall, WINDOW_GLOW, strength) : mixRgb(wall, dark, night))
      ctx.fillRect(x * WINDOW_CELL + 2, y * WINDOW_CELL + 1, WINDOW_CELL - 3, WINDOW_CELL - 2)
    }
  }
  return ctx.getImageData(0, 0, size, size)
}

export function addMapAmbience(map: maplibregl.Map): { remove: () => void } {
  const swatches: Swatch[] = []
  const rasters: string[] = []
  const towers: Tower[] = []
  const order = map.getLayersOrder()
  for (const layer of map.getStyle().layers) {
    if (layer.type === 'raster') rasters.push(layer.id)
    if (KEEP_COLOUR.test(layer.id) || !('paint' in layer) || !layer.paint) continue
    if (layer.type === 'fill-extrusion') {
      const paint = layer.paint
      const flat = paint['fill-extrusion-color']
      const color = typeof flat === 'string' ? parseColor(flat) : null
      const height = paint['fill-extrusion-height']
      if (color && height !== undefined) {
        const roof = `${layer.id}-roof`
        map.addLayer({
          ...layer,
          id: roof,
          layout: { visibility: 'none' },
          paint: {
            'fill-extrusion-color': flat,
            'fill-extrusion-base': height,
            'fill-extrusion-height': ['+', height, ROOF_SLAB_M],
          },
        } as maplibregl.FillExtrusionLayerSpecification, order[order.indexOf(layer.id) + 1])
        towers.push({ layer: layer.id, roof, color })
        continue
      }
    }
    for (const [prop, value] of Object.entries(layer.paint)) {
      if (prop.endsWith('-color') && value !== undefined) swatches.push({ layer: layer.id, type: layer.type, prop, value })
    }
  }

  let applied = ''
  function apply() {
    const a = getAmbience()
    const g = gloom(a) * (1 - a.night)
    const key = [a.night, a.awake, g].map((v) => v.toFixed(2)).join()
    if (key === applied) return
    applied = key

    const tint = mixRgb(mixRgb([1, 1, 1], NIGHT_TINT, a.night), GLOOM_TINT, g * 0.8)
    const ground = (c: Rgba): Rgb => [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]]
    // Dark text cannot be read on a night map, so the labels flip to light on dark.
    const flip = Math.min(1, Math.max(0, (a.night - 0.35) / 0.3))

    for (const s of swatches) {
      if (!map.getLayer(s.layer)) continue
      let next: unknown
      if (s.type === 'symbol') {
        const to = s.prop.includes('halo') ? NIGHT_HALO : NIGHT_TEXT
        next = mapColors(s.value, (c) => css(mixRgb([c[0], c[1], c[2]], to, flip), c[3]))
      } else {
        next = mapColors(s.value, (c) => css(ground(c), c[3]))
      }
      map.setPaintProperty(s.layer, s.prop as 'fill-color', next as string)
    }
    const windowsOn = a.night > 0.01
    for (const t of towers) {
      if (!map.getLayer(t.layer)) continue
      const walls = GROUP_SHADE.map((shade): Rgb => {
        const c = ground(t.color)
        return [c[0] * shade[0], c[1] * shade[1], c[2] * shade[2]]
      })
      const byGroup = (values: string[]) => ['match', GROUP_OF, ...values.slice(0, -1).flatMap((v, i) => [i, v]), values[values.length - 1]]
      const shades = byGroup(walls.map((w) => css(w, t.color[3]))) as unknown as string
      map.setPaintProperty(t.layer, 'fill-extrusion-color', shades)
      map.setPaintProperty(t.roof, 'fill-extrusion-color', shades)

      const images = walls.map((_, i) => `${t.layer}-windows-${i}`)
      if (windowsOn) {
        walls.forEach((wall, i) => {
          const image = windowImage(i, wall, a.night, a.awake)
          if (!image) return
          if (map.hasImage(images[i])) map.updateImage(images[i], image)
          else map.addImage(images[i], image)
        })
      }
      // Set only on a change: a new pattern makes MapLibre build every building again.
      if (windowsOn !== t.windowsOn) {
        t.windowsOn = windowsOn
        map.setPaintProperty(t.layer, 'fill-extrusion-pattern', windowsOn ? (byGroup(images) as unknown as string) : undefined)
        map.setLayoutProperty(t.roof, 'visibility', windowsOn ? 'visible' : 'none')
      }
    }
    for (const id of rasters) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'raster-brightness-max', 1 - 0.65 * a.night - 0.15 * g)
    }

    const sky = (part: 'sky' | 'horizon' | 'fog') =>
      css(mixRgb(mixRgb(SKY.day[part], SKY.dull[part], g), SKY.night[part], a.night))
    map.setSky({
      'sky-color': sky('sky'),
      'horizon-color': sky('horizon'),
      'fog-color': sky('fog'),
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.8,
    })
  }

  apply()
  const timer = setInterval(apply, REFRESH_MS)
  const unsubscribe = onAmbienceChange(apply)
  return {
    remove() {
      clearInterval(timer)
      unsubscribe()
    },
  }
}
