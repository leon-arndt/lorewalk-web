import type { Group, Shape } from 'three'

type Three = typeof import('three')

// Reward icons (coins, XP, medal, level-up, slots) built from three.js shapes.
// creaturePreview.ts renders them to cached PNG thumbnails, like the dishes.

function starShape(THREE: Three, points: number, outer: number, inner: number): Shape {
  const shape = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  shape.closePath()
  return shape
}

function mat(THREE: Three, color: number, rough = 0.35, metal = 0.25) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
}

function extrude(THREE: Three, shape: Shape, depth: number, color: number) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 })
  geo.center()
  return new THREE.Mesh(geo, mat(THREE, color))
}

function coin(THREE: Three, g: Group) {
  const face = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40), mat(THREE, 0xf59e0b))
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 40), mat(THREE, 0xfcd34d))
  const star = extrude(THREE, starShape(THREE, 5, 0.22, 0.1), 0.04, 0xf59e0b)
  star.rotation.x = -Math.PI / 2
  star.position.y = 0.09
  face.add(body, inner, star)
  g.add(face)
}

const BUILDERS: Record<string, (THREE: Three, g: Group) => void> = {
  coins: coin,

  xp(THREE, g) {
    const star = extrude(THREE, starShape(THREE, 5, 0.5, 0.22), 0.14, 0xfbbf24)
    star.rotation.x = -Math.PI / 2
    g.add(star)
  },

  badge(THREE, g) {
    coin(THREE, g)
    for (const side of [-1, 1]) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.55), mat(THREE, side < 0 ? 0xdc2626 : 0x2563eb, 0.6, 0))
      ribbon.position.set(side * 0.13, -0.04, -0.62)
      ribbon.rotation.y = side * 0.35
      g.add(ribbon)
    }
  },

  level_up(THREE, g) {
    const big = extrude(THREE, starShape(THREE, 4, 0.5, 0.13), 0.1, 0xfde047)
    big.rotation.x = -Math.PI / 2
    const small = extrude(THREE, starShape(THREE, 4, 0.22, 0.06), 0.08, 0xfef08a)
    small.rotation.x = -Math.PI / 2
    small.position.set(0.45, 0.05, -0.4)
    g.add(big, small)
  },

  creature_slots(THREE, g) {
    const m = mat(THREE, 0xa16207, 0.6, 0)
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), m)
    pad.scale.set(1.15, 0.35, 1)
    pad.position.z = 0.12
    g.add(pad)
    for (const [x, z] of [[-0.33, -0.12], [-0.12, -0.32], [0.12, -0.32], [0.33, -0.12]]) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), m)
      toe.scale.set(1, 0.4, 1.15)
      toe.position.set(x, 0, z)
      g.add(toe)
    }
  },
}

export function hasItemModel(type: string): boolean {
  return type in BUILDERS
}

// The icon lies in the xz plane. Tilt it up so its face points at the camera.
export function buildItemModel(THREE: Three, type: string): Group {
  const root = new THREE.Group()
  const g = new THREE.Group()
  BUILDERS[type]?.(THREE, g)
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.15, 0.45, 1).normalize())
  root.add(g)
  return root
}
