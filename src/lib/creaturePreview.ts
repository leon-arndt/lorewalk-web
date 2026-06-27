// Shared offscreen WebGL renderer for egg thumbnail generation.
// ponytail: creature thumbnails use emoji; swap this for GLB loading when 3D cat models exist.

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
  camera.position.set(0.9, 1.4, 2.0)
  camera.lookAt(0, 0.65, 0)

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
      color: isRare ? 0xfbbf24 : 0xa5b4fc,
      roughness: isRare ? 0.18 : 0.24,
      metalness: isRare ? 0.10 : 0.02,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = 0.70
    mesh.rotation.y = Math.PI / 5

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

