import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'
import { isMapPaused } from '@/lib/mapUtils'
import type { PlayerAppearance } from '@/types'
import { createPlayerAvatar, type PlayerAvatar } from '@/lib/playerAvatar'

// Renders the player's own avatar (lib/playerAvatar.ts) at their live GPS position,
// à la the companion characters in mapCharacters.ts (same "Three.js on MapLibre"
// trick: a metre-based world group whose matrix is rebuilt from MercatorCoordinate
// each frame). Unlike companions there is exactly one instance and it never wanders:
// it walks in place, facing the direction of travel, while the GPS position moves,
// and idles once the player stops.

export interface PlayerAvatarLayerHandle {
  remove: () => void
  setPosition: (lng: number, lat: number) => void
  setAppearance: (appearance: PlayerAppearance) => void
}

export interface PlayerAvatarLayerOptions {
  position: [number, number]
  appearance: PlayerAppearance
  modelScale?: number
}

const LAYER_ID = 'lorewalk-player-avatar'
const SIZE_REF_ZOOM = 20
const SIZE_COMP_MAX = 1024

// A GPS update keeps the walk clip playing for this long. Updates arrive about
// once a second while walking, so the avatar does not stutter between them.
const WALK_HOLD_MS = 1500
// Below this the move is GPS jitter. Above the maximum it is a first fix or a jump.
const MIN_STEP_M = 0.8
const MAX_STEP_M = 60

export async function addPlayerAvatarLayer(
  map: maplibregl.Map,
  opts: PlayerAvatarLayerOptions,
): Promise<PlayerAvatarLayerHandle> {
  const THREE = await import('three')

  const modelScale = opts.modelScale ?? 1
  const position = { lng: opts.position[0], lat: opts.position[1] }
  let appearance = opts.appearance

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(0.6, 1, 0.4)
  scene.add(sun)

  const worldGroup = new THREE.Group()
  scene.add(worldGroup)

  let avatar: PlayerAvatar | null = null
  let heading = 0
  let targetHeading = 0
  let walkUntil = 0
  let walking = false

  let buildToken = 0
  async function rebuild() {
    const token = ++buildToken
    const next = await createPlayerAvatar(appearance)
    if (token !== buildToken) { next.dispose(); return }
    avatar?.dispose()
    avatar = next
    if (walking) next.play('Walk')
    worldGroup.add(next.root)
    map.triggerRepaint()
  }
  // Not awaited: the caller needs the handle at once, or the first GPS fix is lost
  // while the model downloads.
  rebuild()

  let lastMs = 0
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
      if (!renderer) return

      const nowMs = performance.now()
      const dt = lastMs ? Math.min((nowMs - lastMs) / 1000, 0.1) : 0
      lastMs = nowMs

      if (avatar) {
        const shouldWalk = nowMs < walkUntil
        if (shouldWalk !== walking) {
          walking = shouldWalk
          avatar.play(walking ? 'Walk' : 'Idle')
        }
        const turn = Math.atan2(Math.sin(targetHeading - heading), Math.cos(targetHeading - heading))
        heading += turn * Math.min(1, dt * 8)
        avatar.root.rotation.y = heading
        avatar.root.scale.setScalar(modelScale * Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - map.getZoom())))
        avatar.update(dt)
      }

      const origin = maplibregl.MercatorCoordinate.fromLngLat([position.lng, position.lat], 0)
      const scale = origin.meterInMercatorCoordinateUnits()
      const world = new THREE.Matrix4()
        .makeTranslation(origin.x, origin.y, origin.z)
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
    },
  }

  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
  map.addLayer(layer)

  return {
    remove() {
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      } catch { /* map already removed */ }
    },
    setPosition(lng, lat) {
      // Local +x is east and +z is south in the world group (see the matrix in render()).
      const east = (lng - position.lng) * 111320 * Math.cos((lat * Math.PI) / 180)
      const south = (position.lat - lat) * 110540
      const dist = Math.hypot(east, south)
      if (dist >= MIN_STEP_M && dist <= MAX_STEP_M) {
        targetHeading = Math.atan2(east, south)
        walkUntil = performance.now() + WALK_HOLD_MS
      }
      position.lng = lng
      position.lat = lat
    },
    setAppearance(next) {
      appearance = next
      rebuild()
    },
  }
}
