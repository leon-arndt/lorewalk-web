// Shared offscreen WebGL renderer for egg + creature thumbnail generation.
import { creatureDefBySpecies } from '@/data/creatures'
import { CAT_MODEL_URL, tintCat } from '@/lib/catModel'
import { createPlayerAvatar } from '@/lib/playerAvatar'
import type { PlayerAppearance } from '@/types'

const IMAGE_SIZE = 120  // logical px (rendered 2× for retina)

let renderer: import('three').WebGLRenderer | null = null
let scene: import('three').Scene | null = null
let camera: import('three').PerspectiveCamera | null = null

async function initRenderer() {
  if (renderer) return
  const THREE = await import('three')

  const canvas = document.createElement('canvas')
  canvas.width = IMAGE_SIZE * 2
  canvas.height = IMAGE_SIZE * 2
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(1)
  renderer.setSize(IMAGE_SIZE * 2, IMAGE_SIZE * 2, false)
  renderer.setClearColor(0x000000, 0)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100)
  // Each render function frames the camera itself before drawing (egg vs. creature
  // thumbnails need different framing) - no default pose set here.

  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(2, 4, 3)
  scene.add(sun)
}

const eggCache = new Map<string, string>()
const eggPending = new Map<string, Promise<string>>()

export async function getEggPreviewURL(tier: string): Promise<string> {
  if (eggCache.has(tier)) return eggCache.get(tier)!
  if (eggPending.has(tier)) return eggPending.get(tier)!

  const p = (async () => {
    await initRenderer()
    const THREE = await import('three')

    const isRare = tier === 'rare'

    // Egg profile rotated around y-axis - wider at base, tapered toward top
    const pts: import('three').Vector2[] = []
    const N = 24
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const angle = t * Math.PI
      const r = 0.46 * Math.sin(angle) * (1 - 0.22 * t)
      const y = 0.70 * Math.cos(angle)
      pts.push(new THREE.Vector2(Math.max(0, r), y))
    }

    const geo = new THREE.LatheGeometry(pts, 40)
    const mat = new THREE.MeshStandardMaterial({
      color: isRare ? 0xfbbf24 : 0x6ee7b7,
      roughness: isRare ? 0.18 : 0.24,
      metalness: isRare ? 0.10 : 0.02,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = 0.70
    mesh.rotation.y = Math.PI / 5

    camera!.position.set(0.9, 1.4, 2.0)
    camera!.lookAt(0, 0.65, 0)
    scene!.add(mesh)
    renderer!.render(scene!, camera!)
    const dataURL = renderer!.domElement.toDataURL('image/png')
    scene!.remove(mesh)
    geo.dispose()
    mat.dispose()

    eggCache.set(tier, dataURL)
    eggPending.delete(tier)
    return dataURL
  })()

  eggPending.set(tier, p)
  return p
}

type CatTemplate = { scene: import('three').Object3D; animations: import('three').AnimationClip[] }
let catTemplatePromise: Promise<CatTemplate> | null = null

function loadCatTemplate(): Promise<CatTemplate> {
  if (!catTemplatePromise) {
    catTemplatePromise = (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(CAT_MODEL_URL)
      return { scene: gltf.scene, animations: gltf.animations }
    })()
  }
  return catTemplatePromise
}

// Renders the tinted cat once per turntable angle (radians, about its own centre)
// and returns one PNG data URL per angle. Angle 0 is the thumbnail pose.
async function renderCreatureFrames(color: number, isShiny: boolean, angles: number[]): Promise<string[]> {
  await initRenderer()
  const THREE = await import('three')
  const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')
  const template = await loadCatTemplate()

  const root = skeletonClone(template.scene) as import('three').Object3D
  const clonedMaterials = tintCat(THREE, root, color, isShiny)

  // skeletonClone()'d objects need an explicit matrix update before their world-space
  // bounding box is meaningful - otherwise Box3 reads stale/identity bone matrices.
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  root.position.sub(center)
  const pivot = new THREE.Group()
  pivot.add(root)
  const dist = Math.max(size.x, size.y, size.z) * 1.35

  let mixer: import('three').AnimationMixer | null = null
  if (template.animations.length) {
    mixer = new THREE.AnimationMixer(root)
    const idleClip = template.animations.find((a) => /idle/i.test(a.name)) ?? template.animations[0]
    mixer.clipAction(idleClip).play()
    mixer.update(0.3)
  }

  // Front three-quarter view: the cat faces +z.
  camera!.position.set(dist * 0.75, dist * 0.45, dist * 0.95)
  camera!.lookAt(0, 0, 0)
  scene!.add(pivot)
  const urls = angles.map((angle) => {
    pivot.rotation.y = angle
    renderer!.render(scene!, camera!)
    return renderer!.domElement.toDataURL('image/png')
  })
  scene!.remove(pivot)
  for (const m of clonedMaterials) m.dispose()
  mixer?.stopAllAction()
  return urls
}

const creatureCache = new Map<string, string>()
const creaturePending = new Map<string, Promise<string | null>>()

export async function getCreaturePreviewURL(species: string, isShiny = false): Promise<string | null> {
  const def = creatureDefBySpecies(species)
  if (!def) return null

  const key = `${def.id}_${isShiny}`
  if (creatureCache.has(key)) return creatureCache.get(key)!
  if (creaturePending.has(key)) return creaturePending.get(key)!

  const p = (async () => {
    const [dataURL] = await renderCreatureFrames(def.color, isShiny, [0])
    creatureCache.set(key, dataURL)
    creaturePending.delete(key)
    return dataURL
  })()

  creaturePending.set(key, p)
  return p
}

const SPIN_FRAME_COUNT = 16
const spinCache = new Map<string, Promise<string[]>>()

// One full turn of the cat in SPIN_FRAME_COUNT frames, played as a flipbook when
// the player taps the creature. Frame 0 matches the thumbnail.
export function getCreatureSpinFrames(species: string, isShiny = false): Promise<string[]> {
  const def = creatureDefBySpecies(species)
  if (!def) return Promise.resolve([])

  const key = `${def.id}_${isShiny}`
  if (!spinCache.has(key)) {
    const angles = Array.from({ length: SPIN_FRAME_COUNT }, (_, i) => (i / SPIN_FRAME_COUNT) * Math.PI * 2)
    spinCache.set(key, renderCreatureFrames(def.color, isShiny, angles))
  }
  return spinCache.get(key)!
}

// Cache key for a look: every field that changes the render, in a fixed order.
export function appearanceKey(a: PlayerAppearance): string {
  return [a.bodyId, a.skinToneId, a.hairColorId, a.eyeColorId, a.topId, a.bottomId, a.shoesId, a.headItemId].join('|')
}

const portraitCache = new Map<string, Promise<string | null>>()

// Head-and-shoulders render of the player avatar, for friend and profile icons.
export function getAvatarPortraitURL(appearance: PlayerAppearance): Promise<string | null> {
  const key = appearanceKey(appearance)
  if (!portraitCache.has(key)) {
    portraitCache.set(key, (async () => {
      await initRenderer()
      const avatar = await createPlayerAvatar(appearance)
      avatar.update(0.3)
      // The avatar is 1.4 tall with its head in the top half, facing +z.
      avatar.root.rotation.y = 0.3
      camera!.position.set(0, 1.12, 1.65)
      camera!.lookAt(0, 1.04, 0)
      scene!.add(avatar.root)
      renderer!.render(scene!, camera!)
      const dataURL = renderer!.domElement.toDataURL('image/png')
      avatar.dispose()
      return dataURL
    })().catch(() => null))
  }
  return portraitCache.get(key)!
}

// Deterministic per-id hue so the same item always gets the same cube colour.
function hashHue(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

const placeholderCache = new Map<string, string>()
const placeholderPending = new Map<string, Promise<string>>()

// Generic stand-in for any non-creature emoji (food, rewards, party avatars) that
// doesn't have a bespoke model yet - a coloured cube, hashed from its id so the
// same item always renders the same colour.
export async function getPlaceholderPreviewURL(key: string): Promise<string> {
  if (placeholderCache.has(key)) return placeholderCache.get(key)!
  if (placeholderPending.has(key)) return placeholderPending.get(key)!

  const p = (async () => {
    await initRenderer()
    const THREE = await import('three')

    const color = new THREE.Color()
    color.setHSL(hashHue(key) / 360, 0.55, 0.62)

    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.set(-0.55, 0.7, 0.1)

    camera!.position.set(1.7, 1.4, 1.9)
    camera!.lookAt(0, 0, 0)
    scene!.add(mesh)
    renderer!.render(scene!, camera!)
    const dataURL = renderer!.domElement.toDataURL('image/png')
    scene!.remove(mesh)
    geo.dispose()
    mat.dispose()

    placeholderCache.set(key, dataURL)
    placeholderPending.delete(key)
    return dataURL
  })()

  placeholderPending.set(key, p)
  return p
}

