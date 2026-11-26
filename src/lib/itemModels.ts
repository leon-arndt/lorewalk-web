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

  // A compass rose: the expedition reward.
  compass(THREE, g) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 40), mat(THREE, 0xb45309))
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 40), mat(THREE, 0xf8fafc, 0.5, 0))
    const north = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), mat(THREE, 0xef4444, 0.4, 0))
    north.rotation.x = -Math.PI / 2
    north.position.set(0, 0.1, -0.17)
    const south = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), mat(THREE, 0x334155, 0.4, 0))
    south.rotation.x = Math.PI / 2
    south.position.set(0, 0.1, 0.17)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), mat(THREE, 0xfbbf24))
    hub.position.y = 0.12
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), mat(THREE, 0xb45309))
    loop.position.z = -0.56
    loop.rotation.x = Math.PI / 2
    g.add(body, face, north, south, hub, loop)
  },

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
  // A gift box: the reward chest and the "ready to collect" badge.
  chest(THREE, g) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.9), mat(THREE, 0x16a34a, 0.5, 0))
    box.position.y = 0.31
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.0), mat(THREE, 0x15803d, 0.5, 0))
    lid.position.y = 0.72
    const gold = mat(THREE, 0xfbbf24)
    const ribbonA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.86, 1.02), gold)
    ribbonA.position.y = 0.43
    const ribbonB = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.86, 0.16), gold)
    ribbonB.position.y = 0.43
    g.add(box, lid, ribbonA, ribbonB)
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), gold)
      loop.position.set(side * 0.15, 0.95, 0)
      loop.rotation.set(0, Math.PI / 2, side * 0.6)
      g.add(loop)
    }
  },

  // A map pin with a white dot: the check-in reward.
  pin(THREE, g) {
    const red = mat(THREE, 0xef4444, 0.4, 0.1)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), red)
    head.position.y = 1.05
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.8, 24), red)
    tip.position.y = 0.55
    tip.rotation.x = Math.PI
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(THREE, 0xffffff, 0.4, 0))
    dot.position.set(0, 1.08, 0.33)
    const shadow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24), mat(THREE, 0x94a3b8, 0.8, 0))
    g.add(head, tip, dot, shadow)
  },

  // A sneaker seen from the side, toe to +x: steps and the weekly walk.
  sneaker(THREE, g) {
    const blue = mat(THREE, 0x2563eb, 0.5, 0)
    const white = mat(THREE, 0xf8fafc, 0.6, 0)
    const sole = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.5), white)
    sole.position.y = 0.07
    const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 20, 1, false, 0, Math.PI), white)
    toe.position.set(0.62, 0.07, 0)
    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), blue)
    upper.scale.set(1.45, 0.85, 0.6)
    upper.position.set(0.05, 0.13, 0)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.34, 18), blue)
    collar.position.set(-0.34, 0.38, 0)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.62), white)
    stripe.position.set(0.02, 0.3, 0)
    stripe.rotation.z = 0.35
    g.add(sole, toe, upper, collar, stripe)
    for (let i = 0; i < 3; i++) {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.3), white)
      lace.position.set(0.1 + i * 0.12, 0.47 - i * 0.05, 0)
      g.add(lace)
    }
  },

  // A gold cup: a finished weekly walk.
  trophy(THREE, g) {
    const gold = mat(THREE, 0xfbbf24)
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.18, 0.6, 28, 1, true), gold)
    cup.position.y = 0.95
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 28), gold)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 1.25
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 12), gold)
    stem.position.y = 0.5
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 28), mat(THREE, 0x92400e, 0.5, 0))
    base.position.y = 0.26
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 28), mat(THREE, 0x78350f, 0.5, 0))
    plinth.position.y = 0.09
    g.add(cup, rim, stem, base, plinth)
    // Full rings: the inner half hides inside the cup wall.
    for (const side of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 20), gold)
      handle.position.set(side * 0.44, 1.0, 0)
      g.add(handle)
    }
  },

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
