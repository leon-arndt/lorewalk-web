import type * as T3 from 'three'
import type { PlayerAppearance } from '@/types'
import { avatarBodyById, skinToneById, hairColorById, eyeColorById, cosmeticItemById } from '@/data/cosmetics'

// The player's 3D avatar, shared by the map layer and the customization preview.
// Loads the rigged CC0 Quaternius cube body for `appearance.bodyId` (see
// public/models/README.md), tints its Skin/Hair/Eyes/Top/Bottom materials, and
// builds blocky add-ons for items whose shape differs (hood, trousers, skirt,
// shoes, hats). Add-ons are sized from the model's own rest pose and attached to
// its bones, so they fit both bodies and follow the animation.
// Falls back to a procedural humanoid when the model cannot load (for example
// offline on first launch: the service worker does not precache .glb files).

type THREE = typeof import('three')
export type AvatarClip = 'Idle' | 'Walk'

// Body units, matching the procedural avatar that the map's modelScale was tuned for.
export const AVATAR_HEIGHT = 1.4

export interface PlayerAvatar {
  // Outer group: feet at y = 0, faces +z. Callers may set its scale and rotation.
  root: T3.Group
  play: (clip: AvatarClip) => void
  wave: () => void
  update: (dt: number) => void
  dispose: () => void
}

type Template = { scene: T3.Object3D; animations: T3.AnimationClip[] }
const templates = new Map<string, Promise<Template>>()

function loadTemplate(url: string): Promise<Template> {
  if (!templates.has(url)) {
    const p = (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(url)
      return { scene: gltf.scene, animations: gltf.animations }
    })()
    // Let a later call retry instead of caching the failure forever.
    p.catch(() => templates.delete(url))
    templates.set(url, p)
  }
  return templates.get(url)!
}

export async function createPlayerAvatar(appearance: PlayerAppearance): Promise<PlayerAvatar> {
  const THREE = await import('three')
  try {
    return await createRigged(THREE, appearance)
  } catch {
    return createProcedural(THREE, appearance)
  }
}

function itemColor(id: string, fallback: number): number {
  return cosmeticItemById(id)?.color ?? fallback
}

async function createRigged(THREE: THREE, appearance: PlayerAppearance): Promise<PlayerAvatar> {
  const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')
  const template = await loadTemplate(avatarBodyById(appearance.bodyId).modelUrl)
  const model = skeletonClone(template.scene)
  model.updateMatrixWorld(true)

  const owned: { dispose: () => void }[] = []
  const tints: Record<string, number> = {
    Skin: skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69,
    Hair: hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a,
    Eyes: eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621,
    Top: itemColor(appearance.topId, 0x6366f1),
    Bottom: itemColor(appearance.bottomId, 0x334155),
  }
  model.traverse((o) => {
    const mesh = o as T3.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as T3.MeshStandardMaterial
    const tint = tints[mat.name]
    if (tint === undefined) return
    const clone = mat.clone()
    clone.color.setHex(tint)
    mesh.material = clone
    owned.push(clone)
  })

  addItemShapes(THREE, model, appearance, owned)

  const box = new THREE.Box3().setFromObject(model)
  const height = box.max.y - box.min.y || 1
  const fit = AVATAR_HEIGHT / height
  model.scale.setScalar(fit)
  model.position.y = -box.min.y * fit
  const root = new THREE.Group()
  root.add(model)

  const mixer = new THREE.AnimationMixer(model)
  const action = (name: string) => {
    const clip = template.animations.find((c) => c.name === name)
    return clip ? mixer.clipAction(clip) : null
  }
  const actions = { Idle: action('Idle'), Walk: action('Walk') }
  const waveAction = action('Wave')
  waveAction?.setLoop(THREE.LoopOnce, 1)
  let base: AvatarClip = 'Idle'
  let current = actions.Idle
  current?.play()

  function fadeTo(next: T3.AnimationAction | null) {
    if (!next || next === current) return
    next.reset().play()
    if (current) current.crossFadeTo(next, 0.25, false)
    current = next
  }
  mixer.addEventListener('finished', (e) => {
    if (e.action === waveAction) fadeTo(actions[base])
  })

  return {
    root,
    play(clip) {
      base = clip
      if (current !== waveAction) fadeTo(actions[clip])
    },
    wave() {
      if (waveAction && current !== waveAction) fadeTo(waveAction)
    },
    update(dt) { mixer.update(dt) },
    dispose() {
      mixer.stopAllAction()
      root.removeFromParent()
      owned.forEach((o) => o.dispose())
    },
  }
}

// --- Item shapes -------------------------------------------------------------

// Rest-pose boxes of the model's own geometry, in model space. Everything below
// is sized from these, so no number is tied to one body.
function measure(THREE: THREE, model: T3.Object3D) {
  const bone = (name: string) => model.getObjectByName(name)
  const boneY = (name: string) => bone(name)?.getWorldPosition(new THREE.Vector3()).y ?? 0
  const whole = new THREE.Box3().setFromObject(model)
  const H = whole.max.y - whole.min.y
  const floor = whole.min.y

  const verts: { mat: string; v: T3.Vector3 }[] = []
  model.traverse((o) => {
    const mesh = o as T3.SkinnedMesh
    if (!mesh.isSkinnedMesh || !mesh.geometry.index) return
    const mat = (mesh.material as T3.Material).name
    const index = mesh.geometry.index.array
    const seen = new Set<number>()
    for (let k = 0; k < index.length; k++) {
      const i = index[k]
      if (seen.has(i)) continue
      seen.add(i)
      const v = new THREE.Vector3()
      mesh.getVertexPosition(i, v)
      verts.push({ mat, v: v.applyMatrix4(mesh.matrixWorld) })
    }
  })
  const boxOf = (keep: (p: { mat: string; v: T3.Vector3 }) => boolean) => {
    const b = new THREE.Box3()
    for (const p of verts) if (keep(p)) b.expandByPoint(p.v)
    return b
  }

  const headY = boneY('Head')
  const bottom = boxOf((p) => p.mat === 'Bottom')
  const footTop = floor + H * 0.07
  const side = (name: string) => Math.sign(bone(name)?.getWorldPosition(new THREE.Vector3()).x ?? 0)
  const foot = (name: string) => boxOf((p) => p.mat === 'Skin' && p.v.y < footTop && Math.sign(p.v.x) === side(name))
  const shin = (name: string) => boxOf((p) => p.mat === 'Skin' && p.v.y >= footTop && p.v.y < bottom.min.y && Math.sign(p.v.x) === side(name))

  return {
    H,
    head: boxOf((p) => (p.mat === 'Skin' || p.mat === 'Hair') && p.v.y >= headY),
    neckY: boneY('Neck'),
    top: boxOf((p) => p.mat === 'Top' && Math.abs(p.v.x) < H * 0.2),
    bottom,
    foot: { FootL: foot('FootL'), FootR: foot('FootR') },
    shin: { LowerLegL: shin('LowerLegL'), LowerLegR: shin('LowerLegR') },
  }
}

function addItemShapes(THREE: THREE, model: T3.Object3D, appearance: PlayerAppearance, owned: { dispose: () => void }[]) {
  const m = measure(THREE, model)
  const u = m.H

  function block(bone: string, w: number, h: number, d: number, x: number, y: number, z: number, color: number) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 })
    owned.push(geo, mat)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    // attach() keeps the world transform, so shapes built in model space land on the bone.
    ;(model.getObjectByName(bone) ?? model).attach(mesh)
  }
  const shade = (color: number, k: number) => new THREE.Color(color).multiplyScalar(k).getHex()
  const size = (b: T3.Box3) => b.getSize(new THREE.Vector3())
  const mid = (b: T3.Box3) => b.getCenter(new THREE.Vector3())

  // Head items sit on the head box: its top is the top of the hair.
  const hb = m.head, hs = size(hb), hc = mid(hb)
  const headColor = itemColor(appearance.headItemId, 0xef4444)
  if (appearance.headItemId === 'cap') {
    block('Head', hs.x * 1.06, u * 0.1, hs.z * 1.06, hc.x, hb.max.y - u * 0.03, hc.z, headColor)
    block('Head', hs.x * 0.8, u * 0.02, hs.z * 0.45, hc.x, hb.max.y - u * 0.075, hb.max.z + hs.z * 0.18, headColor)
  } else if (appearance.headItemId === 'beanie') {
    block('Head', hs.x * 1.08, u * 0.14, hs.z * 1.08, hc.x, hb.max.y - u * 0.045, hc.z, headColor)
    block('Head', u * 0.06, u * 0.05, u * 0.06, hc.x, hb.max.y + u * 0.045, hc.z, shade(headColor, 0.85))
  } else if (appearance.headItemId === 'sunhat') {
    block('Head', hs.x * 1.04, u * 0.1, hs.z * 1.04, hc.x, hb.max.y - u * 0.02, hc.z, headColor)
    block('Head', hs.x * 1.4, u * 0.018, hs.z * 1.45, hc.x, hb.max.y - u * 0.07, hc.z, headColor)
    block('Head', hs.x * 1.06, u * 0.025, hs.z * 1.06, hc.x, hb.max.y - u * 0.055, hc.z, shade(headColor, 0.7))
  }

  // Tops: the model's Top material already carries the colour. Shapes add detail.
  const tb = m.top, ts = size(tb)
  const topColor = itemColor(appearance.topId, 0x6366f1)
  if (appearance.topId === 'hoodie') {
    // Against the back of the torso, not the head box: long hair makes that reach far back.
    block('Torso', ts.x * 0.7, u * 0.09, u * 0.07, 0, m.neckY - u * 0.01, tb.min.z - u * 0.02, topColor)
    block('Torso', ts.x * 0.55, u * 0.05, u * 0.012, 0, tb.min.y + ts.y * 0.3, tb.max.z + u * 0.004, shade(topColor, 0.8))
  } else if (appearance.topId === 'jacket') {
    block('Torso', u * 0.07, ts.y * 0.85, u * 0.012, 0, tb.min.y + ts.y * 0.5, tb.max.z + u * 0.004, 0xf8fafc)
  }

  // Bottoms: the model wears shorts, so trousers add covers over the bare shins.
  const bb = m.bottom, bs = size(bb), bc = mid(bb)
  const bottomColor = itemColor(appearance.bottomId, 0x334155)
  if (appearance.bottomId === 'jeans' || appearance.bottomId === 'cargo') {
    for (const [bone, b] of Object.entries(m.shin)) {
      if (b.isEmpty()) continue
      const s = size(b), c = mid(b)
      block(bone, s.x * 1.14, s.y + u * 0.02, s.z * 1.14, c.x, c.y + u * 0.01, c.z, bottomColor)
    }
    if (appearance.bottomId === 'cargo') {
      for (const sx of [-1, 1]) {
        block(sx > 0 ? 'UpperLegL' : 'UpperLegR', u * 0.02, bs.y * 0.4, bs.z * 0.45, sx * (bs.x / 2 + u * 0.005), bc.y - bs.y * 0.1, bc.z, shade(bottomColor, 0.8))
      }
    }
  } else if (appearance.bottomId === 'skirt') {
    block('Hips', bs.x * 1.25, bs.y * 0.9, bs.z * 1.35, bc.x, bb.max.y - bs.y * 0.45, bc.z, bottomColor)
  }

  // Shoes: the model is barefoot, so every pair is a shape.
  const shoeColor = itemColor(appearance.shoesId, 0xf8fafc)
  for (const [bone, b] of Object.entries(m.foot)) {
    if (b.isEmpty()) continue
    const s = size(b), c = mid(b)
    const sole = (k: number) => block(bone, s.x * 1.12, u * 0.02, s.z * 1.16, c.x, b.min.y + u * 0.01, c.z + s.z * 0.03, k)
    if (appearance.shoesId === 'sneakers' || appearance.shoesId === 'boots') {
      block(bone, s.x * 1.12, s.y * 1.1, s.z * 1.12, c.x, b.min.y + s.y * 0.55, c.z, shoeColor)
      sole(shade(shoeColor, 0.75))
      if (appearance.shoesId === 'boots') {
        const shinBone = bone === 'FootL' ? 'LowerLegL' : 'LowerLegR'
        const sb = m.shin[shinBone]
        if (!sb.isEmpty()) {
          const ss = size(sb), sc = mid(sb)
          block(shinBone, ss.x * 1.2, ss.y * 0.55, ss.z * 1.2, sc.x, sb.min.y + ss.y * 0.27, sc.z, shoeColor)
        }
      }
    } else {
      sole(shoeColor)
      const strap = appearance.shoesId === 'sandals' ? s.x * 1.14 : s.x * 0.35
      block(bone, strap, u * 0.02, s.z * 0.28, c.x, b.min.y + s.y * 0.6, c.z + s.z * 0.15, shade(shoeColor, 0.85))
    }
  }
}

// --- Procedural fallback -----------------------------------------------------

function pm(THREE: THREE, color: number): T3.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color, shininess: 45 })
}

function createProcedural(THREE: THREE, appearance: PlayerAppearance): PlayerAvatar {
  const g = new THREE.Group()

  const skin = skinToneById(appearance.skinToneId)?.color ?? 0xe0ac69
  const hair = hairColorById(appearance.hairColorId)?.color ?? 0x0a0a0a
  const eye = eyeColorById(appearance.eyeColorId)?.color ?? 0x4b3621
  const top = itemColor(appearance.topId, 0x6366f1)
  const bottom = itemColor(appearance.bottomId, 0x334155)
  const shoes = itemColor(appearance.shoesId, 0xf8fafc)

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2), pm(THREE, bottom))
  legs.position.y = 0.25
  const feet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.26), pm(THREE, shoes))
  feet.position.y = 0.06
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 8), pm(THREE, top))
  torso.position.y = 0.72
  const skinMat = pm(THREE, skin)
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.36, 4, 6), skinMat)
  armL.position.set(-0.28, 0.68, 0)
  const armR = armL.clone()
  armR.position.set(0.28, 0.68, 0)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skinMat)
  head.position.y = 1.12
  const eyeMat = pm(THREE, eye)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat)
  eyeL.position.set(-0.08, 1.14, 0.18)
  const eyeR = eyeL.clone()
  eyeR.position.set(0.08, 1.14, 0.18)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    pm(THREE, hair),
  )
  hairCap.position.y = 1.2
  g.add(legs, feet, torso, armL, armR, head, eyeL, eyeR, hairCap)

  const root = new THREE.Group()
  root.add(g)
  let bobPhase = Math.random() * Math.PI * 2
  return {
    root,
    play() {},
    wave() {},
    update(dt) {
      bobPhase += dt * 2
      g.position.y = Math.abs(Math.sin(bobPhase)) * 0.04
    },
    dispose() {
      root.removeFromParent()
      g.traverse((o) => {
        const mesh = o as T3.Mesh
        mesh.geometry?.dispose()
        ;(mesh.material as T3.Material | undefined)?.dispose()
      })
    },
  }
}
