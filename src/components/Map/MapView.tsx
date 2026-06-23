import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { addCharacterLayer, type CharacterLayerHandle, type CharacterSpec } from '@/lib/mapCharacters'
import { addPoiPinsLayer, type PoiPinsHandle } from '@/lib/mapPoiPins'
import type { Poi, PlayerPosition } from '@/types'

// OpenFreeMap "Liberty" — free vector tiles, no API key. Gives 3D building
// extrusions, crisp labels, and transit POIs (bus/rail/MRT) out of the box.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Bounding box that fits all Singapore POIs with a small margin.
const SINGAPORE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [103.62, 1.15],  // SW
  [104.02, 1.48],  // NE
]

// Tap radius in screen pixels: at 60° pitch a tapped POI pin won't project to
// exactly its coordinate, so we find the closest POI within this threshold.
const TAP_RADIUS_PX = 48

function buildSquadElement(squad: SquadMarker, onClick: () => void) {
  const outer = document.createElement('div')
  outer.style.cssText = 'cursor:pointer;'

  const inner = document.createElement('div')
  inner.style.cssText = `
    display:grid;grid-template-columns:repeat(2,1fr);gap:1px;
    width:42px;height:42px;padding:3px;border-radius:12px;
    background:white;box-sizing:border-box;
    border:2.5px solid ${squad.isActive ? '#6366f1' : '#cbd5e1'};
    box-shadow:0 2px 8px rgba(0,0,0,0.18)${squad.isActive ? ',0 0 0 4px rgba(99,102,241,0.2)' : ''};
    align-items:center;justify-items:center;
  `
  const filled = squad.emojis.slice(0, 4)
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement('div')
    cell.textContent = filled[i] ?? ''
    cell.style.cssText = 'font-size:13px;line-height:1;'
    inner.appendChild(cell)
  }

  if (squad.ready) {
    const badge = document.createElement('div')
    badge.textContent = '🎁'
    badge.style.cssText = `
      position:absolute;top:-8px;right:-8px;font-size:14px;
      background:white;border-radius:50%;width:20px;height:20px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
    `
    outer.appendChild(badge)
  }

  const tooltip = document.createElement('div')
  tooltip.textContent = squad.name + (squad.ready ? ' · ready!' : squad.isActive ? ' ★' : '')
  tooltip.style.cssText = `
    position:absolute;bottom:50px;left:50%;transform:translateX(-50%);
    background:white;color:#1e293b;font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:8px;white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.12);pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })
  outer.addEventListener('click', onClick)

  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return outer
}

export interface SquadMarker {
  id: string
  name: string
  emojis: string[]
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

function buildClaimElement(claim: ClaimMarker, onClick: () => void) {
  const outer = document.createElement('div')
  outer.style.cssText = 'cursor:pointer;'
  const inner = document.createElement('div')
  inner.style.cssText = `
    width:26px;height:26px;border-radius:8px;
    display:flex;align-items:center;justify-content:center;font-size:15px;
    background:white;border:2px solid ${claim.color};
    box-shadow:0 2px 6px rgba(0,0,0,0.18);
  `
  inner.textContent = '🚩'
  const tooltip = document.createElement('div')
  tooltip.textContent = claim.name + ' · yours'
  tooltip.style.cssText = `
    position:absolute;bottom:34px;left:50%;transform:translateX(-50%);
    background:white;color:#1e293b;font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:8px;white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.12);pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `
  outer.addEventListener('mouseenter', () => { tooltip.style.opacity = '1' })
  outer.addEventListener('mouseleave', () => { tooltip.style.opacity = '0' })
  outer.addEventListener('click', onClick)
  outer.appendChild(inner)
  outer.appendChild(tooltip)
  return outer
}

interface MapViewProps {
  position: PlayerPosition | null
  pois: Poi[]
  visitedPois: Set<string>
  onPoiClick: (poi: Poi) => void
  squadMarkers?: SquadMarker[]
  onSquadClick?: (squadId: string) => void
  companions?: CharacterSpec[]
  claimMarkers?: ClaimMarker[]
  onClaimClick?: (poiId: string) => void
}

export function MapView({ position, pois, visitedPois, onPoiClick, squadMarkers = [], onSquadClick, companions = [], claimMarkers = [], onClaimClick }: MapViewProps) {
  const { mode } = useConnectionMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null)
  const squadMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const claimMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const charLayerRef = useRef<CharacterLayerHandle | null>(null)
  const poiPinsRef = useRef<PoiPinsHandle | null>(null)
  const companionsRef = useRef<CharacterSpec[]>(companions)
  companionsRef.current = companions

  // Kept in refs so map event handlers never capture stale closures.
  const poisRef = useRef<Poi[]>(pois)
  poisRef.current = pois
  const visitedPoisRef = useRef<Set<string>>(visitedPois)
  visitedPoisRef.current = visitedPois
  const onPoiClickRef = useRef(onPoiClick)
  onPoiClickRef.current = onPoiClick

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [103.8198, 1.3521],
      zoom: 11,
      pitch: 60,
      maxPitch: 80,
    })

    mapRef.current = map
    if (import.meta.env.DEV) (window as unknown as { _map?: maplibregl.Map })._map = map

    map.on('load', () => {
      // Lower 3D buildings to neighbourhood zoom.
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'fill-extrusion') {
          map.setLayerZoomRange(layer.id, 12, 24)
        }
      }
    })

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
      if (best) onPoiClickRef.current(best)
    })

    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Launch the 3D POI pins layer once the map (and style) is ready.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const add = async () => {
      const specs = poisRef.current.map((p) => ({
        id: p.id, lat: p.lat, lon: p.lon,
        kind: p.kind, category: p.category ?? '', visited: visitedPoisRef.current.has(p.id),
      }))
      const handle = await addPoiPinsLayer(map, specs)
      if (cancelled) { handle.remove(); return }
      poiPinsRef.current = handle
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
    poiPinsRef.current?.updatePins(
      pois.map((p) => ({
        id: p.id, lat: p.lat, lon: p.lon,
        kind: p.kind, category: p.category ?? '', visited: visitedPois.has(p.id),
      })),
    )
  }, [pois, visitedPois])

  // Launch companion characters once the style is ready.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const add = async () => {
      const c: [number, number] = position
        ? [position.longitude, position.latitude]
        : [103.8198, 1.3521]
      const handle = await addCharacterLayer(map, {
        center: c,
        characters: companionsRef.current,
        modelUrl: '/models/character.glb',
        wanderRadiusM: 30,
        modelScale: 4,
      })
      if (cancelled) { handle.remove(); return }
      charLayerRef.current = handle
      handle.setCharacters(companionsRef.current)
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
    if (position) charLayerRef.current?.setCenter(position.longitude, position.latitude)
  }, [position])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mode !== 'offline') return
    const fit = () => map.fitBounds(SINGAPORE_BOUNDS, { padding: 24, duration: 0 })
    if (map.loaded()) fit()
    else map.once('load', fit)
  }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position || mode !== 'online') return

    const lngLat: [number, number] = [position.longitude, position.latitude]

    if (!playerMarkerRef.current) {
      const el = document.createElement('div')
      el.style.cssText = `
        width:18px;height:18px;border-radius:50%;
        background:#6366f1;border:3px solid white;
        box-shadow:0 0 0 5px rgba(99,102,241,0.25),0 2px 8px rgba(0,0,0,0.2);
      `
      playerMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map)
    } else {
      playerMarkerRef.current.setLngLat(lngLat)
    }

    map.easeTo({ center: lngLat, duration: 500 })
  }, [position, mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sync = () => {
      squadMarkersRef.current.forEach((m) => m.remove())
      squadMarkersRef.current.clear()
      squadMarkers.forEach((squad) => {
        const el = buildSquadElement(squad, () => onSquadClick?.(squad.id))
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([squad.lon, squad.lat])
          .addTo(map)
        squadMarkersRef.current.set(squad.id, marker)
      })
    }

    if (map.loaded()) sync()
    else map.once('load', sync)
  }, [squadMarkers, onSquadClick])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sync = () => {
      claimMarkersRef.current.forEach((m) => m.remove())
      claimMarkersRef.current.clear()
      claimMarkers.forEach((claim) => {
        const el = buildClaimElement(claim, () => onClaimClick?.(claim.id))
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([claim.lon, claim.lat])
          .addTo(map)
        claimMarkersRef.current.set(claim.id, marker)
      })
    }

    if (map.loaded()) sync()
    else map.once('load', sync)
  }, [claimMarkers, onClaimClick])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
