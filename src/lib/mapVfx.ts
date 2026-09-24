import maplibregl from 'maplibre-gl'
import type * as T3 from 'three'
import { isMapPaused } from '@/lib/mapUtils'
import { createVfxInstance, loadVfxBank, type VfxEffect, type VfxInstance } from '@/lib/vfx'

const LAYER_ID = 'lorewalk-vfx'
// Same constant-screen-size rule as the companions in mapCharacters.ts, so an
// effect keeps its size next to them at every zoom.
const SIZE_REF_ZOOM = 20
const SIZE_COMP_MAX = 1024

export interface VfxLayerHandle {
  readonly map: maplibregl.Map
  play(effect: VfxEffect, lngLat: [number, number]): number
  stop(id: number): void
  clear(): void
  particleCount(): number
  remove(): void
}

// The game map's layer, so gameplay code can play an effect without a map handle.
let activeLayer: VfxLayerHandle | null = null

/** Plays a bank effect by id, such as `fx/fireworks`. Does nothing if the map or the effect is missing. */
export async function playMapVfx(id: string, lngLat: [number, number]) {
  const effect = (await loadVfxBank()).effects[id]
  if (effect && activeLayer) activeLayer.play(effect, lngLat)
}

export async function addVfxLayer(map: maplibregl.Map): Promise<VfxLayerHandle> {
  const THREE = await import('three')
  const camera = new THREE.Camera()
  const instances = new Map<number, { inst: VfxInstance; lngLat: [number, number] }>()
  let nextId = 1
  let renderer: T3.WebGLRenderer | null = null
  let lastMs = 0
  const o = new THREE.Vector4(), ux = new THREE.Vector4(), uy = new THREE.Vector4()

  const layer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },
    render(gl, options) {
      if (!renderer || instances.size === 0) { lastMs = 0; return }
      const nowMs = performance.now()
      const dt = lastMs ? Math.min((nowMs - lastMs) / 1000, 0.1) : 0
      lastMs = nowMs

      const zoomScale = Math.min(SIZE_COMP_MAX, Math.pow(2, SIZE_REF_ZOOM - map.getZoom()))
      const main = new THREE.Matrix4().fromArray(Array.from(options.defaultProjectionData.mainMatrix))
      const halfW = gl.drawingBufferWidth / 2, halfH = gl.drawingBufferHeight / 2
      renderer.resetState()

      for (const [id, entry] of instances) {
        if (!entry.inst.update(dt)) {
          entry.inst.dispose()
          instances.delete(id)
          continue
        }
        // Each effect gets its own projection, built in float64 here, so the
        // particles stay near the origin and keep float32 precision on the GPU.
        const origin = maplibregl.MercatorCoordinate.fromLngLat(entry.lngLat, 0)
        const s = origin.meterInMercatorCoordinateUnits() * zoomScale
        const world = new THREE.Matrix4()
          .makeTranslation(origin.x, origin.y, origin.z)
          .scale(new THREE.Vector3(s, -s, s))
          .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
        camera.projectionMatrix = main.clone().multiply(world)

        o.set(0, 0, 0, 1).applyMatrix4(camera.projectionMatrix)
        ux.set(1, 0, 0, 1).applyMatrix4(camera.projectionMatrix)
        uy.set(0, 1, 0, 1).applyMatrix4(camera.projectionMatrix)
        if (o.w > 0) {
          const px = (v: T3.Vector4) => Math.hypot((v.x / v.w - o.x / o.w) * halfW, (v.y / v.w - o.y / o.w) * halfH)
          entry.inst.setPointScale(Math.max(px(ux), px(uy)) * o.w)
        }
        renderer.render(entry.inst.scene, camera)
      }
      if (instances.size > 0 && !isMapPaused()) map.triggerRepaint()
    },
    onRemove() {
      renderer?.dispose()
      renderer = null
    },
  }

  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
  map.addLayer(layer)

  const handle: VfxLayerHandle = {
    map,
    play(effect, lngLat) {
      const id = nextId++
      instances.set(id, { inst: createVfxInstance(THREE, effect), lngLat })
      map.triggerRepaint()
      return id
    },
    stop(id) {
      instances.get(id)?.inst.dispose()
      instances.delete(id)
      map.triggerRepaint()
    },
    clear() {
      instances.forEach((e) => e.inst.dispose())
      instances.clear()
      map.triggerRepaint()
    },
    particleCount() {
      let n = 0
      instances.forEach((e) => { n += e.inst.particleCount() })
      return n
    },
    remove() {
      handle.clear()
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      } catch { /* map already removed */ }
      if (activeLayer === handle) activeLayer = null
    },
  }
  activeLayer = handle
  return handle
}
