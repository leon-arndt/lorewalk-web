import type * as T3 from 'three'

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
