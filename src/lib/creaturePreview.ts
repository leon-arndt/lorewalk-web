// Shared offscreen WebGL renderer for egg + creature thumbnail generation.
import { creatureDefBySpecies, type CreatureDef } from '@/data/creatures'
import { addCatHat, CAT_MODEL_URL, tintCat } from '@/lib/catModel'
import { createPlayerAvatar } from '@/lib/playerAvatar'
import { COSMETIC_SLOTS, SLOT_FIELD, itemColor } from '@/data/cosmetics'
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

// Renders the creature once per turntable angle (radians, about its own centre)
// and returns one PNG data URL per angle. Angle 0 is the thumbnail pose. A
// creature with a `body` is a critter model, every other one the tinted cat.
async function renderCreatureFrames(def: CreatureDef, isShiny: boolean, angles: number[]): Promise<string[]> {
  await initRenderer()
  const THREE = await import('three')
  if (def.body) return renderCritterFrames(THREE, def, isShiny, angles)
  const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')
  const template = await loadCatTemplate()

  const root = skeletonClone(template.scene) as import('three').Object3D
  const clonedMaterials = tintCat(THREE, root, def.color, isShiny)
  const hatParts = def.hat ? addCatHat(THREE, root, def.hat) : { materials: [], geometries: [] }

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
  for (const m of [...clonedMaterials, ...hatParts.materials]) m.dispose()
  for (const g of hatParts.geometries) g.dispose()
  mixer?.stopAllAction()
  return urls
}

async function renderCritterFrames(THREE: typeof import('three'), def: CreatureDef, isShiny: boolean, angles: number[]): Promise<string[]> {
  const { buildAnimal, animateAnimal } = await import('@/lib/animalModels')
  const { disposeModel } = await import('@/lib/foodModels')
  const root = buildAnimal(THREE, def.body!, def.color, def.color2, isShiny)
  animateAnimal(root, false, 0)
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  root.position.sub(center)
  const pivot = new THREE.Group()
  pivot.add(root)
  const dist = Math.max(size.x, size.y, size.z) * 1.35
  camera!.position.set(dist * 0.75, dist * 0.45, dist * 0.95)
  camera!.lookAt(0, 0, 0)
  scene!.add(pivot)
  const urls = angles.map((angle) => {
    pivot.rotation.y = angle
    renderer!.render(scene!, camera!)
    return renderer!.domElement.toDataURL('image/png')
  })
  scene!.remove(pivot)
  disposeModel(root as import('three').Group)
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
    const [dataURL] = await renderCreatureFrames(def, isShiny, [0])
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
    spinCache.set(key, renderCreatureFrames(def, isShiny, angles))
  }
  return spinCache.get(key)!
}

// Cache key for a look: every field that changes the render, in a fixed order.
export function appearanceKey(a: PlayerAppearance): string {
  const items = COSMETIC_SLOTS.flatMap((slot) => [a[SLOT_FIELD[slot]], itemColor(a, slot)])
  return [a.bodyId, a.skinToneId, a.hairColorId, a.eyeColorId, ...items].join('|')
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

// The part of the avatar that a close-up shows, in avatar units (1.4 tall):
// the height to look at, the height that fits in the picture, and how far the
// camera stands above that height.
export type AvatarCrop = 'head' | 'top' | 'bottom' | 'shoes'
const CROPS: Record<AvatarCrop, { y: number; h: number; lift: number }> = {
  head: { y: 1.08, h: 1.3, lift: 0.1 },
  top: { y: 0.56, h: 1.0, lift: 0.12 },
  bottom: { y: 0.2, h: 0.86, lift: 0.25 },
  shoes: { y: 0.09, h: 0.62, lift: 0.45 },
}
const CROP_CACHE_MAX = 96
const cropCache = new Map<string, Promise<string | null>>()

// A close-up of one part of the player avatar, for a choice in the character
// designer. The avatar turns a little, so a detail on its side shows too.
export function getAvatarCropURL(appearance: PlayerAppearance, crop: AvatarCrop): Promise<string | null> {
  const key = `${crop}|${appearanceKey(appearance)}`
  if (!cropCache.has(key)) {
    // Every change of the look makes new pictures, so the oldest ones go.
    if (cropCache.size >= CROP_CACHE_MAX) cropCache.delete(cropCache.keys().next().value!)
    cropCache.set(key, (async () => {
      await initRenderer()
      const THREE = await import('three')
      const avatar = await createPlayerAvatar(appearance)
      avatar.update(0.3)
      avatar.root.rotation.y = 0.55
      const { y, h, lift } = CROPS[crop]
      const dist = h / 2 / Math.tan(THREE.MathUtils.degToRad(camera!.fov / 2))
      camera!.position.set(0, y + dist * lift, dist)
      camera!.lookAt(0, y, 0)
      scene!.add(avatar.root)
      renderer!.render(scene!, camera!)
      const dataURL = renderer!.domElement.toDataURL('image/png')
      avatar.dispose()
      return dataURL
    })().catch(() => null))
  }
  return cropCache.get(key)!
}

const modelCache = new Map<string, Promise<string>>()

// Renders a model built by foodModels.ts or itemModels.ts, framed to fit.
// fit scales the camera distance: below 1 crops into the bounding sphere,
// which suits a round plate but cuts off the ends of a wide icon.
function getModelPreviewURL(key: string, build: (THREE: typeof import('three')) => Promise<import('three').Group>, fit = 0.82): Promise<string> {
  let p = modelCache.get(key)
  if (!p) {
    p = (async () => {
      await initRenderer()
      const THREE = await import('three')
      const { disposeModel } = await import('@/lib/foodModels')
      const model = await build(THREE)
      const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere())
      const dist = fit * sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera!.fov / 2))
      const dir = new THREE.Vector3(0.25, 0.85, 1).normalize()
      camera!.position.copy(sphere.center).addScaledVector(dir, dist)
      camera!.lookAt(sphere.center)
      scene!.add(model)
      renderer!.render(scene!, camera!)
      const dataURL = renderer!.domElement.toDataURL('image/png')
      scene!.remove(model)
      disposeModel(model)
      return dataURL
    })()
    modelCache.set(key, p)
  }
  return p
}

export function getFoodPreviewURL(foodId: string): Promise<string> {
  return getModelPreviewURL(`food_${foodId}`, async (THREE) => (await import('@/lib/foodModels')).buildFoodModel(THREE, foodId))
}

const EGG_ITEMS = new Set(['egg', 'egg_slot'])

export function creatureSpriteKey(species: string, isShiny = false): string {
  return `creature_${isShiny ? 1 : 0}_${species}`
}

// Sprite keys: food_<id> for a dish, item_<type> for an icon (coins, xp, egg,
// badge, level_up, egg_slot, creature_slots, shrine, claim, and the coin packs
// coins_few, coins_stack, coins_bag, coins_chest), and
// creatureSpriteKey() for a creature. Any other key has no model, and the
// caller keeps its emoji.
export async function getSpritePreviewURL(key: string): Promise<string | null> {
  if (key.startsWith('creature_')) return getCreaturePreviewURL(key.slice(11), key[9] === '1')
  if (key.startsWith('food_')) return getFoodPreviewURL(key.slice(5))
  if (!key.startsWith('item_')) return null
  const type = key.slice(5)
  if (EGG_ITEMS.has(type)) return getEggPreviewURL('common')
  const { buildItemModel, hasItemModel } = await import('@/lib/itemModels')
  if (!hasItemModel(type)) return null
  // A coin pack is a loose group of small parts, so it takes a closer camera.
  return getModelPreviewURL(key, async (THREE) => buildItemModel(THREE, type), type.startsWith('coins_') ? 0.74 : 0.95)
}
