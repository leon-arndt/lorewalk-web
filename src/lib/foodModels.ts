import type { Group, Material, Mesh, BufferGeometry } from 'three'

type Three = typeof import('three')
type Vec3 = [number, number, number]

// Low-poly dish models built from three.js primitives, one per food id in
// data/foods.ts. creaturePreview.ts renders them to cached PNG thumbnails.
// Units: a plate has a radius of about 1.

function seededRng(key: string): () => number {
  let s = 0
  for (let i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeKit(THREE: Three, root: Group, rng: () => number) {
  const mats = new Map<string, Material>()

  function mat(color: number, rough = 0.6): Material {
    const key = `${color}:${rough}`
    let m = mats.get(key)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, side: THREE.DoubleSide })
      mats.set(key, m)
    }
    return m
  }

  function add(geo: BufferGeometry, color: number | Material[], pos: Vec3, rot: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): Mesh {
    const mesh = new THREE.Mesh(geo, Array.isArray(color) ? color : mat(color))
    mesh.position.set(...pos)
    mesh.rotation.set(...rot)
    mesh.scale.set(...scale)
    root.add(mesh)
    return mesh
  }

  const sphere = (r: number, color: number, pos: Vec3, scale: Vec3 = [1, 1, 1], rot: Vec3 = [0, 0, 0]) =>
    add(new THREE.SphereGeometry(r, 18, 12), color, pos, rot, scale)
  const dome = (r: number, color: number, pos: Vec3, scale: Vec3 = [1, 1, 1]) =>
    add(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), color, pos, [0, 0, 0], scale)
  const box = (w: number, h: number, d: number, color: number, pos: Vec3, rot: Vec3 = [0, 0, 0]) =>
    add(new THREE.BoxGeometry(w, h, d), color, pos, rot)
  const cyl = (rt: number, rb: number, h: number, color: number | Material[], pos: Vec3, rot: Vec3 = [0, 0, 0], seg = 20) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), color, pos, rot)

  function lathe(pts: [number, number][], color: number, pos: Vec3 = [0, 0, 0], phiStart = 0, phiLength = Math.PI * 2) {
    return add(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 40, phiStart, phiLength), color, pos)
  }

  // Returns the height of the plate's top face.
  function plate(r = 1, color = 0xe2e8f0): number {
    lathe([[0, 0], [0.74 * r, 0], [0.77 * r, 0.03], [r, 0.11], [0.96 * r, 0.12], [0.72 * r, 0.05], [0, 0.05]], color)
    return 0.05
  }

  function leaf(r = 1.1): number {
    cyl(r, r, 0.03, 0x3f8f3a, [0, 0.015, 0], [0, 0.4, 0], 9).scale.set(1, 1, 0.82)
    return 0.03
  }

  // Returns the fill surface height and radius.
  function bowl(opts: { r?: number; h?: number; color?: number; fill: number; level?: number; pos?: Vec3 }) {
    const { r = 0.95, h = 0.55, color = 0xe2e8f0, fill, level = 0.8, pos = [0, 0, 0] } = opts
    lathe([
      [0, 0], [0.45 * r, 0], [0.47 * r, 0.07], [0.8 * r, 0.45 * h], [r, h],
      [0.93 * r, h], [0.74 * r, 0.45 * h], [0.4 * r, 0.12], [0, 0.12],
    ], color, pos)
    const y = level * h
    const fr = y > 0.45 * h
      ? r * (0.74 + ((y - 0.45 * h) / (0.55 * h)) * 0.19)
      : r * (0.4 + ((y - 0.12) / (0.45 * h - 0.12)) * 0.34)
    cyl(fr, fr, 0.02, fill, [pos[0], pos[1] + y, pos[2]], [0, 0, 0], 40)
    return { y: pos[1] + y + 0.01, r: fr }
  }

  function noodles(o: { cx?: number; cz?: number; y: number; radius: number; count: number; tube: number; color: number; mound?: number }) {
    const { cx = 0, cz = 0, y, radius, count, tube, color, mound = 0.1 } = o
    for (let i = 0; i < count; i++) {
      let ang = rng() * Math.PI * 2
      const pts = []
      for (let k = 0; k < 5; k++) {
        const d = radius * (0.15 + 0.85 * rng())
        ang += 0.6 + rng() * 0.9
        pts.push(new THREE.Vector3(cx + Math.cos(ang) * d, y + (1 - d / radius) * mound + rng() * 0.03, cz + Math.sin(ang) * d))
      }
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, tube, 5, false), color, [0, 0, 0])
    }
  }

  function prawn(pos: Vec3, rotY = 0) {
    add(new THREE.TorusGeometry(0.13, 0.055, 8, 14, Math.PI * 1.3), 0xf97316, pos, [-Math.PI / 2 + 0.25, 0, rotY])
    const tail = Math.PI * 1.3 + rotY
    add(new THREE.ConeGeometry(0.05, 0.1, 5), 0xdc2626,
      [pos[0] + Math.cos(tail) * 0.13, pos[1] + 0.02, pos[2] - Math.sin(tail) * 0.13], [Math.PI / 2, 0, -tail])
  }

  function eggHalf(pos: Vec3, r = 0.16) {
    dome(r, 0xfafaf9, pos, [1, 0.8, 1.3])
    cyl(r * 0.6, r * 0.6, 0.02, 0xfbbf24, [pos[0], pos[1] + r * 0.8, pos[2]]).scale.set(1, 1, 1.2)
  }

  function friedEgg(pos: Vec3) {
    cyl(0.3, 0.32, 0.04, 0xfafaf9, pos, [0, 0.5, 0], 9)
    dome(0.11, 0xf59e0b, [pos[0] + 0.03, pos[1] + 0.02, pos[2]], [1, 0.7, 1])
  }

  function cucumber(pos: Vec3, tilt = 0.25) {
    cyl(0.12, 0.12, 0.03, 0xd9f99d, pos, [tilt, 0, 0.1], 14)
  }

  function lime(pos: Vec3) {
    add(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x65a30d, pos, [Math.PI * 0.6, 0, 0])
    cyl(0.105, 0.105, 0.01, 0xd9f99d, pos, [Math.PI * 0.6 - Math.PI / 2, 0, 0], 14)
  }

  function sprinkle(n: number, color: number, cx: number, cz: number, rad: number, y: number, size = 0.025) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * rad
      box(size * (1 + rng()), size * 0.6, size, color, [cx + Math.cos(a) * d, y + rng() * 0.02, cz + Math.sin(a) * d], [0, rng() * 3, 0])
    }
  }

  function greens(n: number, cx: number, cz: number, rad: number, y: number, color = 0x3f9142) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * rad
      sphere(0.08, color, [cx + Math.cos(a) * d, y, cz + Math.sin(a) * d], [1.4, 0.25, 0.8], [0, rng() * 3, 0])
    }
  }

  return { mat, add, sphere, dome, box, cyl, lathe, plate, leaf, bowl, noodles, prawn, eggHalf, friedEgg, cucumber, lime, sprinkle, greens }
}

type Kit = ReturnType<typeof makeKit>

const DISHES: Record<string, (k: Kit, rng: () => number, THREE: Three) => void> = {
  nasi_lemak(k, rng) {
    const y = k.leaf()
    k.dome(0.5, 0xfafaf5, [-0.15, y, -0.15], [1, 0.8, 1])
    k.friedEgg([0.42, y + 0.02, 0.3])
    k.cucumber([0.6, y + 0.06, -0.25])
    k.cucumber([0.5, y + 0.06, -0.48])
    k.dome(0.18, 0xb91c1c, [-0.5, y, 0.45], [1, 0.8, 1])
    for (let i = 0; i < 14; i++) {
      k.sphere(0.045, i % 2 ? 0xb45309 : 0xd6a35c, [0.05 + rng() * 0.25, y + 0.03, 0.45 + rng() * 0.25], [1.4, 0.8, 1])
    }
  },

  kaya_toast(k) {
    const y = k.plate()
    for (const [x, z, ry] of [[-0.25, -0.1, 0.35], [0.3, 0.25, -0.25]] as const) {
      const slice = (sy: number) => {
        k.box(0.82, 0.1, 0.62, 0x9a5b2a, [x, sy, z], [0, ry, 0])
        k.box(0.76, 0.104, 0.56, 0xf0c987, [x, sy, z], [0, ry, 0])
      }
      slice(y + 0.05)
      k.box(0.7, 0.04, 0.5, 0xc28a2c, [x, y + 0.12, z], [0, ry, 0])
      k.box(0.45, 0.07, 0.16, 0xfde68a, [x, y + 0.17, z], [0, ry, 0])
      slice(y + 0.25)
    }
  },

  chicken_rice(k) {
    const y = k.plate()
    k.dome(0.45, 0xfdf3d7, [-0.35, y, -0.15], [1, 0.75, 1])
    for (let i = 0; i < 5; i++) {
      k.box(0.42, 0.09, 0.15, 0xfbf3e4, [0.38, y + 0.06 + i * 0.012, -0.35 + i * 0.16], [0.15, 0.45, 0])
      k.box(0.42, 0.02, 0.15, 0xf2d38f, [0.38, y + 0.11 + i * 0.012, -0.35 + i * 0.16], [0.15, 0.45, 0])
    }
    k.cucumber([0.0, y + 0.03, 0.55], 0)
    k.cucumber([0.2, y + 0.03, 0.6], 0)
    k.cyl(0.16, 0.12, 0.07, 0xf1f5f9, [-0.6, y + 0.04, 0.5])
    k.cyl(0.14, 0.14, 0.01, 0xdc2626, [-0.6, y + 0.08, 0.5])
  },

  min_jiang_kueh(k, _rng, THREE) {
    const y = k.plate()
    for (const [x, z, ry] of [[-0.1, -0.25, 0.3], [0.15, 0.3, 0.3]] as const) {
      k.add(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 20, 1, false, 0, Math.PI), 0xd99a3e, [x, y, z], [0, ry, Math.PI / 2])
      k.add(new THREE.CylinderGeometry(0.24, 0.24, 1.23, 16, 1, false, 0, Math.PI), 0x8b5a2b, [x, y, z], [0, ry, Math.PI / 2])
    }
  },

  ban_mian(k, rng) {
    const { y, r } = k.bowl({ fill: 0xe8d9b5 })
    k.noodles({ y, radius: r * 0.8, count: 9, tube: 0.04, color: 0xf3e3b3, mound: 0.06 })
    k.greens(6, -0.3, 0.1, 0.25, y + 0.06)
    k.eggHalf([0.3, y, 0.15])
    for (let i = 0; i < 8; i++) k.sphere(0.04, 0x7c4a1e, [-0.1 + rng() * 0.3, y + 0.05, -0.45 + rng() * 0.2])
    k.sprinkle(10, 0xc0c0b8, 0.25, -0.3, 0.15, y + 0.05, 0.04)
  },

  char_kway_teow(k, rng) {
    const y = k.plate()
    k.dome(0.65, 0x6b3f1a, [0, y, 0], [1, 0.35, 1])
    k.noodles({ y: y + 0.08, radius: 0.6, count: 10, tube: 0.05, color: 0x7c4a1e, mound: 0.12 })
    k.prawn([0.2, y + 0.24, 0.05], 0.4)
    k.prawn([-0.25, y + 0.2, 0.25], 2.2)
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2
      k.cyl(0.012, 0.012, 0.22, i % 2 ? 0xf5f5dc : 0x4d7c0f, [Math.cos(a) * 0.4, y + 0.2, Math.sin(a) * 0.4], [Math.PI / 2, 0, a])
    }
    for (let i = 0; i < 5; i++) k.sphere(0.05, 0x3f2a1d, [-0.3 + rng() * 0.6, y + 0.2, -0.3 + rng() * 0.3])
  },

  laksa(k, rng) {
    const { y, r } = k.bowl({ fill: 0xf08a24, color: 0xf1f5f9 })
    k.noodles({ y, radius: r * 0.75, count: 8, tube: 0.035, color: 0xf5f0e1, mound: 0.05 })
    for (let i = 0; i < 3; i++) k.box(0.15, 0.13, 0.15, 0xc98a3a, [-0.4 + i * 0.15, y + 0.04, -0.3 + rng() * 0.1], [0.2, rng() * 2, 0.1])
    k.prawn([0.3, y + 0.04, -0.2], 0.8)
    k.eggHalf([0.25, y, 0.3])
    k.dome(0.09, 0xb91c1c, [-0.25, y, 0.35])
    k.greens(5, -0.05, 0.1, 0.2, y + 0.05, 0x166534)
  },

  satay(k, rng) {
    const y = k.leaf()
    for (let s = 0; s < 5; s++) {
      const z = -0.5 + s * 0.22
      const g = (x: number) => [x, y + 0.08, z] as Vec3
      k.cyl(0.015, 0.015, 1.4, 0xd6b07a, g(-0.15), [0, 0, Math.PI / 2], 6)
      for (let i = 0; i < 4; i++) k.box(0.17, 0.12, 0.14, 0x9a4b1f, g(-0.55 + i * 0.19), [rng() * 0.3, rng() * 0.3, 0])
    }
    k.cyl(0.25, 0.18, 0.14, 0xf1f5f9, [0.6, y + 0.07, 0.6])
    k.cyl(0.22, 0.22, 0.01, 0xb5651d, [0.6, y + 0.13, 0.6])
    k.sprinkle(6, 0x7c3a10, 0.6, 0.6, 0.15, y + 0.14, 0.03)
    k.box(0.2, 0.14, 0.14, 0xbef264, [-0.6, y + 0.07, 0.65], [0, 0.4, 0])
  },

  roti_prata(k) {
    const y = k.plate()
    for (const [x, z, s] of [[-0.15, -0.1, 1], [0.2, 0.15, 0.85]] as const) {
      const top = y + 0.04 + (s < 1 ? 0.06 : 0)
      k.cyl(0.6 * s, 0.6 * s, 0.07, 0xe9b65a, [x, top, z], [0, 0, 0], 24)
      for (const rr of [0.48, 0.34, 0.2]) {
        k.cyl(rr * s, rr * s, 0.075, 0xc8873a, [x, top, z], [0, 0, 0], 24)
        k.cyl(rr * s - 0.03, rr * s - 0.03, 0.08, 0xe9b65a, [x, top, z], [0, 0, 0], 24)
      }
    }
    k.bowl({ r: 0.28, h: 0.2, fill: 0xc2410c, pos: [-0.55, y, 0.55] })
  },

  chilli_crab(k, rng) {
    const y = k.plate(1.05)
    k.cyl(0.85, 0.85, 0.03, 0xdc4a1a, [0, y, 0], [0, 0, 0], 32)
    for (let i = 0; i < 8; i++) k.sphere(0.06, 0xfacc15, [-0.6 + rng() * 1.2, y + 0.02, -0.6 + rng() * 1.2], [1.3, 0.4, 1])
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a = side * (0.5 + i * 0.35)
        k.cyl(0.035, 0.03, 0.55, 0xdc2626, [Math.sin(a) * 0.45, y + 0.12, -Math.cos(a) * 0.3 - 0.05], [0, -a, Math.PI / 2 - 0.3 * side])
      }
      k.sphere(0.16, 0xdc2626, [side * 0.38, y + 0.15, 0.42], [1.4, 0.8, 1], [0, side * 0.5, 0])
      k.cyl(0.0, 0.06, 0.2, 0x1c1917, [side * 0.5, y + 0.18, 0.6], [Math.PI / 2, 0, side * 0.4], 6)
      k.cyl(0.0, 0.05, 0.16, 0x1c1917, [side * 0.42, y + 0.18, 0.62], [Math.PI / 2, 0, side * 0.1], 6)
      k.sphere(0.035, 0x1c1917, [side * 0.1, y + 0.29, 0.28])
    }
    k.sphere(0.42, 0xdc2626, [0, y + 0.14, 0], [1.3, 0.42, 1])
    k.sphere(0.2, 0xf6c56b, [-0.62, y + 0.12, 0.62], [1, 0.7, 1])
    k.sphere(0.2, 0xf6c56b, [-0.75, y + 0.12, 0.25], [1, 0.7, 1])
  },

  bak_kut_teh(k, rng) {
    const { y } = k.bowl({ color: 0x5b3a29, fill: 0x9a6b3c, h: 0.5 })
    for (let i = 0; i < 3; i++) {
      const z = -0.3 + i * 0.3
      const ry = rng() * 0.6 - 0.3
      k.box(0.42, 0.17, 0.22, 0x8a5a3c, [0, y + 0.06, z], [0, ry, 0])
      k.cyl(0.035, 0.035, 0.6, 0xf5f5f0, [0, y + 0.08, z], [0, ry, Math.PI / 2], 8)
    }
    for (let i = 0; i < 4; i++) k.sphere(0.07, 0xf5f0e6, [-0.45 + rng() * 0.15, y + 0.03, -0.2 + i * 0.15], [1, 0.8, 0.8])
    k.greens(4, 0.4, 0.2, 0.12, y + 0.04, 0x15803d)
  },

  popiah(k, rng, THREE) {
    const y = k.plate()
    const wrap = k.mat(0xf2ead3)
    const lettuce = k.mat(0x65a30d)
    const turnip = k.mat(0xd6a04f)
    const piece = (pos: Vec3, rot: Vec3) => {
      const outer = k.add(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 18), [wrap, lettuce, lettuce], pos, rot)
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.425, 16), [turnip, turnip, turnip])
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.43, 10), k.mat(0xea580c))
      outer.add(inner, core)
      for (let i = 0; i < 6; i++) {
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.03), k.mat(i % 2 ? 0x7c2d12 : 0xfef08a))
        const a = rng() * Math.PI * 2
        bit.position.set(Math.cos(a) * 0.1, 0.215, Math.sin(a) * 0.1)
        outer.add(bit)
      }
    }
    piece([-0.45, y + 0.21, -0.1], [0, 0, 0])
    piece([0, y + 0.21, -0.2], [0, 0.5, 0])
    piece([0.45, y + 0.21, -0.1], [0, 1, 0])
    piece([0.05, y + 0.2, 0.42], [Math.PI / 2 - 0.15, 0, 1.2])
  },

  hokkien_mee(k) {
    const y = k.plate()
    k.dome(0.6, 0xe8c66a, [0, y, 0], [1, 0.3, 1])
    k.noodles({ y: y + 0.06, radius: 0.58, count: 9, tube: 0.04, color: 0xf2c94c, mound: 0.1 })
    k.noodles({ y: y + 0.08, radius: 0.5, count: 6, tube: 0.02, color: 0xf5f0e1, mound: 0.1 })
    k.prawn([0.15, y + 0.2, -0.1], 0)
    k.prawn([-0.2, y + 0.2, 0.15], 1.8)
    k.lime([0.6, y + 0.05, 0.5])
    k.dome(0.12, 0xb91c1c, [-0.55, y, 0.5])
  },

  rojak(k, rng) {
    const y = k.plate()
    const colors = [0xfacc15, 0x86efac, 0xc2853f, 0xf5f5f4, 0xb7792b]
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * 0.6
      const s = 0.12 + rng() * 0.08
      k.box(s, s * 0.8, s, colors[i % colors.length], [Math.cos(a) * d, y + 0.06 + (0.6 - d) * 0.35, Math.sin(a) * d], [rng() * 3, rng() * 3, rng() * 3])
    }
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * 0.45
      k.sphere(0.1, 0x3b2415, [Math.cos(a) * d, y + 0.14 + (0.6 - d) * 0.35, Math.sin(a) * d], [1.3, 0.35, 1])
    }
    k.sprinkle(30, 0xd6a35c, 0, 0, 0.45, y + 0.3, 0.03)
  },

  ice_kachang(k, rng) {
    const { y } = k.bowl({ fill: 0xf8fafc, h: 0.4, r: 0.85, level: 0.95 })
    const profile: [number, number][] = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      profile.push([0.7 * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.15 * t), t * 1.0])
    }
    k.lathe(profile, 0xf8fafc, [0, y, 0])
    const syrup = profile.slice(4).map(([x, py]) => [x * 1.02 + 0.002, py * 1.01] as [number, number])
    const syrups = [0xef4444, 0x22c55e, 0x92400e, 0xef4444, 0x22c55e]
    syrups.forEach((c, i) => k.lathe(syrup, c, [0, y, 0], i * 1.25 + rng(), 0.55))
    k.lathe(profile.slice(7).map(([x, py]) => [x * 1.03 + 0.003, py * 1.015] as [number, number]), 0xfef9c3, [0, y, 0])
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2
      k.sphere(0.045, 0xfde047, [Math.cos(a) * 0.15, y + 0.98, Math.sin(a) * 0.15])
    }
    for (let i = 0; i < 4; i++) k.sphere(0.05, 0x7f1d1d, [-0.1 + rng() * 0.2, y + 1.02, -0.1 + rng() * 0.2], [1.2, 0.8, 1])
  },

  kueh_lapis(k) {
    const y = k.plate()
    const layers = [0xf472b6, 0xfef3c7, 0x4ade80, 0xfef3c7, 0xf472b6, 0xfef3c7, 0x60a5fa, 0xfef3c7, 0xdc2626]
    for (const [x, z, ry] of [[-0.35, -0.15, 0.3], [0.1, -0.3, -0.2], [0.3, 0.25, 0.5]] as const) {
      layers.forEach((c, i) => k.box(0.36, 0.05, 0.36, c, [x, y + 0.025 + i * 0.05, z], [0, ry, 0]))
    }
  },

  ondeh_ondeh(k, rng) {
    const y = k.leaf(1.0)
    const balls: Vec3[] = [[-0.3, 0, -0.2], [0.2, 0, -0.3], [0.35, 0, 0.2], [-0.15, 0, 0.3], [0.0, 0.3, 0.0]]
    for (const [x, by, z] of balls) {
      const c: Vec3 = [x, y + 0.22 + by, z]
      k.sphere(0.23, 0x5fb54a, c)
      for (let i = 0; i < 26; i++) {
        const u = rng() * 0.8 + 0.2
        const a = rng() * Math.PI * 2
        const s = Math.sqrt(1 - u * u)
        k.box(0.05, 0.012, 0.02, 0xfafaf9, [c[0] + Math.cos(a) * s * 0.235, c[1] + u * 0.235, c[2] + Math.sin(a) * s * 0.235], [rng() * 3, rng() * 3, 0])
      }
    }
  },

  tau_huay(k, rng) {
    const { y, r } = k.bowl({ fill: 0xd4a64a, level: 0.6, color: 0xbfdbfe })
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng()
      const d = r * 0.45
      k.sphere(0.3, 0xfffdf5, [Math.cos(a) * d, y + 0.02, Math.sin(a) * d], [1, 0.3, 1], [0, a, 0.1])
    }
    k.sphere(0.32, 0xfffdf5, [0, y + 0.05, 0], [1, 0.3, 1])
  },

  mee_rebus(k, rng) {
    const { y, r } = k.bowl({ fill: 0xc9792b, color: 0xf1f5f9 })
    k.noodles({ y, radius: r * 0.75, count: 8, tube: 0.05, color: 0xf2c94c, mound: 0.04 })
    k.eggHalf([0.3, y, 0.15])
    k.lime([-0.3, y + 0.05, 0.3])
    for (let i = 0; i < 5; i++) k.cyl(0.05, 0.05, 0.02, 0x16a34a, [-0.1 + rng() * 0.3, y + 0.05, -0.3 + rng() * 0.2], [0.2, 0, 0.2], 10)
    for (let i = 0; i < 2; i++) k.box(0.13, 0.11, 0.13, 0xe0b56a, [-0.35 + i * 0.12, y + 0.04, -0.2], [0, 0.4, 0])
    k.sprinkle(16, 0x7c2d12, 0, 0, 0.45, y + 0.06, 0.025)
  },

  durian_pengat(k, rng, THREE) {
    const { y } = k.bowl({ fill: 0xfde68a, r: 0.7, h: 0.45, pos: [-0.3, 0, 0.25] })
    for (let i = 0; i < 4; i++) k.sphere(0.1, 0xfacc15, [-0.45 + rng() * 0.3, y + 0.01, 0.1 + rng() * 0.3], [1.3, 0.5, 1])
    const c: Vec3 = [0.55, 0.42, -0.4]
    k.sphere(0.4, 0x84a33a, c, [1, 1.12, 1])
    const n = 70
    for (let i = 0; i < n; i++) {
      const v = 1 - (i / (n - 1)) * 2
      const s = Math.sqrt(1 - v * v)
      const a = i * 2.39996
      const dir = new THREE.Vector3(Math.cos(a) * s, v, Math.sin(a) * s)
      const spike = k.add(new THREE.ConeGeometry(0.045, 0.12, 4), 0x6b8e23, [0, 0, 0])
      spike.position.set(c[0] + dir.x * 0.42, c[1] + dir.y * 0.47, c[2] + dir.z * 0.42)
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    }
    k.cyl(0.04, 0.05, 0.15, 0x6b4423, [c[0], c[1] + 0.52, c[2]], [0, 0, 0], 6)
  },
}

export function buildFoodModel(THREE: Three, foodId: string): Group {
  const root = new THREE.Group()
  const rng = seededRng(foodId)
  const kit = makeKit(THREE, root, rng)
  const build = DISHES[foodId]
  if (build) build(kit, rng, THREE)
  else {
    const y = kit.plate()
    kit.dome(0.5, 0xf59e0b, [0, y, 0], [1, 0.6, 1])
  }
  return root
}

export function disposeModel(root: Group) {
  const mats = new Set<Material>()
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    m.geometry.dispose()
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat)
  })
  mats.forEach((m) => m.dispose())
}
