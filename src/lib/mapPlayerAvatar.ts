import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'
import type { PlayerAppearance } from '@/types'
import { skinToneById, hairColorById, eyeColorById, cosmeticItemById } from '@/data/cosmetics'

// Renders the player's own customizable 3D avatar at their live GPS position, à la
// the companion characters in mapCharacters.ts (same "Three.js on MapLibre" trick:
// a metre-based world group whose matrix is rebuilt from MercatorCoordinate each
// frame). Unlike companions, there is exactly one instance and it never wanders -
// it always sits at `position` and only idle-bobs in place.
//
// Loads `/models/player-avatar.glb` if present (a rigged humanoid whose materials
// are named Skin/Hair/Eyes and whose swappable-item meshes are named
// Top_<id>/Bottom_<id>/Shoes_<id>/Head_<id>, see public/models/README.md) and
// retints/toggles it per PlayerAppearance. Falls back to a procedural blocky
// humanoid built from primitives, colour-coded per slot, so the feature is fully
// usable before any real asset is dropped in.

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

type THREE = typeof import('three')

function pm(THREE: THREE, color: number): T3.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color, shininess: 45 })
}

// Pure builder shared by the map layer and the customization screen's live preview
// (CharacterCustomizationPage) - one implementation of the humanoid, not two.
export function buildProceduralAvatar(THREE: THREE, appearance: PlayerAppearance): T3.Object3D {
  const g = new THREE.Group()

  const skin = skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69
  const hair = hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a
  const eye = eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621
  const top = cosmeticItemById(appearance.topId)?.color ?? 0x6366f1
  const bottom = cosmeticItemById(appearance.bottomId)?.color ?? 0x334155
  const shoes = cosmeticItemById(appearance.shoesId)?.color ?? 0xf8fafc

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2), pm(THREE, bottom))
  legs.position.y = 0.25
  g.add(legs)

  const feet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.26), pm(THREE, shoes))
  feet.position.y = 0.06
  g.add(feet)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 8), pm(THREE, top))
  torso.position.y = 0.72
  g.add(torso)

  const skinMat = pm(THREE, skin)
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.36, 4, 6), skinMat)
  armL.position.set(-0.28, 0.68, 0)
  const armR = armL.clone()
  armR.position.set(0.28, 0.68, 0)
  g.add(armL, armR)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skinMat)
  head.position.y = 1.12
  g.add(head)

  const eyeMat = pm(THREE, eye)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat)
  eyeL.position.set(-0.08, 1.14, 0.18)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.08, 1.14, 0.18)
  g.add(eyeL, eyeR)

  const hairMat = pm(THREE, hair)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  )
  hairCap.position.y = 1.2
  g.add(hairCap)

  const headItemId = appearance.headItemId
  if (headItemId && headItemId !== 'none') {
    const itemColor = cosmeticItemById(headItemId)?.color ?? 0xef4444
    const itemMat = pm(THREE, itemColor)
    if (headItemId === 'sunhat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 16), itemMat)
      brim.position.y = 1.28
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 12), itemMat)
      crown.position.y = 1.38
      g.add(brim, crown)
    } else if (headItemId === 'beanie') {
      const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), itemMat)
      beanie.position.y = 1.22
      g.add(beanie)
    } else {
      // cap (default fallback shape for any future head item id)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), itemMat)
      cap.position.y = 1.22
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16, 1, false, 0, Math.PI), itemMat)
      brim.position.set(0, 1.16, 0.12)
      g.add(cap, brim)
    }
  }

  return g
}

const RETINT_MATERIAL_NAMES: Record<string, keyof Pick<PlayerAppearance, 'skinToneId' | 'hairColorId' | 'eyeColorId'>> = {
  Skin: 'skinToneId',
  Hair: 'hairColorId',
  Eyes: 'eyeColorId',
}

function colorForAppearanceField(
  field: 'skinToneId' | 'hairColorId' | 'eyeColorId',
  appearance: PlayerAppearance,
): number {
  if (field === 'skinToneId') return skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69
  if (field === 'hairColorId') return hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a
  return eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621
}

// Applies PlayerAppearance to a loaded GLB instance: clones + retints named
// materials (never mutates the shared template) and toggles named item nodes -
// mirrors creaturePreview.ts's TINTED_MATERIAL_NAMES pattern.
function applyAppearanceToGlb(THREE: THREE, root: T3.Object3D, appearance: PlayerAppearance) {
  root.traverse((obj) => {
    const mesh = obj as T3.Mesh
    if (mesh.isMesh) {
      const isArray = Array.isArray(mesh.material)
      const materials = (isArray ? mesh.material : [mesh.material]) as T3.MeshStandardMaterial[]
      const recoloured = materials.map((m) => {
        const field = RETINT_MATERIAL_NAMES[m.name]
        if (!field) return m
        const clone = m.clone()
        clone.color = new THREE.Color(colorForAppearanceField(field, appearance))
        return clone
      })
      mesh.material = isArray ? recoloured : recoloured[0]
    }

    for (const [prefix, id] of [
      ['Top_', appearance.topId],
      ['Bottom_', appearance.bottomId],
      ['Shoes_', appearance.shoesId],
      ['Head_', appearance.headItemId],
    ] as const) {
      if (obj.name.startsWith(prefix)) {
        obj.visible = obj.name === `${prefix}${id}`
      }
    }
  })
}

export async function addPlayerAvatarLayer(
  map: maplibregl.Map,
  opts: PlayerAvatarLayerOptions,
): Promise<PlayerAvatarLayerHandle> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')

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

  let template: { scene: T3.Object3D } | null = null
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/player-avatar.glb')
    template = { scene: gltf.scene }
  } catch {
    template = null
  }

  let root: T3.Object3D | undefined
  function rebuild() {
    if (root) worldGroup.remove(root)
    const next = template
      ? (() => {
          const cloned = skeletonClone(template!.scene)
          applyAppearanceToGlb(THREE, cloned, appearance)
          return cloned
        })()
      : buildProceduralAvatar(THREE, appearance)
    next.scale.setScalar(modelScale)
    worldGroup.add(next)
    root = next
  }
  rebuild()

  let bobPhase = Math.random() * Math.PI * 2
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
      bobPhase += dt * 2
      root!.position.y = Math.abs(Math.sin(bobPhase)) * 0.04

      const charScale = modelScale * Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - map.getZoom()))
      root!.scale.setScalar(charScale)

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
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      } catch { /* map already removed */ }
    },
    setPosition(lng, lat) {
      position.lng = lng
      position.lat = lat
    },
    setAppearance(next) {
      appearance = next
      rebuild()
    },
  }
}
