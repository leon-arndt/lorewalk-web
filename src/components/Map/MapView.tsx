import { useEffect, useRef, type MutableRefObject } from 'react'
import * as maplibregl from 'maplibre-gl'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { addCharacterLayer, tripProgress, type CharacterLayerHandle, type CharacterSpec, type TripSpec } from '@/lib/mapCharacters'
import { addVfxLayer, type VfxLayerHandle } from '@/lib/mapVfx'
import { CAT_MODEL_URL } from '@/lib/catModel'
import { addPlayerAvatarLayer, type PlayerAvatarLayerHandle } from '@/lib/mapPlayerAvatar'
import { addPoiPinsLayer, type PoiPinsHandle } from '@/lib/mapPoiPins'
import { addMrtLayers } from '@/lib/mapMrt'
import { addMapAmbience } from '@/lib/mapAmbience'
import { addMapWeather } from '@/lib/mapWeather'
import { startWeatherUpdates } from '@/lib/weather'
import { setAmbienceOverride } from '@/lib/ambience'
import { haversineDistance, setMapPaused } from '@/lib/mapUtils'
import { getSpritePreviewURL } from '@/lib/creaturePreview'
import { playClickSfx } from '@/lib/sfx'
import type { Poi, PlayerAppearance, PlayerPosition } from '@/types'
import { accent, accentAlpha, ink, paperLight } from '@/lib/theme'
import { RADIUS } from '@/lib/paper'
import { SINGAPORE_BOUNDARY } from '@/data/singapore-boundary'

// Map markers are built with raw DOM (MapLibre, not React) - this mirrors EmojiSprite's
// emoji-fallback-then-3D-swap pattern for that imperative context.
function spriteEl(emoji: string, sizePx: number, key = emoji): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = `width:${sizePx}px;height:${sizePx}px;display:flex;align-items:center;justify-content:center;line-height:1;font-size:${sizePx}px;`
  // A pulsing dot while the render loads. The emoji only if there is none.
  const dot = document.createElement('span')
  dot.className = 'animate-pulse'
  dot.style.cssText = 'display:block;width:70%;height:70%;border-radius:50%;background:radial-gradient(circle,rgba(148,163,184,0.4) 0%,rgba(148,163,184,0) 70%);'
  wrap.appendChild(dot)
  getSpritePreviewURL(key).catch(() => null).then((url) => {
    if (!url) { wrap.textContent = emoji; return }
    wrap.textContent = ''
    const img = document.createElement('img')
    img.src = url
    img.width = sizePx
    img.height = sizePx
    img.style.display = 'block'
    wrap.appendChild(img)
  })
  return wrap
}

// MapLibre places a marker with a transform on the marker element. The press
// squish in ripple.ts scales the pressed button, and a scale on that element
// scales its position too: the marker jumps toward the top left corner, out
// from under the finger, and the tap lands on the map behind it. So the marker
// element is only a shell, and the button that squishes is a child of it.
function markerShell(onClick: () => void, radius = `${RADIUS}px`) {
  const shell = document.createElement('div')
  const button = document.createElement('div')
  button.setAttribute('role', 'button')
  button.style.cssText = `position:relative;border-radius:${radius};cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;`
  // Stop the click from bubbling to the map container, where MapLibre's own click
  // handler would run the POI proximity hit-test and override this marker's action.
  shell.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
  shell.addEventListener('mousedown', (e) => e.stopPropagation())
  shell.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })
  shell.appendChild(button)
  return { shell, button }
}

// A creature shown on a marker: its 3D render by sprite key, the emoji until then.
export interface MarkerCreature {
  emoji: string
  key: string
}

export interface FoodNodeMarker {
  id: string
  foodId: string
  emoji: string
  name: string
  lat: number
  lon: number
  state?: 'idle' | 'busy' | 'ready'
}

export interface FindMarker {
  id: string
  emoji: string
  name: string
  lat: number
  lon: number
}

// The middle of the screen, for the caller to choose what to show there.
export interface MapViewState {
  lat: number
  lon: number
  zoom: number
}

const PIN_SCALE: Record<string, number> = { landmark: 1, marker: 0.62, spot: 0.5 }

function toPinSpec(p: Poi, visited: Set<string>) {
  return {
    id: p.id, lat: p.lat, lon: p.lon,
    kind: p.kind, category: p.category ?? '', visited: visited.has(p.id),
    scale: p.kind === 'temporary' ? 0.8 : PIN_SCALE[p.tier ?? 'landmark'],
  }
}

export interface ShrineNodeMarker {
  id: string
  name: string
  lat: number
  lon: number
  state: 'idle' | 'busy' | 'ready' | 'cleared'
}

function buildFoodNodeElement(node: FoodNodeMarker, onClick: () => void) {
  const state = node.state ?? 'idle'
  const { shell, button: outer } = markerShell(onClick)
  outer.setAttribute('aria-label', node.name)
  outer.dataset.foodNode = node.id
  const inner = document.createElement('div')
  // A paper tag with the same corner as every other button. Green ink means ready.
  const borderColor = state === 'ready' ? '#2F6B4F' : '#33281E'
  inner.style.cssText = `
    width:40px;height:40px;border-radius:10px;box-sizing:border-box;
    background:#FBF6E9;border:${state === 'ready' ? 2.5 : 1.5}px solid ${borderColor};
    display:flex;align-items:center;justify-content:center;
    font-size:24px;line-height:1;
    box-shadow:1px 2px 0 rgba(51,40,30,0.3);
    opacity:${state === 'busy' ? '0.6' : '1'};
  `
  inner.appendChild(spriteEl(node.emoji, 22, `food_${node.foodId}`))
  if (state === 'ready') {
    const badge = document.createElement('div')
    badge.appendChild(spriteEl('🎁', 16, 'item_chest'))
    badge.style.cssText = `
      position:absolute;top:-8px;right:-8px;font-size:13px;
      background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:20px;height:20px;
      display:flex;align-items:center;justify-content:center;
    `
    outer.appendChild(badge)
  } else if (state === 'busy') {
    const badge = document.createElement('div')
    badge.textContent = '⏳'
    badge.style.cssText = `
      position:absolute;top:-8px;right:-8px;font-size:12px;
      background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:18px;height:18px;
      display:flex;align-items:center;justify-content:center;
    `
    outer.appendChild(badge)
  }
  const tooltip = document.createElement('div')
  tooltip.textContent = node.name
  tooltip.style.cssText = `
    position:absolute;bottom:46px;left:50%;transform:translateX(-50%);
    background:#FBF6E9;color:#33281E;border:1px solid rgba(51,40,30,0.45);font-size:11px;font-weight:500;
    padding:3px 9px;border-radius:10px;white-space:nowrap;
    pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })
  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return shell
}

function buildShrineElement(node: ShrineNodeMarker, onClick: () => void) {
  const { shell, button: outer } = markerShell(onClick)
  outer.setAttribute('aria-label', node.name)
  const borderColor = node.state === 'ready' ? '#2F6B4F' : node.state === 'cleared' ? '#2E4A7D' : '#33281E'
  const inner = document.createElement('div')
  inner.style.cssText = `
    width:42px;height:42px;border-radius:10px;box-sizing:border-box;
    background:${node.state === 'cleared' ? '#2E4A7D' : '#FBF6E9'};
    border:${node.state === 'ready' ? 2.5 : 1.5}px solid ${borderColor};
    display:flex;align-items:center;justify-content:center;
    font-size:24px;line-height:1;
    box-shadow:1px 2px 0 rgba(51,40,30,0.3);
    opacity:${node.state === 'busy' ? '0.6' : '1'};
  `
  inner.appendChild(spriteEl('⛩️', 28, 'item_shrine'))
  if (node.state === 'ready') {
    const badge = document.createElement('div')
    badge.textContent = '⚔️'
    badge.style.cssText = 'position:absolute;top:-8px;right:-8px;font-size:13px;background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;'
    outer.appendChild(badge)
  } else if (node.state === 'busy') {
    const badge = document.createElement('div')
    badge.textContent = '⏳'
    badge.style.cssText = 'position:absolute;top:-8px;right:-8px;font-size:12px;background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;'
    outer.appendChild(badge)
  } else if (node.state === 'cleared') {
    const badge = document.createElement('div')
    badge.textContent = '🏆'
    badge.style.cssText = 'position:absolute;top:-8px;right:-8px;font-size:13px;background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;'
    outer.appendChild(badge)
  }
  const tooltip = document.createElement('div')
  tooltip.textContent = node.name
  tooltip.style.cssText = 'position:absolute;bottom:50px;left:50%;transform:translateX(-50%);background:#FBF6E9;color:#33281E;border:1px solid rgba(51,40,30,0.45);font-size:11px;font-weight:500;padding:3px 9px;border-radius:10px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.12s ease;'
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })
  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return shell
}

// OpenFreeMap "Liberty" - free vector tiles, no API key. Gives 3D building
// extrusions, crisp labels, and transit POIs (bus/rail/MRT) out of the box.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Singapore, used until a GPS fix lands.
const DEFAULT_CENTER: [number, number] = [103.8198, 1.3521]

// Street-level zoom every camera move settles at: the initial view, the first
// GPS fix, and the offline framing. The Liberty building extrusions only render
// from zoom 12, so anything wider loses the 3D depth the tilted camera is for.
const PLAYER_ZOOM = 16.5

// A phone screen has up to 3.5 device pixels for each CSS pixel. The map draws
// at 2 at most: the fill cost goes with the square of this value, and the
// difference does not show on a tilted map in motion.
const MAX_PIXEL_RATIO = 2

// A phone that stands still reports a fix each second, a little away from the
// last one. The camera does not follow a move below this: each ease draws half
// a second of frames at the full rate, for one pixel on the screen. A walker
// covers more than this between two fixes, so the camera still follows each one.
const CAMERA_DEADBAND_M = 1

// Tap radius in screen pixels: at 70° pitch a tapped POI pin won't project to
// exactly its coordinate, so we find the closest POI within this threshold.
const TAP_RADIUS_PX = 48

function buildSquadElement(squad: SquadMarker, onClick: () => void) {
  const { shell, button: outer } = markerShell(onClick)
  outer.setAttribute('aria-label', squad.name)

  const inner = document.createElement('div')
  inner.style.cssText = `
    display:grid;grid-template-columns:repeat(2,1fr);gap:1px;
    width:42px;height:42px;padding:3px;border-radius:10px;
    background:#FBF6E9;box-sizing:border-box;
    border:${squad.isActive ? 2.5 : 1.5}px solid ${accent};
    box-shadow:1px 2px 0 rgba(51,40,30,0.3)${squad.isActive ? `,0 0 0 3px ${accentAlpha(0.2)}` : ''};
    align-items:center;justify-items:center;
  `
  const filled = squad.creatures.slice(0, 4)
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement('div')
    cell.style.cssText = 'font-size:13px;line-height:1;'
    if (filled[i]) cell.appendChild(spriteEl(filled[i].emoji, 17, filled[i].key))
    inner.appendChild(cell)
  }

  if (squad.ready) {
    const badge = document.createElement('div')
    badge.appendChild(spriteEl('🎁', 16, 'item_chest'))
    badge.style.cssText = `
      position:absolute;top:-8px;right:-8px;font-size:13px;
      background:#FBF6E9;border:1px solid #33281E;box-sizing:border-box;border-radius:50%;width:20px;height:20px;
      display:flex;align-items:center;justify-content:center;
    `
    outer.appendChild(badge)
  }

  const tooltip = document.createElement('div')
  tooltip.textContent = squad.name + (squad.ready ? ' · ready!' : squad.isActive ? ' ★' : '')
  tooltip.style.cssText = `
    position:absolute;bottom:50px;left:50%;transform:translateX(-50%);
    background:#FBF6E9;color:#33281E;border:1px solid rgba(51,40,30,0.45);font-size:12px;font-weight:500;
    padding:4px 10px;border-radius:10px;white-space:nowrap;
    pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })

  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return shell
}

export interface SquadMarker {
  id: string
  name: string
  creatures: MarkerCreature[]
  lat: number
  lon: number
  isActive: boolean
  ready: boolean
}

export interface ClaimMarker {
  id: string
  name: string
  lat: number
  lon: number
  color: string
}

// A daily find: a small round paper tag, smaller than a food node.
function buildFindElement(find: FindMarker, onClick: () => void) {
  const { shell, button: el } = markerShell(onClick, '50%')
  el.setAttribute('aria-label', find.name)
  el.title = find.name
  el.dataset.find = find.id
  el.textContent = find.emoji
  el.style.cssText += `
    width:30px;height:30px;box-sizing:border-box;
    background:#FBF6E9;border:1.5px dashed #33281E;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;line-height:1;
  `
  return shell
}

function buildClaimElement(claim: ClaimMarker, onClick: () => void) {
  const { shell, button: outer } = markerShell(onClick)
  outer.setAttribute('aria-label', claim.name)
  const inner = document.createElement('div')
  inner.style.cssText = `
    width:28px;height:28px;border-radius:10px;box-sizing:border-box;
    display:flex;align-items:center;justify-content:center;font-size:15px;
    background:#FBF6E9;border:2px solid ${claim.color};
    box-shadow:1px 2px 0 rgba(51,40,30,0.3);
  `
  inner.appendChild(spriteEl('🚩', 20, 'item_claim'))
  const tooltip = document.createElement('div')
  tooltip.textContent = claim.name + ' · yours'
  tooltip.style.cssText = `
    position:absolute;bottom:34px;left:50%;transform:translateX(-50%);
    background:#FBF6E9;color:#33281E;border:1px solid rgba(51,40,30,0.45);font-size:12px;font-weight:500;
    padding:4px 10px;border-radius:10px;white-space:nowrap;
    pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })
  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return shell
}

type MarkerStore = Map<string, { marker: maplibregl.Marker; sig: string }>

// Brings the DOM markers of one kind in line with the list. A marker that did
// not change keeps its element: the page sends a new list on every profile
// change, and a marker that is built again under the finger loses the tap.
function syncMarkers<T extends { id: string; lat: number; lon: number }>(
  map: maplibregl.Map, store: MarkerStore, items: T[], build: (item: T) => HTMLElement,
) {
  const keep = new Set(items.map((item) => item.id))
  store.forEach((entry, id) => {
    if (keep.has(id)) return
    entry.marker.remove()
    store.delete(id)
  })
  for (const item of items) {
    const sig = JSON.stringify(item)
    const old = store.get(item.id)
    if (old?.sig === sig) continue
    old?.marker.remove()
    const marker = new maplibregl.Marker({ element: build(item) }).setLngLat([item.lon, item.lat]).addTo(map)
    store.set(item.id, { marker, sig })
  }
}

interface MapViewProps {
  position: PlayerPosition | null
  appearance: PlayerAppearance
  pois: Poi[]
  visitedPois: Set<string>
  onPoiClick: (poi: Poi) => void
  squadMarkers?: SquadMarker[]
  onSquadClick?: (squadId: string) => void
  companions?: CharacterSpec[]
  // Creatures on the way to a place and back. The map walks them along a dashed line.
  trips?: TripSpec[]
  claimMarkers?: ClaimMarker[]
  onClaimClick?: (poiId: string) => void
  foodNodeMarkers?: FoodNodeMarker[]
  onFoodNodeClick?: (id: string) => void
  shrineNodeMarkers?: ShrineNodeMarker[]
  onShrineNodeClick?: (id: string) => void
  findMarkers?: FindMarker[]
  onFindClick?: (id: string) => void
  // Fires after each camera move, and one time after the map loads.
  onViewChange?: (view: MapViewState) => void
  onBearingChange?: (bearing: number) => void
  compassResetRef?: MutableRefObject<(() => void) | null>
  // True while the camera is far from the player. MapPage shows a recenter
  // button then, which calls recenterRef.
  onAwayChange?: (away: boolean) => void
  recenterRef?: MutableRefObject<(() => void) | null>
  // Moves the camera to a place, for the "next stop" bar.
  focusRef?: MutableRefObject<((lat: number, lon: number) => void) | null>
  // The next stop. The map draws a dashed red line from the player to it.
  goal?: { lat: number; lon: number } | null
  paused?: boolean
}

export function MapView({ position, appearance, pois, visitedPois, onPoiClick, squadMarkers = [], onSquadClick, companions = [], trips = [], claimMarkers = [], onClaimClick, foodNodeMarkers = [], onFoodNodeClick, shrineNodeMarkers = [], onShrineNodeClick, findMarkers = [], onFindClick, onViewChange, onBearingChange, compassResetRef, onAwayChange, recenterRef, focusRef, goal = null, paused = false }: MapViewProps) {
  const { mode } = useConnectionMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const playerAvatarRef = useRef<PlayerAvatarLayerHandle | null>(null)
  const squadMarkersRef = useRef<MarkerStore>(new Map())
  const claimMarkersRef = useRef<MarkerStore>(new Map())
  const foodNodeMarkersRef = useRef<MarkerStore>(new Map())
  const shrineMarkersRef = useRef<MarkerStore>(new Map())
  const findMarkersRef = useRef<MarkerStore>(new Map())
  const charLayerRef = useRef<CharacterLayerHandle | null>(null)
  const poiPinsRef = useRef<PoiPinsHandle | null>(null)
  const hasZoomedToPlayerRef = useRef(false)
  const cameraTargetRef = useRef<[number, number] | null>(null)
  const positionRef = useRef(position)
  positionRef.current = position
  const companionsRef = useRef<CharacterSpec[]>(companions)
  companionsRef.current = companions
  const tripsRef = useRef<TripSpec[]>(trips)
  tripsRef.current = trips
  const appearanceRef = useRef<PlayerAppearance>(appearance)
  appearanceRef.current = appearance

  // Kept in refs so map event handlers never capture stale closures.
  const poisRef = useRef<Poi[]>(pois)
  poisRef.current = pois
  const visitedPoisRef = useRef<Set<string>>(visitedPois)
  visitedPoisRef.current = visitedPois
  const onPoiClickRef = useRef(onPoiClick)
  onPoiClickRef.current = onPoiClick
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange
  const onBearingChangeRef = useRef(onBearingChange)
  onBearingChangeRef.current = onBearingChange
  const onAwayChangeRef = useRef(onAwayChange)
  onAwayChangeRef.current = onAwayChange
  // The camera follows the player until the player pans, zooms, or turns the
  // map by hand. The recenter button turns following back on.
  const followingRef = useRef(true)
  const awayRef = useRef(false)

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: PLAYER_ZOOM,
      pitch: 70,
      maxPitch: 80,
      pixelRatio: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
      attributionControl: { compact: true },
    })

    mapRef.current = map
    // The credit starts as a small (i). MapLibre opens it until the first touch,
    // and the open note covers a wide strip of the map on a phone.
    map.once('load', () => {
      const credit = map.getContainer().querySelector('.maplibregl-ctrl-attrib')
      credit?.classList.remove('maplibregl-compact-show')
      credit?.removeAttribute('open')
    })
    if (import.meta.env.DEV) {
      Object.assign(window, { _map: map, _ambience: setAmbienceOverride })
    }

    // Day and night, clouds, and rain. The weather is the weather where the player stands.
    const ambience: { remove: () => void }[] = []
    const stopWeather = startWeatherUpdates(() => {
      const p = positionRef.current
      return p ? { latitude: p.latitude, longitude: p.longitude } : { latitude: DEFAULT_CENTER[1], longitude: DEFAULT_CENTER[0] }
    })

    map.on('load', () => {
      // Lower 3D buildings to neighbourhood zoom. Hide every base-map label
      // outside Singapore (Johor Bahru, Batam) since the game is Singapore-only.
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'fill-extrusion') {
          map.setLayerZoomRange(layer.id, 12, 24)
        } else if (layer.type === 'symbol') {
          const inSingapore: maplibregl.ExpressionSpecification = ['within', SINGAPORE_BOUNDARY]
          // Liberty's filters are all expression syntax, so they can share an 'all'.
          const filter = map.getFilter(layer.id) as maplibregl.ExpressionSpecification | undefined
          map.setFilter(layer.id, filter ? ['all', filter, inSingapore] : inSingapore)
        }
      }
      addMrtLayers(map)
      ambience.push(addMapAmbience(map), addMapWeather(map))
    })

    map.on('rotate', () => onBearingChangeRef.current?.(map.getBearing()))

    const reportView = () => {
      const c = map.getCenter()
      onViewChangeRef.current?.({ lat: c.lat, lon: c.lng, zoom: map.getZoom() })
    }
    map.on('moveend', reportView)
    map.once('load', reportView)

    const playerLngLat = (): [number, number] => {
      const p = positionRef.current
      return p ? [p.longitude, p.latitude] : DEFAULT_CENTER
    }
    const setAway = (away: boolean) => {
      if (away === awayRef.current) return
      awayRef.current = away
      onAwayChangeRef.current?.(away)
    }
    // A camera move from code (easeTo, jumpTo) has no originalEvent.
    map.on('movestart', (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) followingRef.current = false
    })
    map.on('move', () => {
      if (followingRef.current) return setAway(false)
      const canvas = map.getCanvas()
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const pt = map.project(playerLngLat())
      setAway(Math.hypot(pt.x - w / 2, pt.y - h / 2) > Math.min(w, h) * 0.3)
    })
    if (recenterRef) {
      recenterRef.current = () => {
        followingRef.current = true
        setAway(false)
        map.easeTo({ center: playerLngLat(), zoom: PLAYER_ZOOM, duration: 800 })
      }
    }

    if (focusRef) {
      // The camera leaves the player, so it stops following and the recenter button shows.
      focusRef.current = (lat, lon) => {
        followingRef.current = false
        setAway(true)
        // The landmark's panel covers the lower half, so the place sits above the middle.
        map.easeTo({ center: [lon, lat], zoom: PLAYER_ZOOM, duration: 800, offset: [0, -140] })
      }
    }

    if (compassResetRef) {
      compassResetRef.current = () => map.easeTo({ bearing: 0, duration: 300 })
    }

    // Proximity click: find the closest POI to the tap within TAP_RADIUS_PX.
    // Used instead of a hitbox layer so the Three.js pins don't need raycasting.
    map.on('click', (e) => {
      const pt = e.point
      let best: Poi | null = null
      let bestDist = TAP_RADIUS_PX * TAP_RADIUS_PX

      for (const poi of poisRef.current) {
        const proj = map.project([poi.lon, poi.lat])
        const d = (proj.x - pt.x) ** 2 + (proj.y - pt.y) ** 2
        if (d < bestDist) { bestDist = d; best = poi }
      }
      if (best) { playClickSfx(); onPoiClickRef.current(best) }
    })

    return () => {
      if (compassResetRef) compassResetRef.current = null
      if (recenterRef) recenterRef.current = null
      if (focusRef) focusRef.current = null
      stopWeather()
      ambience.forEach((a) => a.remove())
      map.remove()
      mapRef.current = null
      // The DOM markers went with the map, so the next map builds them again.
      for (const store of [squadMarkersRef, claimMarkersRef, foodNodeMarkersRef, shrineMarkersRef, findMarkersRef]) store.current.clear()
      tripRouteSigRef.current = ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMapPaused(paused)
    if (!paused) mapRef.current?.triggerRepaint()
  }, [paused])

  // Launch the 3D POI pins layer once the map (and style) is ready.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const specs = () => poisRef.current.map((p) => toPinSpec(p, visitedPoisRef.current))

    const add = async () => {
      const initial = poisRef.current
      const handle = await addPoiPinsLayer(map, specs())
      if (cancelled) { handle.remove(); return }
      poiPinsRef.current = handle
      // POIs that arrived while the layer was loading had no handle to update.
      if (poisRef.current !== initial) handle.updatePins(specs())
    }

    if (map.loaded()) add()
    else map.once('load', add)

    return () => {
      cancelled = true
      poiPinsRef.current?.remove()
      poiPinsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Push POI + visited state updates into the pins layer.
  useEffect(() => {
    poiPinsRef.current?.updatePins(pois.map((p) => toPinSpec(p, visitedPois)))
  }, [pois, visitedPois])

  // Launch companion characters once the style is ready.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const add = async () => {
      const p = positionRef.current
      const c: [number, number] = p ? [p.longitude, p.latitude] : DEFAULT_CENTER
      const handle = await addCharacterLayer(map, {
        center: c,
        characters: companionsRef.current,
        trips: tripsRef.current,
        modelUrl: CAT_MODEL_URL,
        wanderRadiusM: 30,
        modelScale: 4,
      })
      if (cancelled) { handle.remove(); return }
      charLayerRef.current = handle
      handle.setCharacters(companionsRef.current)
      handle.setTrips(tripsRef.current)
      // A GPS fix can land while the model loads, before this handle exists,
      // and a player who stands still sends no new one. Catch up here, or the
      // companions stay at the default centre.
      const now = positionRef.current
      if (now) handle.setCenter(now.longitude, now.latitude)
    }

    if (map.loaded()) add()
    else map.once('load', add)

    return () => {
      cancelled = true
      charLayerRef.current?.remove()
      charLayerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    charLayerRef.current?.setCharacters(companions)
  }, [companions])

  useEffect(() => {
    charLayerRef.current?.setTrips(trips)
  }, [trips])

  useEffect(() => {
    if (position) charLayerRef.current?.setCenter(position.longitude, position.latitude)
  }, [position])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mode !== 'offline') return
    // Offline moved the camera itself, so going back online must re-frame it.
    hasZoomedToPlayerRef.current = false
    followingRef.current = true
    // Read the position when the jump happens, not when the effect runs: the
    // first GPS fix can land before the map loads, and a stale centre would
    // undo the move to it.
    const frame = () => {
      const p = positionRef.current
      map.jumpTo({ center: p ? [p.longitude, p.latitude] : DEFAULT_CENTER, zoom: PLAYER_ZOOM })
    }
    if (map.loaded()) frame()
    else map.once('load', frame)
  }, [mode])

  // Launch the player's own 3D avatar once the style is ready (mirrors the
  // companion-character launch effect above).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const add = async () => {
      // The ref, not the mount-time `position`: a fix that lands before the map
      // loads would otherwise leave the avatar at the default centre until the next one.
      const p = positionRef.current ?? { longitude: 103.8198, latitude: 1.3521 }
      const handle = await addPlayerAvatarLayer(map, {
        position: [p.longitude, p.latitude],
        appearance: appearanceRef.current,
        modelScale: 4,
      })
      if (cancelled) { handle.remove(); return }
      playerAvatarRef.current = handle
    }

    if (map.loaded()) add()
    else map.once('load', add)

    return () => {
      cancelled = true
      playerAvatarRef.current?.remove()
      playerAvatarRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    playerAvatarRef.current?.setAppearance(appearance)
  }, [appearance])

  // Particle effects (fireworks, sparkles) draw above the avatar and companions.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    let handle: VfxLayerHandle | null = null

    const add = async () => {
      const h = await addVfxLayer(map)
      if (cancelled) { h.remove(); return }
      handle = h
    }

    if (map.loaded()) add()
    else map.once('load', add)

    return () => {
      cancelled = true
      handle?.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    // Both modes: offline is a test mode for check-ins and purchases, but the
    // player still stands at their GPS position. Without this the avatar sat at
    // the GPS position while the camera stayed on the default centre.
    if (!map || !position) return

    const lngLat: [number, number] = [position.longitude, position.latitude]
    playerAvatarRef.current?.setPosition(lngLat[0], lngLat[1])

    // First fix drops the camera to street level, where the 3D buildings render
    // and the tilt reads as tilt. Later fixes only pan.
    if (!hasZoomedToPlayerRef.current) {
      hasZoomedToPlayerRef.current = true
      cameraTargetRef.current = lngLat
      map.easeTo({ center: lngLat, zoom: PLAYER_ZOOM, duration: 1200 })
    } else if (followingRef.current) {
      const last = cameraTargetRef.current
      if (last && haversineDistance(last[1], last[0], lngLat[1], lngLat[0]) < CAMERA_DEADBAND_M) return
      cameraTargetRef.current = lngLat
      map.easeTo({ center: lngLat, duration: 500 })
    }
  }, [position, mode])

  // The click handlers live in a ref, so a new callback from the page does not
  // build every marker again.
  const clicksRef = useRef({ onSquadClick, onClaimClick, onFoodNodeClick, onShrineNodeClick, onFindClick })
  useEffect(() => {
    clicksRef.current = { onSquadClick, onClaimClick, onFoodNodeClick, onShrineNodeClick, onFindClick }
  })

  // None of these wait for 'load': a DOM marker needs no style. The markers
  // change while the player walks, and map.loaded() is false then, because tiles load.
  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, squadMarkersRef.current, squadMarkers, (s) => buildSquadElement(s, () => clicksRef.current.onSquadClick?.(s.id)))
  }, [squadMarkers])

  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, claimMarkersRef.current, claimMarkers, (c) => buildClaimElement(c, () => clicksRef.current.onClaimClick?.(c.id)))
  }, [claimMarkers])

  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, foodNodeMarkersRef.current, foodNodeMarkers, (n) => buildFoodNodeElement(n, () => clicksRef.current.onFoodNodeClick?.(n.id)))
  }, [foodNodeMarkers])

  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, shrineMarkersRef.current, shrineNodeMarkers, (n) => buildShrineElement(n, () => clicksRef.current.onShrineNodeClick?.(n.id)))
  }, [shrineNodeMarkers])

  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, findMarkersRef.current, findMarkers, (f) => buildFindElement(f, () => clicksRef.current.onFindClick?.(f.id)))
  }, [findMarkers])

  // A dashed red line from the player to the next stop, as on a treasure map.
  // It runs straight, not along the streets: it shows the direction, not a route.
  const routeReadyRef = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const data = {
      type: 'FeatureCollection' as const,
      features: goal && position ? [{
        type: 'Feature' as const, properties: {},
        geometry: { type: 'LineString' as const, coordinates: [[position.longitude, position.latitude], [goal.lon, goal.lat]] },
      }] : [],
    }
    const sync = () => {
      if (routeReadyRef.current) {
        (map.getSource('goal-route') as maplibregl.GeoJSONSource | undefined)?.setData(data)
        return
      }
      map.addSource('goal-route', { type: 'geojson', data })
      // Below the 3D layers, so the line passes under the avatar and the pins.
      const firstCustom = map.getStyle().layers.find((l) => (l as { type: string }).type === 'custom')?.id
      map.addLayer({
        id: 'goal-route', type: 'line', source: 'goal-route',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#A8361F', 'line-width': 3, 'line-dasharray': [0.6, 2.4], 'line-opacity': 0.9 },
      }, firstCustom)
      routeReadyRef.current = true
    }
    if (routeReadyRef.current || map.loaded()) sync()
    else map.once('load', sync)
  }, [goal, position])

  // A dashed ink line along the leg that each trip is on: out to the place,
  // then from the place back to the player. The clock moves a trip to its next
  // leg and the player moves the end of the way back, so the line is checked
  // one time each second while a trip is out.
  const tripRouteSigRef = useRef('')
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const sync = () => {
      const now = Date.now()
      const p = positionRef.current
      const player: [number, number] = p ? [p.longitude, p.latitude] : DEFAULT_CENTER
      const lines: [number, number][][] = []
      for (const trip of trips) {
        const { phase } = tripProgress(trip, now)
        if (phase === 'home') continue
        lines.push(phase === 'back' ? [trip.to, player] : [trip.from ?? player, trip.to])
      }
      const sig = JSON.stringify(lines)
      if (sig === tripRouteSigRef.current) return
      const data = {
        type: 'FeatureCollection' as const,
        features: lines.map((coordinates) => ({
          type: 'Feature' as const, properties: {},
          geometry: { type: 'LineString' as const, coordinates },
        })),
      }
      const source = map.getSource('trip-routes') as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(data)
      } else {
        // A style that is not ready takes no layer. The next check adds it.
        if (!map.isStyleLoaded()) return
        if (lines.length === 0) return
        map.addSource('trip-routes', { type: 'geojson', data })
        const firstCustom = map.getStyle().layers.find((l) => (l as { type: string }).type === 'custom')?.id
        // Ink on a strip of paper, so the line also shows on the night map.
        map.addLayer({
          id: 'trip-routes-paper', type: 'line', source: 'trip-routes',
          layout: { 'line-cap': 'round' },
          paint: { 'line-color': paperLight, 'line-width': 9, 'line-opacity': 0.85 },
        }, firstCustom)
        map.addLayer({
          id: 'trip-routes', type: 'line', source: 'trip-routes',
          paint: { 'line-color': ink, 'line-width': 4, 'line-dasharray': [2, 1.5] },
        }, firstCustom)
      }
      tripRouteSigRef.current = sig
    }
    sync()
    if (trips.length === 0) return
    const timer = setInterval(sync, 1000)
    return () => clearInterval(timer)
  }, [trips])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
