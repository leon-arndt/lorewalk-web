// Shared offscreen WebGL renderer for egg + creature thumbnail generation.
import { creatureDefBySpecies } from '@/data/creatures'

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
      const gltf = await new GLTFLoader().loadAsync('/models/cat.glb')
      return { scene: gltf.scene, animations: gltf.animations }
    })()
  }
  return catTemplatePromise
}

const TINTED_MATERIAL_NAMES = new Set(['Cat_Main', 'Cat_Secondary', 'Ears'])

const creatureCache = new Map<string, string>()
const creaturePending = new Map<string, Promise<string | null>>()

// Retints the shared cat mesh per creature coat colour rather than shipping one
// model per colour variant - see public/models/README.md.
export async function getCreaturePreviewURL(species: string, isShiny = false): Promise<string | null> {
  const def = creatureDefBySpecies(species)
  if (!def) return null

  const key = `${def.id}_${isShiny}`
  if (creatureCache.has(key)) return creatureCache.get(key)!
  if (creaturePending.has(key)) return creaturePending.get(key)!

  const p = (async () => {
    await initRenderer()
    const THREE = await import('three')
    const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')
    const template = await loadCatTemplate()

    const root = skeletonClone(template.scene) as import('three').Object3D
    const tint = new THREE.Color(def.color)
    const gold = new THREE.Color(0xfbbf24)
    const clonedMaterials: import('three').Material[] = []

    root.traverse((obj) => {
      const mesh = obj as import('three').Mesh
      if (!mesh.isMesh) return
      const isArray = Array.isArray(mesh.material)
      const materials = (isArray ? mesh.material : [mesh.material]) as import('three').MeshStandardMaterial[]
      const recoloured = materials.map((m) => {
        if (!TINTED_MATERIAL_NAMES.has(m.name)) return m
        const clone = m.clone()
        const base = m.name === 'Cat_Secondary' ? tint.clone().multiplyScalar(0.78) : tint.clone()
        clone.color = isShiny ? base.lerp(gold, 0.35) : base
        if (isShiny) {
          clone.emissive = gold.clone()
          clone.emissiveIntensity = 0.22
        }
        clonedMaterials.push(clone)
        return clone
      })
      mesh.material = isArray ? recoloured : recoloured[0]
    })

    // skeletonClone()'d objects need an explicit matrix update before their world-space
    // bounding box is meaningful - otherwise Box3 reads stale/identity bone matrices.
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    root.position.sub(center)
    const dist = Math.max(size.x, size.y, size.z) * 2.2

    let mixer: import('three').AnimationMixer | null = null
    if (template.animations.length) {
      mixer = new THREE.AnimationMixer(root)
      const idleClip = template.animations.find((a) => /idle/i.test(a.name)) ?? template.animations[0]
      mixer.clipAction(idleClip).play()
      mixer.update(0.3)
    }

    camera!.position.set(dist * 0.9, dist * 0.4, dist * 0.7)
    camera!.lookAt(0, 0, 0)
    scene!.add(root)
    renderer!.render(scene!, camera!)
    const dataURL = renderer!.domElement.toDataURL('image/png')
    scene!.remove(root)
    for (const m of clonedMaterials) m.dispose()
    mixer?.stopAllAction()

    creatureCache.set(key, dataURL)
    creaturePending.delete(key)
    return dataURL
  })()

  creaturePending.set(key, p)
  return p
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

