import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'

// Renders little animated characters that wander around a point on the map, à la
// Pikmin Bloom. MapLibre has no native glTF support, so this is a Three.js custom
// layer that shares the map's WebGL context and camera. Three is dynamically
// imported so it stays out of the main bundle until the map actually mounts.
//
// Each character autonomously wanders: idle → pick a nearby point → play the walk
// clip while turning to face it → idle on arrival. Models load from `modelUrl`
// (a Quaternius .glb with Idle/Walk clips); if that's missing we fall back to a
// procedural capsule so the pipeline is visible without an asset.

// One on-map character: an id (the creature it represents) and a body colour.
export interface CharacterSpec {
  id: string
  color: number
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

  function buildProcedural(color: number): T3.Object3D {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color }),
    )
    body.position.y = 0.8
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe0bd }),
    )
    head.position.y = 1.55
    group.add(body, head)
    return group
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
      root = buildProcedural(spec.color)
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

  // Rebuild the whole roster — squads change rarely, so a full reset is fine.
  function rebuildCharacters(specs: CharacterSpec[]) {
    for (const c of characters) {
      c.mixer?.stopAllAction()
      worldGroup.remove(c.root)
      if (c.procedural) disposeObject(c.root)
    }
    characters.length = 0
    specs.forEach(spawn)
  }

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

  // Load the model (falling back to procedural on any failure), then spawn.
  let template: { scene: T3.Object3D; animations: T3.AnimationClip[] } | null = null
  if (opts.modelUrl) {
    try {
      const gltf = await new GLTFLoader().loadAsync(opts.modelUrl)
      template = { scene: gltf.scene, animations: gltf.animations }
    } catch {
      template = null
    }
  }
  const initialSpecs = opts.characters
    ?? DEFAULT_PALETTE.map((color, i) => ({ id: `gen-${i}`, color }))
  rebuildCharacters(initialSpecs)

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
      // loop alive while any exist — but let the map go idle when the roster is
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
      rebuildCharacters(specs)
    },
  }
}
