import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'

// Renders little animated characters that wander around a point on the map, à la
// Pikmin Bloom. MapLibre has no native glTF support, so this is a Three.js custom
// layer that shares the map's WebGL context and camera. Three is dynamically
// imported so it stays out of the main bundle until the map actually mounts.
//
// Each character autonomously wanders: idle → pick a nearby point → play the walk
// clip while turning to face it → idle on arrival. Models load from `modelUrl`
// (a Quaternius .glb with Idle/Walk clips); if that's missing we fall back to
// category-specific procedural creatures so the pipeline is always visible.

// One on-map character: creature id, body colour, and POI category (drives shape).
export interface CharacterSpec {
  id: string
  color: number
  category?: string
}

export interface CharacterLayerHandle {
  remove: () => void
  setCenter: (lng: number, lat: number) => void
  setCharacters: (specs: CharacterSpec[]) => void
}

export interface CharacterLayerOptions {
  center: [number, number]
  characters?: CharacterSpec[]
  modelUrl?: string
  wanderRadiusM?: number
  modelScale?: number
}

const DEFAULT_PALETTE = [0x6366f1, 0xf59e0b, 0xa855f7, 0x22c55e]

// Keep characters a roughly constant on-screen size (Pikmin-Bloom style) instead
// of true-to-life metres, which would be sub-pixel at city zoom. They hold their
// apparent size all the way out to the whole-island view (cap allows constant
// size down to ~zoom 10). Higher SIZE_REF_ZOOM → larger constant on-screen size.
const SIZE_REF_ZOOM = 20
const SIZE_COMP_MAX = 1024

const LAYER_ID = 'lorewalk-characters'

export async function addCharacterLayer(
  map: maplibregl.Map,
  opts: CharacterLayerOptions,
): Promise<CharacterLayerHandle> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { clone: skeletonClone } = await import('three/examples/jsm/utils/SkeletonUtils.js')

  const wanderRadius = opts.wanderRadiusM ?? 25
  const modelScale = opts.modelScale ?? 1
  const center = { lng: opts.center[0], lat: opts.center[1] }

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(0.6, 1, 0.4)
  scene.add(sun)

  // Children live in metres relative to `center`; the world matrix in render()
  // scales metres → mercator units, so we never touch lng/lat per character.
  const worldGroup = new THREE.Group()
  scene.add(worldGroup)

  type AnimationAction = ReturnType<T3.AnimationMixer['clipAction']>

  interface Character {
    root: T3.Object3D
    mixer: T3.AnimationMixer | null
    idle: AnimationAction | null
    walk: AnimationAction | null
    state: 'idle' | 'walk'
    x: number; z: number
    tx: number; tz: number
    speed: number
    idleUntil: number
    bobPhase: number
    procedural: boolean
  }
  const characters: Character[] = []

  function randomPoint() {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * wanderRadius
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
  }

  // Shared material factory
  function pm(color: number, opts: { shininess?: number; transparent?: boolean; opacity?: number; emissive?: number; emissiveIntensity?: number; side?: T3.Side } = {}): T3.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color,
      shininess: opts.shininess ?? 55,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      side: opts.side ?? THREE.FrontSide,
    })
  }

  // Nature - Leafling: slim stem body, big round head, single leaf on top (Pikmin-inspired)
  function buildNature(color: number): T3.Object3D {
    const g = new THREE.Group()
    const m = pm(color)
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.52, 4, 8), m)
    stem.position.y = 0.44
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), m)
    head.position.y = 1.0
    const leafM = pm(0x4ade80)
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 6), leafM)
    leaf.position.set(0.07, 1.44, 0)
    leaf.rotation.z = -0.55
    g.add(stem, head, leaf)
    return g
  }

  // Heritage - Stonekin: dome shell body, small peeking head with a crest
  function buildHeritage(color: number): T3.Object3D {
    const g = new THREE.Group()
    const m = pm(color)
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
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), pm(0xfef9c3))
    crest.position.set(0.2, 0.73, 0)
    g.add(shell, cap, head, crest)
    return g
  }

  // Arts - Drifter: jellyfish bell with translucent tendrils, floats upward
  function buildArts(color: number): T3.Object3D {
    const g = new THREE.Group()
    const bellM = pm(color, { transparent: true, opacity: 0.82, shininess: 90 })
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      bellM,
    )
    bell.rotation.x = Math.PI
    bell.position.y = 0.85
    const tendrilM = pm(color, { transparent: true, opacity: 0.65 })
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2
      const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.36, 4, 6), tendrilM)
      t.position.set(Math.cos(ang) * 0.2, 0.38, Math.sin(ang) * 0.2)
      t.rotation.z = Math.sin(ang) * 0.28
      g.add(t)
    }
    g.add(bell)
    return g
  }

  // Religious - Glowick: glowing lantern orb with a small flame tip
  function buildReligious(color: number): T3.Object3D {
    const g = new THREE.Group()
    const orbM = pm(color, { shininess: 110, transparent: true, opacity: 0.88, emissive: color, emissiveIntensity: 0.28 })
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), orbM)
    orb.position.y = 0.68
    const flameM = pm(0xfde68a, { emissive: 0xfde68a, emissiveIntensity: 0.55 })
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8), flameM)
    flame.position.y = 1.12
    const pupilM = pm(0x1e293b)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pupilM)
    eyeL.position.set(-0.12, 0.72, 0.3)
    const eyeR = eyeL.clone()
    eyeR.position.set(0.12, 0.72, 0.3)
    g.add(orb, flame, eyeL, eyeR)
    return g
  }

  // Museum - Hooter: egg body, large torus eye-rings, ear tufts (owl)
  function buildMuseum(color: number): T3.Object3D {
    const g = new THREE.Group()
    const m = pm(color)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), m)
    body.scale.y = 1.4
    body.position.y = 0.6
    const whiteM = pm(0xffffff)
    const eyeL = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.036, 8, 18), whiteM)
    eyeL.position.set(-0.13, 0.92, 0.28)
    const eyeR = eyeL.clone()
    eyeR.position.set(0.13, 0.92, 0.28)
    const pupilM = pm(0x1e293b)
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

  // Landmark - Warden: stocky body, square-ish head, two horns, glowing eyes
  function buildLandmark(color: number): T3.Object3D {
    const g = new THREE.Group()
    const m = pm(color)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 4, 10), m)
    body.position.y = 0.56
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), m)
    head.position.y = 1.08
    const hornM = pm(0xf1f5f9)
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 6), hornM)
    hornL.position.set(-0.15, 1.38, 0)
    const hornR = hornL.clone()
    hornR.position.set(0.15, 1.38, 0)
    const eyeM = pm(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.5 })
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM)
    eyeL.position.set(-0.13, 1.08, 0.2)
    const eyeR = eyeL.clone()
    eyeR.position.set(0.13, 1.08, 0.2)
    g.add(body, head, hornL, hornR, eyeL, eyeR)
    return g
  }

  // Default - friendly blob: round body, simple dot eyes
  function buildDefault(color: number): T3.Object3D {
    const g = new THREE.Group()
    const m = pm(color)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m)
    body.scale.y = 1.22
    body.position.y = 0.56
    const eyeM = pm(0xffffff)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM)
    eyeL.position.set(-0.12, 0.64, 0.29)
    const eyeR = eyeL.clone()
    eyeR.position.set(0.12, 0.64, 0.29)
    const pupilM = pm(0x1e293b)
    const pL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 5), pupilM)
    pL.position.set(-0.12, 0.64, 0.325)
    const pR = pL.clone()
    pR.position.set(0.12, 0.64, 0.325)
    g.add(body, eyeL, eyeR, pL, pR)
    return g
  }

  function buildCreature(category: string | undefined, color: number): T3.Object3D {
    switch (category) {
      case 'nature':   return buildNature(color)
      case 'heritage': return buildHeritage(color)
      case 'arts':     return buildArts(color)
      case 'religious':return buildReligious(color)
      case 'museum':   return buildMuseum(color)
      case 'landmark': return buildLandmark(color)
      default:         return buildDefault(color)
    }
  }

  function pickClip(clips: T3.AnimationClip[], keyword: string) {
    return clips.find((c) => c.name.toLowerCase().includes(keyword)) ?? null
  }

  function disposeObject(obj: T3.Object3D) {
    obj.traverse((o) => {
      const mesh = o as T3.Mesh
      mesh.geometry?.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    })
  }

  function spawn(spec: CharacterSpec) {
    let root: T3.Object3D
    let mixer: T3.AnimationMixer | null = null
    let idle: AnimationAction | null = null
    let walk: AnimationAction | null = null
    const procedural = !template

    if (template) {
      root = skeletonClone(template.scene)
      mixer = new THREE.AnimationMixer(root)
      const clips = template.animations
      const idleClip = pickClip(clips, 'idle') ?? clips[0] ?? null
      const walkClip = pickClip(clips, 'walk') ?? pickClip(clips, 'run') ?? idleClip
      idle = idleClip ? mixer.clipAction(idleClip) : null
      walk = walkClip ? mixer.clipAction(walkClip) : null
    } else {
      root = buildCreature(spec.category, spec.color)
    }

    root.scale.setScalar(modelScale)
    const start = randomPoint()
    root.position.set(start.x, 0, start.z)
    worldGroup.add(root)
    idle?.play()

    characters.push({
      root, mixer, idle, walk, state: 'idle',
      x: start.x, z: start.z, tx: start.x, tz: start.z,
      speed: 1.1 + Math.random() * 0.7,
      idleUntil: 0, bobPhase: Math.random() * Math.PI * 2, procedural,
    })
  }

  // Rebuild the whole roster - squads change rarely, so a full reset is fine.

  function setState(c: Character, next: 'idle' | 'walk') {
    if (c.state === next) return
    c.state = next
    const to = next === 'walk' ? c.walk : c.idle
    const from = next === 'walk' ? c.idle : c.walk
    if (to) { to.reset(); to.play() }
    if (from && to && from !== to) from.crossFadeTo(to, 0.25, false)
  }

  function tick(dt: number, nowMs: number) {
    for (const c of characters) {
      if (c.state === 'idle') {
        if (nowMs >= c.idleUntil) {
          const t = randomPoint()
          c.tx = t.x; c.tz = t.z
          setState(c, 'walk')
        }
      } else {
        const dx = c.tx - c.x
        const dz = c.tz - c.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.4) {
          setState(c, 'idle')
          c.idleUntil = nowMs + 1500 + Math.random() * 3500
        } else {
          const step = Math.min(dist, c.speed * dt)
          c.x += (dx / dist) * step
          c.z += (dz / dist) * step
          // Face the direction of travel. Flip by +Math.PI if models moonwalk.
          c.root.rotation.y = Math.atan2(dx, dz)
        }
      }

      c.root.position.x = c.x
      c.root.position.z = c.z

      if (c.procedural) {
        c.bobPhase += dt * (c.state === 'walk' ? 9 : 2)
        const amp = c.state === 'walk' ? 0.12 : 0.04
        c.root.position.y = Math.abs(Math.sin(c.bobPhase)) * amp
      }
      c.mixer?.update(dt)
    }
  }

  // Load the shared override model if given (falls back to per-category GLBs below).
  let template: { scene: T3.Object3D; animations: T3.AnimationClip[] } | null = null
  if (opts.modelUrl) {
    try {
      const gltf = await new GLTFLoader().loadAsync(opts.modelUrl)
      template = { scene: gltf.scene, animations: gltf.animations }
    } catch {
      template = null
    }
  }

  // Pre-load per-category GLBs into the model cache so spawn() can use them.
  // Falls back to procedural builders for any category whose GLB is missing.
  const categoryGlbCache = new Map<string, T3.Object3D>()
  if (!template) {
    const categories = [...new Set((opts.characters ?? []).map((s) => s.category ?? 'default'))]
    await Promise.allSettled(
      categories.map(async (cat) => {
        try {
          const gltf = await new GLTFLoader().loadAsync(`/models/creature-${cat}.glb`)
          categoryGlbCache.set(cat, gltf.scene)
        } catch { /* fall through to procedural */ }
      }),
    )
  }

  // Override spawn to use category GLBs when available.
  const originalSpawn = spawn
  function spawnWithGlb(spec: CharacterSpec) {
    if (!template && categoryGlbCache.has(spec.category ?? 'default')) {
      const glbRoot = skeletonClone(categoryGlbCache.get(spec.category ?? 'default')!)
      glbRoot.scale.setScalar(modelScale)
      const start = randomPoint()
      glbRoot.position.set(start.x, 0, start.z)
      worldGroup.add(glbRoot)
      characters.push({
        root: glbRoot, mixer: null, idle: null, walk: null, state: 'idle',
        x: start.x, z: start.z, tx: start.x, tz: start.z,
        speed: 1.1 + Math.random() * 0.7,
        idleUntil: 0, bobPhase: Math.random() * Math.PI * 2,
        procedural: true,
      })
    } else {
      originalSpawn(spec)
    }
  }

  function rebuildCharactersWithGlb(specs: CharacterSpec[]) {
    for (const c of characters) {
      c.mixer?.stopAllAction()
      worldGroup.remove(c.root)
      if (c.procedural) disposeObject(c.root)
    }
    characters.length = 0
    specs.forEach(spawnWithGlb)
  }

  const initialSpecs = opts.characters
    ?? DEFAULT_PALETTE.map((color, i) => ({ id: `gen-${i}`, color }))
  rebuildCharactersWithGlb(initialSpecs)

  let renderer: T3.WebGLRenderer | null = null
  let lastMs = 0

  const layer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },
    render(_gl, options) {
      if (!renderer) return

      const nowMs = performance.now()
      const dt = lastMs ? Math.min((nowMs - lastMs) / 1000, 0.1) : 0
      lastMs = nowMs
      if (dt) tick(dt, nowMs)

      // Constant-ish screen size: scale each character's own body (NOT the group,
      // which would scale their ground positions and make them slide when zooming).
      // Positions stay in real metres, so characters are glued to the map.
      const charScale = modelScale * Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - map.getZoom()))
      for (const c of characters) c.root.scale.setScalar(charScale)

      const origin = maplibregl.MercatorCoordinate.fromLngLat([center.lng, center.lat], 0)
      const scale = origin.meterInMercatorCoordinateUnits()
      const world = new THREE.Matrix4()
        .makeTranslation(origin.x, origin.y, origin.z)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))

      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(Array.from(options.defaultProjectionData.mainMatrix))
        .multiply(world)

      renderer.resetState()
      renderer.render(scene, camera)
      // Characters animate continuously (idle bob + idle clip), so keep the frame
      // loop alive while any exist - but let the map go idle when the roster is
      // empty instead of pinning the GPU at full FPS for nothing.
      if (characters.length > 0) map.triggerRepaint()
    },
    onRemove() {
      renderer?.dispose()
      renderer = null
    },
  }

  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
  map.addLayer(layer)

  return {
    remove() {
      // map.getLayer throws if the map was already torn down (effect-cleanup
      // ordering / StrictMode double-mount), so guard defensively.
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      } catch { /* map already removed */ }
    },
    setCenter(lng, lat) {
      center.lng = lng
      center.lat = lat
    },
    setCharacters(specs) {
      rebuildCharactersWithGlb(specs)
    },
  }
}
