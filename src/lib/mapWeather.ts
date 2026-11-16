import type * as maplibregl from 'maplibre-gl'
import type * as T3 from 'three'
import { getAmbience } from '@/lib/ambience'
import { isMapPaused } from '@/lib/mapUtils'

// Draws the weather from lib/ambience.ts on the map: drifting clouds with their
// shadows on the ground, and rain.
//
// The clouds are one fixed field over the whole island, drawn by a three.js
// custom layer like the companions. More of the field shows as the cloud cover
// rises. The clouds sit above the street-level camera, so a player on the ground
// sees only the shadows pass, and the clouds themselves come into view on zoom out.
//
// The rain is a 2D canvas over the map, because it belongs to the screen and not
// to a place.

const LAYER_ID = 'lorewalk-clouds'
const CENTER: [number, number] = [103.8198, 1.3521]
// The field, in metres: east-west by north-south. It wraps, so the drift never runs out.
const FIELD: [number, number] = [60_000, 38_000]
const CLUSTERS = 700
const BLOBS_PER_CLUSTER = 5
const CLOUD_ALTITUDE_M = 750
// Metres per second, toward the south-west. Faster than real wind, so it reads at street zoom.
const DRIFT: [number, number] = [-9, 5]

// The field centre in MapLibre's mercator units (the world is 0 to 1 on both axes),
// and the length of one metre there.
const ORIGIN = (() => {
  const lat = (CENTER[1] * Math.PI) / 180
  return {
    x: (180 + CENTER[0]) / 360,
    y: (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + lat / 2))) / 360,
    metre: 1 / (2 * Math.PI * 6_371_008.8 * Math.cos(lat)),
  }
})()

const VERTEX = `
attribute vec2 aCluster;
attribute vec3 aBlob;
attribute vec2 aCorner;
attribute float aRank;
uniform vec2 uField;
uniform vec2 uDrift;
uniform float uCover;
uniform float uAltitude;
varying vec2 vCorner;
varying float vAlpha;
void main() {
  vec2 c = mod(aCluster + uDrift, uField) - 0.5 * uField;
  vec2 edge = 0.5 * uField - abs(c);
  // A cluster fades at the field edge, where it wraps to the other side.
  float fade = smoothstep(0.0, 2500.0, min(edge.x, edge.y));
  vAlpha = fade * clamp((uCover - aRank) * 5.0, 0.0, 1.0);
  vCorner = aCorner;
  vec2 p = c + aBlob.xy + aCorner * aBlob.z;
  gl_Position = projectionMatrix * vec4(p.x, uAltitude * (1.0 + 0.25 * aRank), p.y, 1.0);
}`

const FRAGMENT = `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vCorner;
varying float vAlpha;
void main() {
  float a = smoothstep(1.0, 0.0, length(vCorner));
  gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
}`

// Deterministic, so the field is the same on every device and every visit.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildField(THREE: typeof T3): T3.BufferGeometry {
  const rand = seeded(1819)
  const quads = CLUSTERS * BLOBS_PER_CLUSTER
  const cluster = new Float32Array(quads * 4 * 2)
  const blob = new Float32Array(quads * 4 * 3)
  const corner = new Float32Array(quads * 4 * 2)
  const rank = new Float32Array(quads * 4)
  const index = new Uint16Array(quads * 6)
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]

  let q = 0
  for (let i = 0; i < CLUSTERS; i++) {
    const cx = rand() * FIELD[0], cz = rand() * FIELD[1]
    const size = 320 + rand() * 560
    const r = i / CLUSTERS
    for (let j = 0; j < BLOBS_PER_CLUSTER; j++, q++) {
      const ox = (rand() - 0.5) * size * 1.8, oz = (rand() - 0.5) * size * 1.1
      const radius = size * (0.55 + rand() * 0.5)
      for (let k = 0; k < 4; k++) {
        const v = q * 4 + k
        cluster.set([cx, cz], v * 2)
        blob.set([ox, oz, radius], v * 3)
        corner.set(corners[k], v * 2)
        rank[v] = r
      }
      index.set([q * 4, q * 4 + 2, q * 4 + 1, q * 4, q * 4 + 3, q * 4 + 2], q * 6)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 2))
  geo.setAttribute('aBlob', new THREE.BufferAttribute(blob, 3))
  geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2))
  geo.setAttribute('aRank', new THREE.BufferAttribute(rank, 1))
  geo.setIndex(new THREE.BufferAttribute(index, 1))
  return geo
}

async function addCloudLayer(map: maplibregl.Map): Promise<() => void> {
  const THREE = await import('three')
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const geo = buildField(THREE)

  const sheet = (altitude: number) => {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uField: { value: new THREE.Vector2(...FIELD) },
        uDrift: { value: new THREE.Vector2() },
        uCover: { value: 0 },
        uAltitude: { value: altitude },
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 0 },
      },
    })
    const mesh = new THREE.Mesh(geo, material)
    mesh.frustumCulled = false
    scene.add(mesh)
    return material
  }
  // Shadows first, so a cloud draws over the shadow of another.
  const shadows = sheet(0)
  const clouds = sheet(CLOUD_ALTITUDE_M)

  let renderer: T3.WebGLRenderer | null = null
  const layer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },
    render(_gl, options) {
      const a = getAmbience()
      if (!renderer || a.cloud <= 0) return

      const scale = ORIGIN.metre
      const seconds = Date.now() / 1000
      for (const material of [shadows, clouds]) {
        // Wrapped here, not only in the shader: a float cannot hold epoch seconds times the drift.
        material.uniforms.uDrift.value.set((seconds * DRIFT[0]) % FIELD[0], (seconds * DRIFT[1]) % FIELD[1])
        material.uniforms.uCover.value = a.cloud
      }
      shadows.uniforms.uColor.value.setRGB(0.05, 0.08, 0.2)
      shadows.uniforms.uOpacity.value = 0.26 * (1 - 0.75 * a.night)
      const white = 1 - 0.25 * a.rain
      clouds.uniforms.uColor.value.setRGB(white * (1 - 0.72 * a.night), white * (1 - 0.66 * a.night), white * (1 - 0.48 * a.night))
      clouds.uniforms.uOpacity.value = 0.7

      const world = new THREE.Matrix4()
        .makeTranslation(ORIGIN.x, ORIGIN.y, 0)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(Array.from(options.defaultProjectionData.mainMatrix))
        .multiply(world)

      renderer.resetState()
      renderer.render(scene, camera)
      if (!isMapPaused()) map.triggerRepaint()
    },
    onRemove() {
      renderer?.dispose()
      renderer = null
      geo.dispose()
      shadows.dispose()
      clouds.dispose()
    },
  }

  // Below the pins, the creatures, and the avatar, so a cloud never hides them.
  const above = map.getLayersOrder().find((id) => map.getLayer(id)?.type === 'custom')
  map.addLayer(layer, above)
  return () => {
    try {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    } catch { /* map already removed */ }
  }
}

interface Drop { x: number; y: number; length: number; speed: number }

// Screen pixels per second of fall, and the sideways lean of a streak.
const RAIN_SPEED = [900, 1500] as const
const RAIN_LEAN = 0.2
// Streaks on a 400 x 800 screen in a downpour. Other sizes scale by area.
const RAIN_DROPS = 320

function addRain(map: maplibregl.Map): () => void {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'
  // Right above the map canvas: under the markers, which sit later in the same container.
  map.getCanvas().after(canvas)
  const ctx = canvas.getContext('2d')
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const drops: Drop[] = []
  let shown = 0
  let lastMs = 0

  function draw() {
    if (!ctx) return
    const target = still ? 0 : getAmbience().rain
    const nowMs = performance.now()
    const dt = lastMs ? Math.min((nowMs - lastMs) / 1000, 0.1) : 0
    lastMs = nowMs
    // Eases in and out, so a new reading does not switch the rain on like a light.
    shown += (target - shown) * Math.min(1, dt * 0.8)
    if (shown < 0.01 && target === 0) {
      if (drops.length) { drops.length = 0; ctx.clearRect(0, 0, canvas.width, canvas.height) }
      shown = 0
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    const want = Math.round(RAIN_DROPS * shown * ((w * h) / (400 * 800)))
    while (drops.length < want) {
      drops.push({
        x: Math.random() * (w + h * RAIN_LEAN), y: Math.random() * h,
        length: 12 + Math.random() * 16,
        speed: RAIN_SPEED[0] + Math.random() * (RAIN_SPEED[1] - RAIN_SPEED[0]),
      })
    }
    drops.length = Math.min(drops.length, want)

    const night = getAmbience().night
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // Dark streaks on the pale day map, pale streaks on the night map.
    const tone = Math.round(96 + 110 * night)
    ctx.strokeStyle = `rgba(${tone},${tone + 14},${tone + 44},${0.4 + 0.25 * shown})`
    ctx.lineWidth = 1.3
    ctx.beginPath()
    for (const d of drops) {
      d.y += d.speed * dt
      d.x -= d.speed * dt * RAIN_LEAN
      if (d.y > h) { d.y = -d.length; d.x = Math.random() * (w + h * RAIN_LEAN) }
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - d.length * RAIN_LEAN, d.y + d.length)
    }
    ctx.stroke()
    if (!isMapPaused()) map.triggerRepaint()
  }

  // The map's own frames drive the rain, so it stops while the map is paused.
  map.on('render', draw)
  return () => {
    map.off('render', draw)
    canvas.remove()
  }
}

export function addMapWeather(map: maplibregl.Map): { remove: () => void } {
  const removeRain = addRain(map)
  let removed = false
  let removeClouds: (() => void) | null = null
  addCloudLayer(map).then((remove) => {
    if (removed) remove()
    else removeClouds = remove
  })
  return {
    remove() {
      removed = true
      removeRain()
      removeClouds?.()
    },
  }
}
