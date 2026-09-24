import type * as T3 from 'three'
import type { CatHat } from '@/data/creatures'

export const CAT_MODEL_URL = '/models/cat.glb'

const TINTED_MATERIAL_NAMES = new Set(['Cat_Main', 'Cat_Secondary'])

// Retints the shared cat mesh per creature coat colour rather than shipping one
// model per colour variant - see public/models/README.md. Returns the cloned
// materials so the caller can dispose them; geometry stays shared.
export function tintCat(THREE: typeof T3, root: T3.Object3D, color: number, isShiny = false): T3.Material[] {
  const tint = new THREE.Color(color)
  const gold = new THREE.Color(0xfbbf24)
  const white = new THREE.Color(0xffffff)
  const cloned: T3.Material[] = []

  root.traverse((obj) => {
    const mesh = obj as T3.Mesh
    if (!mesh.isMesh) return
    const isArray = Array.isArray(mesh.material)
    const materials = (isArray ? mesh.material : [mesh.material]) as T3.MeshStandardMaterial[]
    const recoloured = materials.map((m) => {
      if (!TINTED_MATERIAL_NAMES.has(m.name)) return m
      const clone = m.clone()
      // Cat_Secondary is the muzzle, paws, and inner ears: a paler shade of the coat.
      const base = m.name === 'Cat_Secondary' ? tint.clone().lerp(white, 0.55) : tint.clone()
      clone.color = isShiny ? base.lerp(gold, 0.35) : base
      if (isShiny) {
        clone.emissive = gold.clone()
        clone.emissiveIntensity = 0.22
      }
      cloned.push(clone)
      return clone
    })
    mesh.material = isArray ? recoloured : recoloured[0]
  })

  return cloned
}

// Rest-pose crown of cat.glb's head, in model units, measured from the Head-bone vertices.
const HEAD_CROWN = { y: 1.36, z: 0.95 }

// Builds the hat in model space, then attach() moves it onto the Head bone with its
// world transform kept, so it follows the head in every clip. Call it on a fresh clone
// before the caller moves or scales the root. Returns the new materials and geometries
// so the caller can dispose them.
export function addCatHat(THREE: typeof T3, root: T3.Object3D, hat: CatHat): { materials: T3.Material[]; geometries: T3.BufferGeometry[] } {
  const head = root.getObjectByName('Head')
  if (!head || hat !== 'party') return { materials: [], geometries: [] }

  const height = 0.6
  const cone = new THREE.ConeGeometry(0.22, height, 20, 6, true)
  const stripeA = new THREE.Color(0xec4899)
  const stripeB = new THREE.Color(0x38bdf8)
  const pos = cone.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const band = Math.floor(((pos.getY(i) + height / 2) / height) * 6 - 1e-6)
    ;(band % 2 ? stripeB : stripeA).toArray(colors, i * 3)
  }
  cone.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const coneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })
  const pom = new THREE.SphereGeometry(0.08, 12, 8)
  const pomMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 })

  const group = new THREE.Group()
  const coneMesh = new THREE.Mesh(cone, coneMat)
  coneMesh.position.y = height / 2
  const pomMesh = new THREE.Mesh(pom, pomMat)
  pomMesh.position.y = height
  group.add(coneMesh, pomMesh)
  group.position.set(0, HEAD_CROWN.y, HEAD_CROWN.z)
  group.rotation.set(-0.15, 0, 0.2)

  root.updateMatrixWorld(true)
  root.add(group)
  group.updateMatrixWorld(true)
  head.attach(group)

  return { materials: [coneMat, pomMat], geometries: [cone, pom] }
}
