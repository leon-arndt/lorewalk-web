/**
 * Generates procedural creature GLB files for each POI category.
 * Run with: node scripts/generate-creature-glbs.mjs
 *
 * These are CC0 procedural placeholder models. Replace with real CC0 GLBs from
 * kenney.nl or quaternius.com when available — see public/models/README.md.
 */

import { Buffer } from 'buffer'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/models')
mkdirSync(OUT, { recursive: true })

// --- Browser shims for GLTFExporter ---
global.Blob = class {
  constructor(parts = [], opts = {}) {
    const bufs = parts.map((p) => {
      if (typeof p === 'string') return Buffer.from(p, 'utf-8')
      if (p instanceof ArrayBuffer) return Buffer.from(p)
      if (ArrayBuffer.isView(p)) return Buffer.from(p.buffer, p.byteOffset, p.byteLength)
      if (p && p._buf) return p._buf
      return Buffer.from(String(p), 'utf-8')
    })
    this._buf = Buffer.concat(bufs)
    this.size = this._buf.length
    this.type = opts.type ?? ''
  }
}

global.FileReader = class {
  readAsArrayBuffer(blob) {
    const buf = blob._buf
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    // Resolve on next microtask tick so the Promise chain doesn't exit early
    Promise.resolve().then(() => {
      this.result = ab
      this.onloadend?.()
    })
  }
  readAsDataURL(blob) {
    const b64 = blob._buf.toString('base64')
    Promise.resolve().then(() => {
      this.result = `data:${blob.type};base64,${b64}`
      this.onloadend?.()
    })
  }
}

// -------------------------------------------------------

import * as THREE from '/home/zenject/Repos/lorewalk-web/node_modules/three/build/three.module.js'
import { GLTFExporter } from '/home/zenject/Repos/lorewalk-web/node_modules/three/examples/jsm/exporters/GLTFExporter.js'

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  })
}

// Nature — Leafling: slim stem, big head, angled leaf (Pikmin-inspired)
function buildNature(color) {
  const g = new THREE.Group()
  const m = mat(color)
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.52, 4, 8), m)
  stem.position.y = 0.44
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), m)
  head.position.y = 1.0
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 6), mat(0x4ade80))
  leaf.position.set(0.07, 1.44, 0)
  leaf.rotation.z = -0.55
  g.add(stem, head, leaf)
  return g
}

// Heritage — Stonekin: dome shell, small peeking head with crest
function buildHeritage(color) {
  const g = new THREE.Group()
  const m = mat(color)
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    m,
  )
  shell.position.y = 0.04
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.43, 16), m)
  cap.rotation.x = -Math.PI / 2
  cap.position.y = 0.04
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), m)
  head.position.set(0.2, 0.48, 0)
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), mat(0xfef9c3))
  crest.position.set(0.2, 0.73, 0)
  g.add(shell, cap, head, crest)
  return g
}

// Arts — Drifter: translucent jellyfish bell, five tendrils
function buildArts(color) {
  const g = new THREE.Group()
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    mat(color, { transparent: true, opacity: 0.82 }),
  )
  bell.rotation.x = Math.PI
  bell.position.y = 0.85
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2
    const t = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.032, 0.36, 4, 6),
      mat(color, { transparent: true, opacity: 0.65 }),
    )
    t.position.set(Math.cos(ang) * 0.2, 0.38, Math.sin(ang) * 0.2)
    t.rotation.z = Math.sin(ang) * 0.28
    g.add(t)
  }
  g.add(bell)
  return g
}

// Religious — Glowick: glowing orb + flame tip + dot eyes
function buildReligious(color) {
  const g = new THREE.Group()
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 20, 16),
    mat(color, { transparent: true, opacity: 0.88, emissive: color, emissiveIntensity: 0.28 }),
  )
  orb.position.y = 0.68
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.28, 8),
    mat(0xfde68a, { emissive: 0xfde68a, emissiveIntensity: 0.55 }),
  )
  flame.position.y = 1.12
  const eyeM = mat(0x1e293b)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM)
  eyeL.position.set(-0.12, 0.72, 0.3)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.12, 0.72, 0.3)
  g.add(orb, flame, eyeL, eyeR)
  return g
}

// Museum — Hooter: egg body, torus eye-rings, owl ear tufts
function buildMuseum(color) {
  const g = new THREE.Group()
  const m = mat(color)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), m)
  body.scale.y = 1.4
  body.position.y = 0.6
  const whiteM = mat(0xffffff)
  const eyeL = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.036, 8, 18), whiteM)
  eyeL.position.set(-0.13, 0.92, 0.28)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.13, 0.92, 0.28)
  const pupilM = mat(0x1e293b)
  const pL = new THREE.Mesh(new THREE.CircleGeometry(0.055, 10), pupilM)
  pL.position.set(-0.13, 0.92, 0.317)
  const pR = pL.clone()
  pR.position.set(0.13, 0.92, 0.317)
  const tuftL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 5), m)
  tuftL.position.set(-0.14, 1.09, 0.1)
  tuftL.rotation.z = 0.4
  const tuftR = tuftL.clone()
  tuftR.position.set(0.14, 1.09, 0.1)
  tuftR.rotation.z = -0.4
  g.add(body, eyeL, eyeR, pL, pR, tuftL, tuftR)
  return g
}

// Landmark — Warden: stocky body, boxy head, white horns, glowing amber eyes
function buildLandmark(color) {
  const g = new THREE.Group()
  const m = mat(color)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 4, 10), m)
  body.position.y = 0.56
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), m)
  head.position.y = 1.08
  const hornM = mat(0xf1f5f9)
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 6), hornM)
  hornL.position.set(-0.15, 1.38, 0)
  const hornR = hornL.clone()
  hornR.position.set(0.15, 1.38, 0)
  const eyeM = mat(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.5 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM)
  eyeL.position.set(-0.13, 1.08, 0.2)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.13, 1.08, 0.2)
  g.add(body, head, hornL, hornR, eyeL, eyeR)
  return g
}

// Default — blob with dot eyes
function buildDefault(color) {
  const g = new THREE.Group()
  const m = mat(color)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m)
  body.scale.y = 1.22
  body.position.y = 0.56
  const eyeM = mat(0xffffff)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM)
  eyeL.position.set(-0.12, 0.64, 0.29)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.12, 0.64, 0.29)
  const pM = mat(0x1e293b)
  const pL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 5), pM)
  pL.position.set(-0.12, 0.64, 0.325)
  const pR = pL.clone()
  pR.position.set(0.12, 0.64, 0.325)
  g.add(body, eyeL, eyeR, pL, pR)
  return g
}

const CREATURES = [
  { name: 'nature',    color: 0x22c55e, builder: buildNature    },
  { name: 'heritage',  color: 0xf59e0b, builder: buildHeritage  },
  { name: 'arts',      color: 0xa855f7, builder: buildArts      },
  { name: 'religious', color: 0xfacc15, builder: buildReligious },
  { name: 'museum',    color: 0xf472b6, builder: buildMuseum    },
  { name: 'landmark',  color: 0x6366f1, builder: buildLandmark  },
  { name: 'default',   color: 0x94a3b8, builder: buildDefault   },
]

async function exportGlb(obj) {
  return new Promise((resolve, reject) => {
    const exp = new GLTFExporter()
    exp.parse(obj, resolve, reject, { binary: true })
  })
}

for (const { name, color, builder } of CREATURES) {
  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(1, 2, 1.5)
  scene.add(sun)
  scene.add(builder(color))

  const buf = await exportGlb(scene)
  const outPath = `${OUT}/creature-${name}.glb`
  writeFileSync(outPath, Buffer.from(buf))
  console.log(`wrote ${outPath}  (${Math.round(buf.byteLength / 1024)} kB)`)
}

console.log('done')
