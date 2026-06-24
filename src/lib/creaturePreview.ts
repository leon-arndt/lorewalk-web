/**
 * Renders creature GLBs to data-URL thumbnails using a single shared WebGL
 * context. All cards in the collection share one renderer so the browser's
 * WebGL context limit (~16) is never hit regardless of collection size.
 */

const IMAGE_SIZE = 120  // logical px (rendered 2× for retina)
const CATEGORY_MODEL_URL = (cat: string) => `/models/creature-${cat}.glb`

const cache = new Map<string, string>()  // category → data URL
const pending = new Map<string, Promise<string>>()

let renderer: import('three').WebGLRenderer | null = null
let scene: import('three').Scene | null = null
let camera: import('three').PerspectiveCamera | null = null
const modelCache = new Map<string, import('three').Object3D>()

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
  camera.position.set(0.9, 1.4, 2.0)
  camera.lookAt(0, 0.65, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(2, 4, 3)
  scene.add(sun)
}

async function loadModel(category: string): Promise<import('three').Object3D> {
  if (modelCache.has(category)) return modelCache.get(category)!

  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

  try {
    const gltf = await new GLTFLoader().loadAsync(CATEGORY_MODEL_URL(category))
    modelCache.set(category, gltf.scene)
    return gltf.scene
  } catch {
    const fallback = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
    )
    const g = new THREE.Group()
    g.add(fallback)
    g.position.y = 0.4
    modelCache.set(category, g)
    return g
  }
}

export async function getCreaturePreviewURL(category: string): Promise<string> {
  if (cache.has(category)) return cache.get(category)!
  if (pending.has(category)) return pending.get(category)!

  const p = (async () => {
    await initRenderer()

    const model = await loadModel(category)

    // Clone so the cached original isn't mutated by rotation
    const clone = model.clone(true)
    // Slight y-rotation for a 3/4 view
    clone.rotation.y = Math.PI / 6
    scene!.add(clone)
    renderer!.render(scene!, camera!)
    const dataURL = renderer!.domElement.toDataURL('image/png')
    scene!.remove(clone)

    cache.set(category, dataURL)
    pending.delete(category)
    return dataURL
  })()

  pending.set(category, p)
  return p
}
