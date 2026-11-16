import type * as T3 from 'three'

// Blinks a model's eyes by squashing them flat along the model's up axis for a
// moment. The squash runs in the vertex shader before skinning, because a rigged
// model's eyes share one vertex buffer with the body and must follow the head bone.
// An eye is any mesh whose own name or material name starts with "eye".

const CLOSE_S = 0.06
const OPEN_S = 0.1
const CLOSED_SCALE = 0.1
const DOUBLE_BLINK_CHANCE = 0.2

export interface Blinker {
  update: (dt: number) => void
  // The cloned eye materials. The caller disposes them with the model.
  materials: T3.Material[]
}

function isEye(mesh: T3.Mesh): boolean {
  const mat = mesh.material as T3.Material
  return /^eye/i.test(mesh.name) || /^eye/i.test(mat.name)
}

export function addBlink(THREE: typeof T3, root: T3.Object3D): Blinker {
  const blink = { value: 1 }
  const materials: T3.Material[] = []

  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const mesh = o as T3.Mesh
    if (!mesh.isMesh || Array.isArray(mesh.material) || !isEye(mesh)) return

    // World up, and the eyes' vertical middle, in the geometry's own bind space.
    const up = new THREE.Vector3(0, 1, 0).transformDirection(mesh.matrixWorld.clone().invert())
    const pos = mesh.geometry.attributes.position
    const index = mesh.geometry.index
    const v = new THREE.Vector3()
    let lo = Infinity, hi = -Infinity
    const count = index ? index.count : pos.count
    for (let k = 0; k < count; k++) {
      const h = v.fromBufferAttribute(pos, index ? index.getX(k) : k).dot(up)
      lo = Math.min(lo, h)
      hi = Math.max(hi, h)
    }
    if (lo > hi) return

    const mid = (lo + hi) / 2
    const mat = mesh.material.clone()
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBlink = blink
      shader.uniforms.uBlinkUp = { value: up }
      shader.uniforms.uBlinkMid = { value: mid }
      shader.vertexShader = 'uniform float uBlink;\nuniform vec3 uBlinkUp;\nuniform float uBlinkMid;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed -= uBlinkUp * (dot(transformed, uBlinkUp) - uBlinkMid) * (1.0 - uBlink);',
        )
    }
    mesh.material = mat
    materials.push(mat)
  })

  // Starts above 0.3 s, so a still portrait rendered after update(0.3) has open eyes.
  let wait = 1 + Math.random() * 4
  let t = -1
  let quick = false

  return {
    materials,
    update(dt) {
      if (!materials.length) return
      if (t < 0) {
        wait -= dt
        if (wait > 0) return
        t = 0
      }
      t += dt
      if (t >= CLOSE_S + OPEN_S) {
        t = -1
        blink.value = 1
        quick = !quick && Math.random() < DOUBLE_BLINK_CHANCE
        wait = quick ? 0.12 : 2 + Math.random() * 4
        return
      }
      const shut = t < CLOSE_S ? t / CLOSE_S : 1 - (t - CLOSE_S) / OPEN_S
      blink.value = 1 - shut * (1 - CLOSED_SCALE)
    },
  }
}
