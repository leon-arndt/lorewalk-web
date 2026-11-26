import type { Group, Shape } from 'three'

type Three = typeof import('three')

// Reward and map icons (coins, XP, medal, level-up, slots, shrine, claim flag)
// built from three.js shapes.
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

// These stand upright and face +z already, so buildItemModel does not tilt them.
const UPRIGHT: Record<string, (THREE: Three, g: Group) => void> = {
  shrine(THREE, g) {
    const red = mat(THREE, 0xdc2626, 0.5, 0)
    const black = mat(THREE, 0x1f2937, 0.6, 0)
    for (const x of [-0.42, 0.42]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 1.2, 16), red)
      pillar.position.set(x, 0.6, 0)
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), black)
      foot.position.set(x, 0.05, 0)
      g.add(pillar, foot)
    }
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.1), red)
    nuki.position.y = 0.92
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), red)
    tie.position.y = 1.08
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.16), red)
    shimaki.position.y = 1.22
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.2), black)
    kasagi.position.y = 1.31
    for (const side of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.2), black)
      tip.position.set(side * 0.82, 1.34, 0)
      tip.rotation.z = side * 0.25
      g.add(tip)
    }
    g.add(nuki, tie, shimaki, kasagi)
  },

  claim(THREE, g) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 24), mat(THREE, 0x94a3b8, 0.6, 0))
    base.position.y = 0.06
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 10), mat(THREE, 0xe2e8f0, 0.3, 0.5))
    pole.position.y = 0.76
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(THREE, 0xfbbf24))
    knob.position.y = 1.48
    const cloth = new THREE.PlaneGeometry(0.75, 0.48, 12, 4)
    const pos = cloth.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + 0.375
      pos.setZ(i, Math.sin(x * 7) * 0.06 * x)
    }
    cloth.computeVertexNormals()
    const flag = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7, side: THREE.DoubleSide }))
    flag.position.set(0.41, 1.18, 0)
    g.add(base, pole, knob, flag)
  },
}

export function hasItemModel(type: string): boolean {
  return type in BUILDERS || type in UPRIGHT
}

// The icon lies in the xz plane. Tilt it up so its face points at the camera.
export function buildItemModel(THREE: Three, type: string): Group {
  const root = new THREE.Group()
  const g = new THREE.Group()
  if (UPRIGHT[type]) {
    UPRIGHT[type](THREE, g)
    g.rotation.y = -0.3
  } else {
    BUILDERS[type]?.(THREE, g)
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.15, 0.45, 1).normalize())
  }
  root.add(g)
  return root
}
