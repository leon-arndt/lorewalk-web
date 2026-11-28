import * as maplibregl from 'maplibre-gl'
import type * as T3 from 'three'
import { isMapPaused } from '@/lib/mapUtils'
import { categoryColors, ink, ochre, stamp } from '@/lib/theme'
import { lightScene } from '@/lib/ambience'

// Renders Pokémon-GO–style 3D POI pins: a pulsing ground ring, a thin stem,
// and a floating emoji orb that bobs gently - all in the same Three.js/WebGL
// pipeline used by the companion characters so depth and pitch are correct.

export interface PoiPinSpec {
  id: string
  lat: number
  lon: number
  kind: string
  category: string
  visited: boolean
  // 1 for a landmark. A marker and a spot draw smaller.
  scale?: number
}

// A place the player holds. The flag stands on a closed ring round the pin.
export interface ClaimFlagSpec {
  id: string
  lat: number
  lon: number
  // The ring colour: the category colour of the place, as CSS hex.
  color: string
}

export interface PoiPinsHandle {
  remove: () => void
  updatePins: (specs: PoiPinSpec[]) => void
  updateClaims: (specs: ClaimFlagSpec[]) => void
}

const LAYER_ID = 'lorewalk-poi-pins'

// Fixed world origin - all pin positions are metre-offsets from this point.
const SG_CENTER = { lng: 103.8198, lat: 1.3521 }
const R_EARTH = 6371000

const VISITED_COLOR = 0x4ade80
// An event, such as a stop on the trail of the week.
const TEMPORARY_COLOR = 0xa855f7

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


interface PinObjects {
  group: T3.Group
  ring: T3.Mesh
  head: T3.Group   // cap + orb together, bobbed as a unit
  orb: T3.Sprite
  phase: number
  scale: number
}

const PIN_HEIGHT = 1.1

// Every model keeps its own colours (texture, vertex colours, or flat
// materials). Materials named here take the pin colour instead, so a category
// still reads by colour: the tree foliage and the procedural roofs.
const PIN_ACCENT = 'pinAccent'
const PIN_TINTED_MATERIALS = new Set(['leafsGreen', PIN_ACCENT])
// A visited pin multiplies its other colours by this pale green.
const VISITED_WASH = 0xbbf7d0

// No CC0 download fits a museum, a multi-faith place of worship, or an easel
// that reads at pin size, so these are built from primitives in the same flat
// low-poly style.
function buildMuseum(THREE: typeof T3): T3.Object3D {
  const stone = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 })
  const accent = new THREE.MeshLambertMaterial({ name: PIN_ACCENT })
  const g = new THREE.Group()
  const box = (w: number, h: number, d: number, y: number, z: number, mat: T3.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(0, y + h / 2, z)
    g.add(m)
  }
  box(1.0, 0.07, 0.72, 0, 0, stone)
  box(0.9, 0.07, 0.64, 0.07, 0, stone)
  box(0.74, 0.4, 0.34, 0.14, -0.1, stone)
  for (const x of [-0.33, -0.11, 0.11, 0.33]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.4, 8), stone)
    column.position.set(x, 0.34, 0.2)
    g.add(column)
  }
  box(0.9, 0.07, 0.64, 0.54, 0, accent)
  const gable = new THREE.Shape([new THREE.Vector2(-0.47, 0), new THREE.Vector2(0.47, 0), new THREE.Vector2(0, 0.2)])
  const pediment = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.64, bevelEnabled: false }), accent)
  pediment.position.set(0, 0.61, -0.32)
  g.add(pediment)
  return g
}

// Stacked tiers under flared roofs: reads as a pagoda and as a gopuram, which
// covers most of Singapore's temples without picking one faith.
function buildTemple(THREE: typeof T3): T3.Object3D {
  const stone = new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
  const accent = new THREE.MeshLambertMaterial({ name: PIN_ACCENT })
  const g = new THREE.Group()
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.72), stone)
  plinth.position.y = 0.05
  g.add(plinth)
  let y = 0.1
  for (const w of [0.52, 0.42, 0.32, 0.22]) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, w), stone)
    tier.position.y = y + 0.08
    g.add(tier)
    y += 0.16
    // A 4-sided frustum turned 45 degrees lines up with the square tier.
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w * 0.9, 0.07, 4), accent)
    roof.rotation.y = Math.PI / 4
    roof.position.y = y + 0.035
    g.add(roof)
    y += 0.07
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), accent)
  spire.position.y = y + 0.08
  g.add(spire)
  return g
}

// An easel whose painted canvas faces the default camera (+z, south).
function buildEasel(THREE: typeof T3): T3.Object3D {
  const wood = new THREE.MeshLambertMaterial({ color: 0xc2853f })
  const canvas = new THREE.MeshLambertMaterial({ color: 0xf8fafc })
  const accent = new THREE.MeshLambertMaterial({ name: PIN_ACCENT })
  const g = new THREE.Group()
  const part = (w: number, h: number, d: number, mat: T3.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, 0, rz)
    g.add(m)
  }
  const lean = -0.15
  part(0.04, 1.0, 0.04, wood, -0.2, 0.5, 0, lean, -0.12)
  part(0.04, 1.0, 0.04, wood, 0.2, 0.5, 0, lean, 0.12)
  part(0.04, 0.95, 0.04, wood, 0, 0.46, -0.2, 0.35)
  part(0.52, 0.04, 0.1, wood, 0, 0.4, 0.07)
  part(0.62, 0.48, 0.03, canvas, 0, 0.68, 0.07, lean)
  part(0.52, 0.38, 0.01, accent, 0, 0.68, 0.09, lean)
  return g
}

// One model per category (see public/models/README.md for the sources). A
// category whose file fails to load keeps its primitive below.
type PinModelSource = { url: string } | { build: (THREE: typeof T3) => T3.Object3D }
const PIN_MODELS: Record<string, PinModelSource> = {
  nature:    { url: '/models/pin-nature.glb' },
  heritage:  { url: '/models/pin-heritage.glb' },
  landmark:  { url: '/models/pin-landmark.glb' },
  arts:      { build: buildEasel },
  museum:    { build: buildMuseum },
  religious: { build: buildTemple },
}

// Placeholder primitive per category, used until the category has a model.
function buildPinGeometry(THREE: typeof T3, category: string): T3.BufferGeometry {
  switch (category) {
    case 'landmark':  return new THREE.BoxGeometry(0.42, PIN_HEIGHT, 0.42)
    case 'arts':      return new THREE.OctahedronGeometry(PIN_HEIGHT / 2)
    case 'religious': return new THREE.ConeGeometry(0.4, PIN_HEIGHT, 4)
    case 'museum':    return new THREE.SphereGeometry(PIN_HEIGHT / 2, 24, 16)
    case 'nature':    return new THREE.ConeGeometry(0.32, PIN_HEIGHT, 20)
    case 'heritage':  return new THREE.CylinderGeometry(0.22, 0.22, PIN_HEIGHT, 24)
    default:          return new THREE.CylinderGeometry(0.22, 0.22, PIN_HEIGHT, 24)
  }
}

// Fit the model into a PIN_HEIGHT cube by its largest side, so a wide museum
// does not outgrow a tall tree, and stand it centred on the pin.
function normalizePinModel(THREE: typeof T3, obj: T3.Object3D): T3.Object3D {
  const model = new THREE.Group()
  model.add(obj)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  obj.position.x -= center.x
  obj.position.z -= center.z
  obj.position.y -= box.min.y
  model.scale.setScalar(PIN_HEIGHT / Math.max(size.x, size.y, size.z))
  return model
}

function buildProceduralPinModels(THREE: typeof T3): Map<string, T3.Object3D> {
  const models = new Map<string, T3.Object3D>()
  for (const [category, src] of Object.entries(PIN_MODELS)) {
    if ('build' in src) models.set(category, normalizePinModel(THREE, src.build(THREE)))
  }
  return models
}

async function loadPinModels(THREE: typeof T3): Promise<Map<string, T3.Object3D>> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const loader = new GLTFLoader()
  const models = new Map<string, T3.Object3D>()
  await Promise.all(Object.entries(PIN_MODELS).map(async ([category, src]) => {
    if (!('url' in src)) return
    try {
      const { scene } = await loader.loadAsync(src.url)
      models.set(category, normalizePinModel(THREE, scene))
    } catch (err) {
      console.warn(`POI pin model for "${category}" failed to load, using the primitive`, err)
    }
  }))
  return models
}

// Downloaded exports often set metallicFactor 1, which renders near-black
// without an environment map, so each mesh gets a flat Lambert material that
// keeps its colour, texture, and vertex colours.
function buildModelBody(THREE: typeof T3, model: T3.Object3D, color: number, visited: boolean): T3.Object3D {
  const body = model.clone(true)
  body.traverse((obj) => {
    const mesh = obj as T3.Mesh
    if (!mesh.isMesh) return
    const src = mesh.material as T3.MeshStandardMaterial
    const tinted = PIN_TINTED_MATERIALS.has(src.name)
    const base = tinted ? new THREE.Color(color) : src.color.clone()
    if (visited && !tinted) base.multiply(new THREE.Color(VISITED_WASH))
    mesh.material = new THREE.MeshLambertMaterial({
      color: base,
      map: src.map ?? null,
      vertexColors: 'color' in mesh.geometry.attributes,
      flatShading: true,
    })
  })
  return body
}

function buildPin(THREE: typeof T3, spec: PoiPinSpec, models: Map<string, T3.Object3D>): PinObjects {
  const color = spec.visited
    ? VISITED_COLOR
    : spec.kind === 'temporary' ? TEMPORARY_COLOR : (categoryColors[spec.category] ?? 0x94a3b8)

  const group = new THREE.Group()
  const { x, z } = toLocalXZ(spec.lat, spec.lon)
  group.position.set(x, 0, z)

  // Pulsing ground ring (lies flat in XZ) - kept small, just a subtle halo.
  const ringGeo = new THREE.RingGeometry(0.35, 0.55, 48)
  ringGeo.rotateX(-Math.PI / 2)
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.y = 0.05
  group.add(ring)

  // Category-shaped body - unvisited = category color, visited = green (VISITED_COLOR).
  const model = models.get(spec.category)
  if (model) {
    group.add(buildModelBody(THREE, model, color, spec.visited))
  } else {
    const bodyGeo = buildPinGeometry(THREE, spec.category)
    const bodyMat = new THREE.MeshPhongMaterial({
      color, shininess: 80, transparent: true, opacity: 0.62,
    })
    const cone = new THREE.Mesh(bodyGeo, bodyMat)
    cone.position.y = PIN_HEIGHT / 2
    group.add(cone)
  }

  // Head group: empty anchor for the bob animation (sprite removed).
  const head = new THREE.Group()
  head.position.y = PIN_HEIGHT
  group.add(head)

  // orb is null but kept in the interface for type compat - nothing added to head.
  const orb = null as unknown as T3.Sprite

  return { group, ring, head, orb, phase: Math.random() * Math.PI * 2, scale: spec.scale ?? 1 }
}

// ─── Claim flags ─────────────────────────────────────────────────────────────

// The pin's own ring pulses while the place is open. A claim is done, so its
// ring is closed and holds still, just outside the pin ring at full pulse.
const CLAIM_RING_INNER = 0.66
const CLAIM_RING_OUTER = 0.8
// The flag stands on the ring toward the default camera (south-east), so the
// pin model never hides it.
const FLAG_ANGLE = Math.PI / 4
const FLAG_RADIUS = (CLAIM_RING_INNER + CLAIM_RING_OUTER) / 2
const FLAG_POLE_HEIGHT = 1.35
const CLOTH_W = 0.5
const CLOTH_H = 0.32
const CLOTH_SEGMENTS = 8

interface ClaimObjects {
  group: T3.Group
  cloth: T3.Mesh
  // The flat cloth, so each frame bends it from the same start.
  clothRest: Float32Array
  phase: number
}

function flagOffset() {
  return { x: FLAG_RADIUS * Math.cos(FLAG_ANGLE), z: FLAG_RADIUS * Math.sin(FLAG_ANGLE) }
}

function buildClaim(THREE: typeof T3, spec: ClaimFlagSpec): ClaimObjects {
  const group = new THREE.Group()
  const { x, z } = toLocalXZ(spec.lat, spec.lon)
  group.position.set(x, 0, z)

  const ringGeo = new THREE.RingGeometry(CLAIM_RING_INNER, CLAIM_RING_OUTER, 64)
  ringGeo.rotateX(-Math.PI / 2)
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.color), side: THREE.DoubleSide, depthWrite: false }))
  ring.position.y = 0.03
  group.add(ring)
  const edgeGeo = new THREE.RingGeometry(CLAIM_RING_OUTER, CLAIM_RING_OUTER + 0.035, 64)
  edgeGeo.rotateX(-Math.PI / 2)
  const edge = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(ink), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }))
  edge.position.y = 0.03
  group.add(edge)

  const flag = new THREE.Group()
  const at = flagOffset()
  flag.position.set(at.x, 0, at.z)
  group.add(flag)

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, FLAG_POLE_HEIGHT, 8),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(ink) }),
  )
  pole.position.y = FLAG_POLE_HEIGHT / 2
  flag.add(pole)
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 8),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(ochre) }),
  )
  finial.position.y = FLAG_POLE_HEIGHT + 0.03
  flag.add(finial)
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.05, 12),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(ink) }),
  )
  foot.position.y = 0.025
  flag.add(foot)

  // The cloth hangs from the pole on its left edge and faces the default camera.
  const clothGeo = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, CLOTH_SEGMENTS, 1)
  clothGeo.translate(CLOTH_W / 2 + 0.02, 0, 0)
  // Lit alone, the stamp red reads as maroon on the parchment map. The glow
  // keeps it bright by day and at night, and the light still shades the wave.
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshLambertMaterial({
    color: new THREE.Color(stamp), emissive: new THREE.Color(stamp), emissiveIntensity: 0.9,
    side: THREE.DoubleSide, flatShading: true,
  }))
  cloth.position.y = FLAG_POLE_HEIGHT - CLOTH_H / 2 - 0.04
  flag.add(cloth)

  return {
    group, cloth,
    clothRest: Float32Array.from(clothGeo.attributes.position.array as Float32Array),
    phase: Math.random() * Math.PI * 2,
  }
}

// A wave runs out along the cloth. The edge at the pole stays put.
function waveCloth(claim: ClaimObjects, t: number) {
  const pos = claim.cloth.geometry.attributes.position as T3.BufferAttribute
  const rest = claim.clothRest
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3]
    const along = x / CLOTH_W
    pos.setZ(i, Math.sin(t * 4 + claim.phase - x * 11) * 0.06 * along)
    pos.setY(i, rest[i * 3 + 1] - along * along * 0.04)
  }
  pos.needsUpdate = true
}

function unitsToMetres(zoom: number) {
  return PIN_SCALE * Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - zoom))
}

// The pins draw in three.js, so the map cannot hit-test the flag. This gives
// the squared screen distance from a tap to the flag pole, for MapView's tap test.
export function claimFlagTapDistance(map: maplibregl.Map, lat: number, lon: number, tap: { x: number; y: number }): number {
  const zoom = map.getZoom()
  const m = unitsToMetres(zoom)
  const at = flagOffset()
  const latRad = lat * Math.PI / 180
  const base = map.project([
    lon + (at.x * m) / (R_EARTH * Math.cos(latRad)) * 180 / Math.PI,
    lat - (at.z * m) / R_EARTH * 180 / Math.PI,
  ])
  // A vertical pole shortens on screen as the camera looks more straight down.
  const pxPerMetre = (512 * Math.pow(2, zoom)) / (2 * Math.PI * R_EARTH * Math.cos(latRad))
  const height = (FLAG_POLE_HEIGHT + 0.05) * m * pxPerMetre * Math.sin(map.getPitch() * Math.PI / 180)
  const y = Math.min(base.y, Math.max(base.y - height, tap.y))
  return (tap.x - base.x) ** 2 + (tap.y - y) ** 2
}

export async function addPoiPinsLayer(
  map: maplibregl.Map,
  initial: PoiPinSpec[],
): Promise<PoiPinsHandle> {
  const THREE = await import('three')

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const ambient = new THREE.AmbientLight(0xffffff, 1.0)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
  dirLight.position.set(2, 5, 3)
  scene.add(dirLight)

  const pinsMap = new Map<string, PinObjects>()
  const claimsMap = new Map<string, ClaimObjects>()
  const models = buildProceduralPinModels(THREE)
  let currentSpecs = initial

  function rebuild(specs: PoiPinSpec[]) {
    currentSpecs = specs
    for (const { group } of pinsMap.values()) scene.remove(group)
    pinsMap.clear()
    for (const spec of specs) {
      const pin = buildPin(THREE, spec, models)
      scene.add(pin.group)
      pinsMap.set(spec.id, pin)
    }
  }

  function rebuildClaims(specs: ClaimFlagSpec[]) {
    for (const { group } of claimsMap.values()) scene.remove(group)
    claimsMap.clear()
    for (const spec of specs) {
      const claim = buildClaim(THREE, spec)
      scene.add(claim.group)
      claimsMap.set(spec.id, claim)
    }
  }

  // Pins show their primitive at once, then swap to the downloaded model once it loads.
  rebuild(initial)
  void loadPinModels(THREE).then((loaded) => {
    if (loaded.size === 0) return
    for (const [category, model] of loaded) models.set(category, model)
    rebuild(currentSpecs)
    map.triggerRepaint()
  })

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
      if (!renderer || (pinsMap.size === 0 && claimsMap.size === 0)) return

      const t = performance.now() / 1000
      lightScene(ambient, dirLight, 1.0, 1.8)

      // Bob the whole head (cap + orb) + pulse the ground ring.
      for (const { head, ring, phase } of pinsMap.values()) {
        head.position.y = PIN_HEIGHT + Math.sin(t * 0.7 + phase) * 0.08
        ;(ring.material as T3.MeshBasicMaterial).opacity = 0.3 + Math.abs(Math.sin(t * 1.4 + phase)) * 0.25
        ring.scale.setScalar(1 + Math.sin(t * 1.4 + phase) * 0.12)
      }

      // Constant screen size (same formula as companion characters)
      const pinScale = unitsToMetres(map.getZoom())
      for (const { group, scale } of pinsMap.values()) group.scale.setScalar(pinScale * scale)
      for (const claim of claimsMap.values()) {
        claim.group.scale.setScalar(pinScale)
        waveCloth(claim, t)
      }

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
      if (!isMapPaused()) map.triggerRepaint()
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
    updatePins(specs) { rebuild(specs); map.triggerRepaint() },
    updateClaims(specs) { rebuildClaims(specs); map.triggerRepaint() },
  }
}
