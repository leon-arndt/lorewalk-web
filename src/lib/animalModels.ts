import type * as T3 from 'three'

type Three = typeof T3

// Singapore critters built from three.js shapes: the kampung chicken and the red
// junglefowl, the Asian koel, and the cicada. A creature with a `body` in
// data/creatures.ts uses one of these instead of the rigged cat. Each model faces
// +z, stands on y = 0, and has named parts that animateAnimal() moves:
// Legs (LegL, LegR, Leg*), wings (WingL, WingR), Head, Tail, and Body.

export type AnimalBody = 'chicken' | 'cicada' | 'koel'

// Height of each animal next to the cat, which creaturePreview and the map fit
// to MODEL_FIT_HEIGHT. A real cicada is tiny; this one is toy-sized to read.
const FIT: Record<AnimalBody, number> = { chicken: 0.85, koel: 0.75, cicada: 0.55 }

interface Palette { main: number; second: number; shiny: boolean }

function makeMat(THREE: Three, color: number, opts: { rough?: number; opacity?: number; emissive?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.6, metalness: 0,
    transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissive ? 0.25 : 0,
  })
}

function mesh(THREE: Three, geo: T3.BufferGeometry, mat: T3.Material, pos: [number, number, number], name?: string) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  if (name) m.name = name
  return m
}

// A leg that swings from the hip: the group sits at the hip, the mesh hangs below.
function leg(THREE: Three, name: string, mat: T3.Material, hip: [number, number, number], length: number, radius: number) {
  const g = new THREE.Group()
  g.name = name
  g.position.set(...hip)
  g.add(mesh(THREE, new THREE.CylinderGeometry(radius, radius, length, 6), mat, [0, -length / 2, 0]))
  const foot = mesh(THREE, new THREE.BoxGeometry(radius * 5, radius * 1.2, radius * 6), mat, [0, -length, radius * 2])
  g.add(foot)
  return g
}

function eyes(THREE: Three, parent: T3.Object3D, color: number, y: number, z: number, x: number, r: number) {
  for (const side of [-1, 1]) {
    parent.add(mesh(THREE, new THREE.SphereGeometry(r, 10, 8), makeMat(THREE, color, { rough: 0.2 }), [side * x, y, z], 'Eye'))
  }
}

function buildChicken(THREE: Three, p: Palette): T3.Group {
  const g = new THREE.Group()
  const main = makeMat(THREE, p.main, { emissive: p.shiny ? 0xfacc15 : undefined })
  const second = makeMat(THREE, p.second)
  const red = makeMat(THREE, 0xdc2626, { rough: 0.5 })
  const yellow = makeMat(THREE, 0xf59e0b, { rough: 0.5 })

  const body = new THREE.Group()
  body.name = 'Body'
  const torso = mesh(THREE, new THREE.SphereGeometry(0.32, 18, 14), main, [0, 0.58, 0])
  torso.scale.set(0.9, 0.85, 1.12)
  body.add(torso)

  const tail = new THREE.Group()
  tail.name = 'Tail'
  tail.position.set(0, 0.68, -0.28)
  for (const [i, tilt] of [[-1, 0.5], [0, 0.85], [1, 0.5]] as const) {
    const feather = mesh(THREE, new THREE.BoxGeometry(0.07, 0.42, 0.14), second, [i * 0.08, 0.16, -0.04])
    feather.rotation.x = -tilt
    feather.rotation.z = i * 0.25
    tail.add(feather)
  }
  body.add(tail)

  for (const side of [-1, 1]) {
    const wing = mesh(THREE, new THREE.SphereGeometry(0.2, 12, 8), second, [side * 0.27, 0.6, -0.02], side < 0 ? 'WingL' : 'WingR')
    wing.scale.set(0.35, 0.75, 1.15)
    body.add(wing)
  }

  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 0.86, 0.24)
  head.add(mesh(THREE, new THREE.SphereGeometry(0.15, 16, 12), main, [0, 0.06, 0]))
  for (const [z, y, r] of [[-0.05, 0.22, 0.05], [0.01, 0.24, 0.06], [0.07, 0.22, 0.05]] as const) {
    head.add(mesh(THREE, new THREE.SphereGeometry(r, 8, 6), red, [0, y, z]))
  }
  const beak = mesh(THREE, new THREE.ConeGeometry(0.045, 0.12, 6), yellow, [0, 0.04, 0.17])
  beak.rotation.x = Math.PI / 2
  head.add(beak)
  head.add(mesh(THREE, new THREE.SphereGeometry(0.04, 8, 6), red, [0, -0.04, 0.13]))
  eyes(THREE, head, 0x111827, 0.09, 0.1, 0.1, 0.03)
  body.add(head)

  g.add(body)
  g.add(leg(THREE, 'LegL', yellow, [-0.1, 0.32, 0.02], 0.3, 0.025))
  g.add(leg(THREE, 'LegR', yellow, [0.1, 0.32, 0.02], 0.3, 0.025))
  return g
}

function buildKoel(THREE: Three, p: Palette): T3.Group {
  const g = new THREE.Group()
  const main = makeMat(THREE, p.main, { rough: 0.35, emissive: p.shiny ? 0xfacc15 : undefined })
  const spots = makeMat(THREE, p.second, { rough: 0.6 })
  const beakMat = makeMat(THREE, 0xc8d6a0, { rough: 0.4 })
  const legMat = makeMat(THREE, 0x475569)

  const body = new THREE.Group()
  body.name = 'Body'
  const torso = mesh(THREE, new THREE.SphereGeometry(0.24, 18, 14), main, [0, 0.5, 0])
  torso.scale.set(0.8, 0.8, 1.35)
  torso.rotation.x = -0.25
  body.add(torso)

  const tail = new THREE.Group()
  tail.name = 'Tail'
  tail.position.set(0, 0.46, -0.28)
  const feathers = mesh(THREE, new THREE.BoxGeometry(0.14, 0.04, 0.6), main, [0, -0.06, -0.26])
  feathers.rotation.x = 0.3
  tail.add(feathers)
  body.add(tail)

  for (const side of [-1, 1]) {
    const wing = mesh(THREE, new THREE.SphereGeometry(0.18, 12, 8), main, [side * 0.18, 0.52, -0.04], side < 0 ? 'WingL' : 'WingR')
    wing.scale.set(0.3, 0.65, 1.45)
    body.add(wing)
  }

  // The female koel is brown with pale spots. The male is all black.
  if (p.second !== p.main) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const dot = mesh(THREE, new THREE.SphereGeometry(0.025, 6, 4), spots, [Math.cos(a) * 0.16, 0.6 + Math.sin(a * 2) * 0.05, -0.1 + Math.sin(a) * 0.18])
      body.add(dot)
    }
  }

  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 0.74, 0.26)
  head.add(mesh(THREE, new THREE.SphereGeometry(0.15, 16, 12), main, [0, 0, 0]))
  const beak = mesh(THREE, new THREE.ConeGeometry(0.045, 0.16, 6), beakMat, [0, -0.02, 0.18])
  beak.rotation.x = Math.PI / 2
  head.add(beak)
  // The koel's eye is a bright red ring.
  eyes(THREE, head, 0xdc2626, 0.03, 0.09, 0.1, 0.035)
  body.add(head)

  g.add(body)
  g.add(leg(THREE, 'LegL', legMat, [-0.08, 0.3, 0.04], 0.28, 0.02))
  g.add(leg(THREE, 'LegR', legMat, [0.08, 0.3, 0.04], 0.28, 0.02))
  return g
}

function buildCicada(THREE: Three, p: Palette): T3.Group {
  const g = new THREE.Group()
  const main = makeMat(THREE, p.main, { rough: 0.45, emissive: p.shiny ? 0xfacc15 : undefined })
  const dark = makeMat(THREE, p.second, { rough: 0.5 })
  const wingMat = makeMat(THREE, 0xe0f2fe, { rough: 0.15, opacity: 0.55 })
  const veinMat = makeMat(THREE, 0x334155)

  const body = new THREE.Group()
  body.name = 'Body'
  const abdomen = mesh(THREE, new THREE.CapsuleGeometry(0.16, 0.36, 6, 12), main, [0, 0.3, -0.06])
  abdomen.rotation.x = Math.PI / 2
  body.add(abdomen)
  for (let i = 0; i < 4; i++) {
    const band = mesh(THREE, new THREE.TorusGeometry(0.155, 0.012, 6, 18), dark, [0, 0.3, -0.24 + i * 0.08])
    body.add(band)
  }

  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 0.32, 0.26)
  const face = mesh(THREE, new THREE.SphereGeometry(0.15, 16, 12), dark, [0, 0, 0])
  face.scale.set(1.35, 0.8, 0.8)
  head.add(face)
  eyes(THREE, head, 0x7f1d1d, 0.04, 0.03, 0.19, 0.06)
  body.add(head)

  // Clear wings fold like a tent over the back.
  for (const side of [-1, 1]) {
    const wing = new THREE.Group()
    wing.name = side < 0 ? 'WingL' : 'WingR'
    wing.position.set(side * 0.06, 0.44, 0.12)
    wing.rotation.z = side * 0.55
    const blade = mesh(THREE, new THREE.SphereGeometry(0.2, 12, 8), wingMat, [side * 0.02, 0, -0.32])
    blade.scale.set(0.7, 0.08, 2.1)
    wing.add(blade)
    const vein = mesh(THREE, new THREE.BoxGeometry(0.012, 0.012, 0.7), veinMat, [side * 0.02, 0.012, -0.3])
    wing.add(vein)
    body.add(wing)
  }

  g.add(body)
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const l = leg(THREE, `Leg${side < 0 ? 'L' : 'R'}${i}`, dark, [side * 0.12, 0.22, 0.12 - i * 0.12], 0.2, 0.014)
      l.rotation.z = side * 0.5
      g.add(l)
    }
  }
  return g
}

const BUILDERS: Record<AnimalBody, (THREE: Three, p: Palette) => T3.Group> = {
  chicken: buildChicken,
  koel: buildKoel,
  cicada: buildCicada,
}

// Returns a root whose child holds the model, scaled to its FIT height. The root
// is free for the caller to place, turn, and scale.
export function buildAnimal(THREE: Three, body: AnimalBody, color: number, color2: number | undefined, shiny = false): T3.Group {
  const model = BUILDERS[body](THREE, { main: color, second: color2 ?? color, shiny })
  model.updateMatrixWorld(true)
  const height = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y
  if (height > 0) model.scale.setScalar(FIT[body] / height)
  const root = new THREE.Group()
  root.add(model)
  root.userData.animal = body
  return root
}

// Moves the named parts for one frame. `t` is a running time in seconds. The
// caller keeps the root's own position and turn.
export function animateAnimal(root: T3.Object3D, walking: boolean, t: number) {
  const body = root.userData.animal as AnimalBody | undefined
  if (!body) return
  const part = (name: string) => root.getObjectByName(name)
  const swing = walking ? Math.sin(t * 14) * 0.6 : 0

  if (body === 'cicada') {
    // A cicada flits: it hovers with buzzing wings while it moves.
    const buzz = walking ? Math.sin(t * 60) * 0.35 : 0
    const wingL = part('WingL')
    const wingR = part('WingR')
    if (wingL) wingL.rotation.z = -0.55 - (walking ? 0.6 : 0) + buzz
    if (wingR) wingR.rotation.z = 0.55 + (walking ? 0.6 : 0) - buzz
    const b = part('Body')
    if (b) b.position.y = walking ? 0.12 + Math.sin(t * 6) * 0.03 : 0
    for (let i = 0; i < 3; i++) {
      for (const s of ['L', 'R']) {
        const l = part(`Leg${s}${i}`)
        if (l) l.rotation.x = walking ? 0.6 : Math.sin(t * 2 + i) * 0.05
      }
    }
    return
  }

  const legL = part('LegL')
  const legR = part('LegR')
  if (legL) legL.rotation.x = swing
  if (legR) legR.rotation.x = -swing

  const head = part('Head')
  const tail = part('Tail')
  if (body === 'chicken') {
    // Walk: the head bobs forward and back. Idle: a peck now and then.
    const peck = Math.max(0, Math.sin(t * 1.3) - 0.85) * 6
    if (head) {
      head.rotation.x = walking ? 0 : peck * 0.9
      head.position.z = 0.24 + (walking ? Math.sin(t * 14) * 0.04 : 0)
    }
    if (tail) tail.rotation.x = Math.sin(t * 3) * 0.05
  } else {
    // The koel pumps its long tail and looks around.
    if (tail) tail.rotation.x = Math.sin(t * (walking ? 10 : 2.2)) * 0.18
    if (head) head.rotation.y = walking ? 0 : Math.sin(t * 0.7) * 0.5
  }
  const flap = walking ? Math.abs(Math.sin(t * 7)) * 0.3 : 0
  const wingL = part('WingL')
  const wingR = part('WingR')
  if (wingL) wingL.rotation.z = flap
  if (wingR) wingR.rotation.z = -flap
}
