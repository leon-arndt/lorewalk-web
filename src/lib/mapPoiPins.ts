import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'

// Renders Pokémon-GO–style 3D POI pins: a pulsing ground ring, a thin stem,
// and a floating emoji orb that bobs gently — all in the same Three.js/WebGL
// pipeline used by the companion characters so depth and pitch are correct.

export interface PoiPinSpec {
  id: string
  lat: number
  lon: number
  kind: string
  category: string
  visited: boolean
}

export interface PoiPinsHandle {
  remove: () => void
  updatePins: (specs: PoiPinSpec[]) => void
}

const LAYER_ID = 'lorewalk-poi-pins'

// Fixed world origin — all pin positions are metre-offsets from this point.
const SG_CENTER = { lng: 103.8198, lat: 1.3521 }
const R_EARTH = 6371000

const CATEGORY_COLORS: Record<string, number> = {
  heritage: 0xf59e0b,
  landmark: 0x6366f1,
  arts:     0xa855f7,
  religious: 0xfacc15,
  museum:   0xf472b6,
  nature:   0x22c55e,
}
const CATEGORY_EMOJIS: Record<string, string> = {
  heritage: '🏛', landmark: '📍', arts: '🎭',
  religious: '🕌', museum: '🎨', nature: '🌿',
}
const VISITED_COLOR = 0x4ade80

// Constant apparent size across zoom levels (same trick as companion characters).
const PIN_SCALE = 2.8
const SIZE_REF_ZOOM = 20
const SIZE_COMP_MAX = 512

// Metre offset from SG_CENTER in Three.js local space (+x = east, +z = south).
function toLocalXZ(lat: number, lon: number) {
  const midLat = ((lat + SG_CENTER.lat) / 2) * Math.PI / 180
  return {
    x: (lon - SG_CENTER.lng) * Math.PI / 180 * R_EARTH * Math.cos(midLat),
    z: -(lat - SG_CENTER.lat) * Math.PI / 180 * R_EARTH,
  }
}

function makeOrbTexture(THREE: typeof T3, emoji: string, hex: number): T3.CanvasTexture {
  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff

  // Outer coloured circle
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fill()

  // White ring
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 6
  ctx.stroke()

  // White inner circle
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 14, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fill()

  // Emoji
  ctx.font = `${Math.round(S * 0.44)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, S / 2, S / 2)

  return new THREE.CanvasTexture(canvas)
}

interface PinObjects {
  group: T3.Group
  ring: T3.Mesh
  head: T3.Group   // cap + orb together, bobbed as a unit
  orb: T3.Sprite
  phase: number
}

function buildPin(THREE: typeof T3, spec: PoiPinSpec): PinObjects {
  const color = spec.visited ? VISITED_COLOR : (CATEGORY_COLORS[spec.category] ?? 0x94a3b8)
  const emoji = spec.visited ? '😊' : (CATEGORY_EMOJIS[spec.category] ?? '📍')

  const group = new THREE.Group()
  const { x, z } = toLocalXZ(spec.lat, spec.lon)
  group.position.set(x, 0, z)

  // Pulsing ground ring (lies flat in XZ) — kept small, just a subtle halo.
  const ringGeo = new THREE.RingGeometry(0.35, 0.55, 48)
  ringGeo.rotateX(-Math.PI / 2)
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.y = 0.05
  group.add(ring)

  // Vertical cylinder — radius kept under the ring's inner radius (0.35) so it
  // sits cleanly inside the pulsing halo.
  const CONE_COLOR = 0xf97316
  const CONE_HEIGHT = 1.1
  const cylGeo = new THREE.CylinderGeometry(0.22, 0.22, CONE_HEIGHT, 24)
  const cylMat = new THREE.MeshPhongMaterial({
    color: CONE_COLOR, shininess: 80, transparent: true, opacity: 0.62,
  })
  const cone = new THREE.Mesh(cylGeo, cylMat)
  cone.position.y = CONE_HEIGHT / 2
  group.add(cone)

  // Head group: empty anchor for the bob animation (sprite removed).
  const head = new THREE.Group()
  head.position.y = CONE_HEIGHT
  group.add(head)

  // orb is null but kept in the interface for type compat — nothing added to head.
  const orb = null as unknown as T3.Sprite

  return { group, ring, head, orb, phase: Math.random() * Math.PI * 2 }
}

export async function addPoiPinsLayer(
  map: maplibregl.Map,
  initial: PoiPinSpec[],
): Promise<PoiPinsHandle> {
  const THREE = await import('three')

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  scene.add(new THREE.AmbientLight(0xffffff, 1.0))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
  dirLight.position.set(2, 5, 3)
  scene.add(dirLight)

  const pinsMap = new Map<string, PinObjects>()

  function rebuild(specs: PoiPinSpec[]) {
    for (const { group } of pinsMap.values()) scene.remove(group)
    pinsMap.clear()
    for (const spec of specs) {
      const pin = buildPin(THREE, spec)
      scene.add(pin.group)
      pinsMap.set(spec.id, pin)
    }
  }

  rebuild(initial)

  let renderer: T3.WebGLRenderer | null = null

  const layer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    onAdd(_m, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },
    render(_gl, options) {
      if (!renderer || pinsMap.size === 0) return

      const t = performance.now() / 1000

      // Bob the whole head (cap + orb) + pulse the ground ring.
      for (const { head, ring, phase } of pinsMap.values()) {
        head.position.y = 1.1 + Math.sin(t * 0.7 + phase) * 0.08
        ;(ring.material as T3.MeshBasicMaterial).opacity = 0.3 + Math.abs(Math.sin(t * 1.4 + phase)) * 0.25
        ring.scale.setScalar(1 + Math.sin(t * 1.4 + phase) * 0.12)
      }

      // Constant screen size (same formula as companion characters)
      const pinScale = PIN_SCALE * Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - map.getZoom()))
      for (const { group } of pinsMap.values()) group.scale.setScalar(pinScale)

      const origin = maplibregl.MercatorCoordinate.fromLngLat([SG_CENTER.lng, SG_CENTER.lat], 0)
      const s = origin.meterInMercatorCoordinateUnits()
      const world = new THREE.Matrix4()
        .makeTranslation(origin.x, origin.y, origin.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))

      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(Array.from(options.defaultProjectionData.mainMatrix))
        .multiply(world)

      renderer.resetState()
      renderer.render(scene, camera)
      map.triggerRepaint()
    },
    onRemove() {
      renderer?.dispose()
      renderer = null
    },
  }

  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
  map.addLayer(layer)

  return {
    remove() {
      try { if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID) } catch { /* map torn down */ }
    },
    updatePins(specs) { rebuild(specs) },
  }
}
