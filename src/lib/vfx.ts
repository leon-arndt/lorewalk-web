import type * as T3 from 'three'

// Particle effects, data-driven like lib/sfx.ts: public/vfx/vfxbank.json holds
// every effect, and the dev editor (src/dev/VfxEditor.tsx) writes it.
// Units: 1 unit is 1 m at zoom 20. The map layer scales effects with zoom like
// the companions: the player avatar is 5.6 units tall and a companion cat 3.2.

export type VfxSprite = 'glow' | 'star' | 'disc' | 'square'
export type VfxBlend = 'additive' | 'normal'
export type VfxShape = 'point' | 'sphere' | 'ring'
export type VfxRange = [number, number]
export type VfxVec3 = [number, number, number]

export interface VfxEmitter {
  name: string
  /** Seconds after the effect starts before this emitter starts. */
  delay: number
  /** Seconds the emitter keeps emitting at `rate`. 0 = burst only. */
  duration: number
  /** Particles emitted at once when the emitter starts (or per death, for an onDeath emitter). */
  burst: number
  /** Particles per second while the emitter runs. */
  rate: number
  life: VfxRange
  shape: VfxShape
  radius: number
  offset: VfxVec3
  direction: VfxVec3
  /** Half-angle of the emission cone in degrees. 180 emits in every direction. */
  spread: number
  speed: VfxRange
  /** Units per second squared, pulling down. Negative floats up. */
  gravity: number
  drag: number
  /** Size at birth and at death, in units. */
  size: VfxRange
  /** Opacity at birth and at death. */
  alpha: VfxRange
  /** Each particle picks one start colour at random. */
  colors: string[]
  /** Every particle fades toward this colour over its life. Empty keeps the start colour. */
  endColor: string
  sprite: VfxSprite
  blend: VfxBlend
  /** Max spin in degrees per second, random direction per particle. */
  spin: number
  /** 0 = steady, 1 = full flicker. */
  twinkle: number
  /** Emitter to burst at the spot where each particle dies. */
  onDeath?: string
  /** Emitter that each living particle leaves behind, `trailRate` particles per second. */
  trail?: string
  trailRate?: number
}

export interface VfxEffect {
  loop: boolean
  emitters: VfxEmitter[]
}

export interface VfxBank {
  version: 1
  effects: Record<string, VfxEffect>
}

export const VFX_BANK_URL = '/vfx/vfxbank.json'

export function defaultEmitter(name: string): VfxEmitter {
  return {
    name, delay: 0, duration: 0, burst: 30, rate: 0,
    life: [0.8, 1.4], shape: 'point', radius: 0, offset: [0, 1, 0],
    direction: [0, 1, 0], spread: 180, speed: [2, 4], gravity: 2, drag: 0.5,
    size: [0.6, 0.1], alpha: [1, 0], colors: ['#fde68a'], endColor: '#f97316',
    sprite: 'glow', blend: 'normal', spin: 0, twinkle: 0,
  }
}

// Fills missing fields, so a hand-edited or older bank still plays.
export function normalizeEffect(e: Partial<VfxEffect>): VfxEffect {
  return {
    loop: !!e.loop,
    emitters: (e.emitters ?? []).map((m) => ({ ...defaultEmitter(m.name ?? 'emitter'), ...m })),
  }
}

let bankPromise: Promise<VfxBank> | null = null

export function loadVfxBank(fresh = false): Promise<VfxBank> {
  if (!bankPromise || fresh) {
    bankPromise = fetch(VFX_BANK_URL, { cache: fresh ? 'no-store' : 'default' })
      .then((r) => (r.ok ? r.json() : { version: 1, effects: {} }))
      .then((b: VfxBank) => {
        const effects: Record<string, VfxEffect> = {}
        for (const [id, e] of Object.entries(b.effects ?? {})) effects[id] = normalizeEffect(e)
        return { version: 1 as const, effects }
      })
      .catch(() => ({ version: 1 as const, effects: {} }))
  }
  return bankPromise
}

const MAX_PARTICLES = 3000

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aAlpha;
attribute float aSize;
attribute float aRot;
uniform float uK;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
  gl_PointSize = clamp(aSize * uK / p.w, 1.0, 256.0);
  vColor = aColor; vAlpha = aAlpha; vRot = aRot;
}`

const FRAG = /* glsl */ `
uniform int uSprite;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float c = cos(vRot), s = sin(vRot);
  uv = mat2(c, -s, s, c) * uv;
  float d = length(uv);
  float a;
  if (uSprite == 0) {
    float g = clamp(1.0 - d, 0.0, 1.0);
    a = g * g * (3.0 - 2.0 * g);
  } else if (uSprite == 1) {
    vec2 q = abs(uv);
    float rays = max(0.0, 1.0 - q.x * 9.0) * (1.0 - q.y) + max(0.0, 1.0 - q.y * 9.0) * (1.0 - q.x);
    a = clamp(rays + pow(max(0.0, 1.0 - d * 2.2), 2.0), 0.0, 1.0);
  } else if (uSprite == 2) {
    a = smoothstep(1.0, 0.8, d);
  } else {
    a = step(abs(uv.x), 0.8) * step(abs(uv.y), 0.45);
  }
  a *= vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`

const SPRITE_INDEX: Record<VfxSprite, number> = { glow: 0, star: 1, disc: 2, square: 3 }

// Hex to raw sRGB floats. The shader writes them straight out, so they skip
// three's colour management on purpose.
function hexRgb(hex: string): VfxVec3 {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const rand = (r: VfxRange) => r[0] + Math.random() * (r[1] - r[0])
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

class EmitterRun {
  n = 0
  readonly points: T3.Points
  private readonly geom: T3.BufferGeometry
  private readonly mat: T3.ShaderMaterial
  private readonly pos = new Float32Array(MAX_PARTICLES * 3)
  private readonly col = new Float32Array(MAX_PARTICLES * 3)
  private readonly alp = new Float32Array(MAX_PARTICLES)
  private readonly siz = new Float32Array(MAX_PARTICLES)
  private readonly rot = new Float32Array(MAX_PARTICLES)
  private readonly vel = new Float32Array(MAX_PARTICLES * 3)
  private readonly start = new Float32Array(MAX_PARTICLES * 3)
  private readonly age = new Float32Array(MAX_PARTICLES)
  private readonly life = new Float32Array(MAX_PARTICLES)
  private readonly spin = new Float32Array(MAX_PARTICLES)
  private readonly seed = new Float32Array(MAX_PARTICLES)
  private readonly trailAcc = new Float32Array(MAX_PARTICLES)
  private readonly startColors: VfxVec3[]
  private readonly endColor: VfxVec3 | null
  private readonly dir: T3.Vector3
  private readonly u: T3.Vector3
  private readonly v: T3.Vector3
  onDeath: EmitterRun | null = null
  trail: EmitterRun | null = null
  rateAcc = 0
  started = false
  readonly def: VfxEmitter

  constructor(THREE: typeof T3, def: VfxEmitter) {
    this.def = def
    this.geom = new THREE.BufferGeometry()
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geom.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage))
    this.geom.setAttribute('aAlpha', new THREE.BufferAttribute(this.alp, 1).setUsage(THREE.DynamicDrawUsage))
    this.geom.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage))
    this.geom.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage))
    this.geom.setDrawRange(0, 0)
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uK: { value: 1 }, uSprite: { value: SPRITE_INDEX[def.sprite] ?? 0 } },
      transparent: true,
      depthWrite: false,
      blending: def.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(this.geom, this.mat)
    this.points.frustumCulled = false
    this.startColors = (def.colors.length ? def.colors : ['#ffffff']).map(hexRgb)
    this.endColor = def.endColor ? hexRgb(def.endColor) : null
    this.dir = new THREE.Vector3(...def.direction)
    if (this.dir.lengthSq() < 1e-6) this.dir.set(0, 1, 0)
    this.dir.normalize()
    const helper = Math.abs(this.dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    this.u = new THREE.Vector3().crossVectors(this.dir, helper).normalize()
    this.v = new THREE.Vector3().crossVectors(this.dir, this.u)
  }

  setPointScale(k: number) { this.mat.uniforms.uK.value = k }

  spawn(count: number, x: number, y: number, z: number) {
    const d = this.def
    const cosMax = Math.cos((Math.min(180, Math.max(0, d.spread)) * Math.PI) / 180)
    for (let k = 0; k < count && this.n < MAX_PARTICLES; k++) {
      const i = this.n++
      let ox = d.offset[0], oy = d.offset[1], oz = d.offset[2]
      if (d.shape === 'sphere' && d.radius > 0) {
        const r = d.radius * Math.cbrt(Math.random())
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
        ox += r * Math.sin(ph) * Math.cos(th); oy += r * Math.cos(ph); oz += r * Math.sin(ph) * Math.sin(th)
      } else if (d.shape === 'ring' && d.radius > 0) {
        const th = Math.random() * Math.PI * 2
        ox += d.radius * Math.cos(th); oz += d.radius * Math.sin(th)
      }
      this.pos[i * 3] = x + ox; this.pos[i * 3 + 1] = y + oy; this.pos[i * 3 + 2] = z + oz

      const ct = lerp(cosMax, 1, Math.random())
      const st = Math.sqrt(Math.max(0, 1 - ct * ct))
      const phi = Math.random() * Math.PI * 2
      const a = st * Math.cos(phi), b = st * Math.sin(phi)
      const sp = rand(d.speed)
      this.vel[i * 3] = (this.dir.x * ct + this.u.x * a + this.v.x * b) * sp
      this.vel[i * 3 + 1] = (this.dir.y * ct + this.u.y * a + this.v.y * b) * sp
      this.vel[i * 3 + 2] = (this.dir.z * ct + this.u.z * a + this.v.z * b) * sp

      const c = this.startColors[Math.floor(Math.random() * this.startColors.length)]
      this.start[i * 3] = c[0]; this.start[i * 3 + 1] = c[1]; this.start[i * 3 + 2] = c[2]
      this.age[i] = 0
      this.life[i] = Math.max(0.05, rand(d.life))
      this.rot[i] = Math.random() * Math.PI * 2
      this.spin[i] = ((Math.random() * 2 - 1) * d.spin * Math.PI) / 180
      this.seed[i] = Math.random() * Math.PI * 2
      this.trailAcc[i] = Math.random()
    }
  }

  private kill(i: number) {
    const j = --this.n
    if (i === j) return
    for (const [arr, w] of [[this.pos, 3], [this.vel, 3], [this.start, 3]] as const) {
      for (let c = 0; c < w; c++) arr[i * w + c] = arr[j * w + c]
    }
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.rot[i] = this.rot[j]
    this.spin[i] = this.spin[j]; this.seed[i] = this.seed[j]; this.trailAcc[i] = this.trailAcc[j]
  }

  step(dt: number) {
    const d = this.def
    const damp = Math.exp(-d.drag * dt)
    const trailRate = this.trail ? d.trailRate ?? 0 : 0
    for (let i = this.n - 1; i >= 0; i--) {
      this.age[i] += dt
      const px = this.pos[i * 3], py = this.pos[i * 3 + 1], pz = this.pos[i * 3 + 2]
      if (this.age[i] >= this.life[i]) {
        this.onDeath?.spawn(this.onDeath.def.burst, px, py, pz)
        this.kill(i)
        continue
      }
      this.vel[i * 3 + 1] -= d.gravity * dt
      this.vel[i * 3] *= damp; this.vel[i * 3 + 1] *= damp; this.vel[i * 3 + 2] *= damp
      this.pos[i * 3] = px + this.vel[i * 3] * dt
      this.pos[i * 3 + 1] = py + this.vel[i * 3 + 1] * dt
      this.pos[i * 3 + 2] = pz + this.vel[i * 3 + 2] * dt
      this.rot[i] += this.spin[i] * dt
      if (trailRate > 0) {
        this.trailAcc[i] += trailRate * dt
        while (this.trailAcc[i] >= 1) { this.trailAcc[i] -= 1; this.trail!.spawn(1, px, py, pz) }
      }
    }
  }

  writeBuffers() {
    const d = this.def
    for (let i = 0; i < this.n; i++) {
      const t = this.age[i] / this.life[i]
      this.siz[i] = lerp(d.size[0], d.size[1], t)
      let a = lerp(d.alpha[0], d.alpha[1], t) * Math.min(1, t / 0.06)
      if (d.twinkle > 0) a *= 1 - d.twinkle * (0.5 + 0.5 * Math.sin(this.age[i] * 22 + this.seed[i] * 7))
      this.alp[i] = a
      const end = this.endColor
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = end ? lerp(this.start[i * 3 + c], end[c], t) : this.start[i * 3 + c]
    }
    this.geom.setDrawRange(0, this.n)
    for (const name of ['position', 'aColor', 'aAlpha', 'aSize', 'aRot']) {
      const attr = this.geom.getAttribute(name) as T3.BufferAttribute
      attr.clearUpdateRanges()
      attr.addUpdateRange(0, this.n * attr.itemSize)
      attr.needsUpdate = true
    }
  }

  dispose() { this.geom.dispose(); this.mat.dispose() }
}

export interface VfxInstance {
  readonly scene: T3.Scene
  /** Advances the simulation. Returns false once a one-shot effect has finished. */
  update(dt: number): boolean
  /** Point size factor: pixels per unit times clip w at the effect origin. */
  setPointScale(k: number): void
  particleCount(): number
  dispose(): void
}

export function createVfxInstance(THREE: typeof T3, effect: VfxEffect): VfxInstance {
  const scene = new THREE.Scene()
  const runs = effect.emitters.map((e) => new EmitterRun(THREE, e))
  const byName = new Map(runs.map((r) => [r.def.name, r]))
  const children = new Set<EmitterRun>()
  for (const r of runs) {
    r.onDeath = (r.def.onDeath && byName.get(r.def.onDeath)) || null
    r.trail = (r.def.trail && byName.get(r.def.trail)) || null
    if (r.onDeath && r.onDeath !== r) children.add(r.onDeath)
    if (r.trail && r.trail !== r) children.add(r.trail)
    scene.add(r.points)
  }
  const roots = runs.filter((r) => !children.has(r))
  const cycle = Math.max(0, ...roots.map((r) => r.def.delay + r.def.duration))
  const continuous = roots.some((r) => r.def.duration > 0 && r.def.rate > 0)
  let t = 0

  const alive = () => runs.some((r) => r.n > 0)

  return {
    scene,
    update(dt) {
      t += dt
      for (const r of roots) {
        const d = r.def
        if (t < d.delay) continue
        if (!r.started) { r.started = true; r.spawn(d.burst, 0, 0, 0) }
        if (d.rate > 0 && t <= d.delay + d.duration) {
          r.rateAcc += d.rate * dt
          const k = Math.floor(r.rateAcc)
          r.rateAcc -= k
          r.spawn(k, 0, 0, 0)
        }
      }
      for (const r of runs) r.step(dt)
      for (const r of runs) r.writeBuffers()
      if (t >= cycle && (effect.loop ? continuous || !alive() : false)) {
        t = 0
        for (const r of roots) { r.started = false; r.rateAcc = 0 }
      }
      return effect.loop || t < cycle || alive()
    },
    setPointScale(k) { for (const r of runs) r.setPointScale(k) },
    particleCount() { return runs.reduce((s, r) => s + r.n, 0) },
    dispose() { for (const r of runs) r.dispose() },
  }
}
