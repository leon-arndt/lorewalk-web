import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import type { Poi, PlayerPosition } from '@/types'

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// Bounding box that fits all 100 Singapore POIs with a small margin.
const SINGAPORE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [103.62, 1.15],  // SW
  [104.02, 1.48],  // NE
]

function applyMarkerVisual(el: HTMLElement, poi: Poi, isVisited: boolean) {
  const isPermanent = poi.kind === 'permanent'
  if (isVisited) {
    el.textContent = '😊'
    el.style.background = '#f0fdf4'
    el.style.border = '2.5px solid #22c55e'
    el.style.boxShadow = '0 2px 8px rgba(34,197,94,0.25)'
  } else {
    el.textContent = isPermanent ? '🏛' : '✨'
    el.style.background = isPermanent ? '#fff7ed' : '#faf5ff'
    el.style.border = `2.5px solid ${isPermanent ? '#fb923c' : '#c084fc'}`
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'
  }
}

function buildMarkerElement(poi: Poi, isVisited: boolean, onClick: () => void) {
  // MapLibre sets position:absolute and transform on whichever element you pass to
  // Marker({ element }). Applying our own transform there would overwrite MapLibre's
  // coordinate projection. The fix: a nested inner element carries all visuals and
  // animation — the outer element belongs entirely to MapLibre.
  const outer = document.createElement('div')
  outer.style.cssText = 'width:40px;height:40px;cursor:pointer;'

  const inner = document.createElement('div')
  inner.style.cssText = `
    width:40px;height:40px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
    transition:transform 0.15s ease,box-shadow 0.15s ease;
    user-select:none;
  `
  applyMarkerVisual(inner, poi, isVisited)

  const tooltip = document.createElement('div')
  tooltip.textContent = poi.name
  tooltip.style.cssText = `
    position:absolute;bottom:48px;left:50%;
    transform:translateX(-50%);
    background:white;color:#1e293b;
    font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:8px;white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.12);
    pointer-events:none;
    opacity:0;transition:opacity 0.12s ease;
  `

  outer.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.2)'
    tooltip.style.opacity = '1'
  })
  outer.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    tooltip.style.opacity = '0'
  })
  outer.addEventListener('click', onClick)

  outer.appendChild(inner)
  outer.appendChild(tooltip)

  return { outer, inner }
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

interface MapViewProps {
  position: PlayerPosition | null
  pois: Poi[]
  visitedPois: Set<string>
  onPoiClick: (poi: Poi) => void
  squadMarkers?: SquadMarker[]
  onSquadClick?: (squadId: string) => void
}

export function MapView({ position, pois, visitedPois, onPoiClick, squadMarkers = [], onSquadClick }: MapViewProps) {
  const { mode } = useConnectionMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null)
  const poiMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const poiInnerEls = useRef<Map<string, HTMLElement>>(new Map())
  const squadMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())

  // Initialise map once; defer anything that needs map.project() until after 'load'.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [103.8198, 1.3521],
      zoom: 11,
    })

    map.on('load', () => {
      if (mode === 'offline') {
        // Show all of Singapore so every POI is visible at its real position.
        map.fitBounds(SINGAPORE_BOUNDS, { padding: 24, duration: 0 })
      } else if (position) {
        map.jumpTo({ center: [position.longitude, position.latitude], zoom: 15 })
      }
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Follow player position in online mode.
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

  // Add / remove POI markers. We wait for map 'load' before projecting coordinates.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sync = () => {
      const currentIds = new Set(pois.map((p) => p.id))

      poiMarkersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove()
          poiMarkersRef.current.delete(id)
          poiInnerEls.current.delete(id)
        }
      })

      pois.forEach((poi) => {
        if (poiMarkersRef.current.has(poi.id)) return

        const isVisited = visitedPois.has(poi.id)
        const { outer, inner } = buildMarkerElement(poi, isVisited, () => onPoiClick(poi))

        poiInnerEls.current.set(poi.id, inner)

        const marker = new maplibregl.Marker({ element: outer })
          .setLngLat([poi.lon, poi.lat])
          .addTo(map)

        poiMarkersRef.current.set(poi.id, marker)
      })
    }

    if (map.loaded()) {
      sync()
    } else {
      map.once('load', sync)
    }
  }, [pois, onPoiClick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker visuals when visited state changes — no map projection needed.
  useEffect(() => {
    pois.forEach((poi) => {
      const el = poiInnerEls.current.get(poi.id)
      if (el) applyMarkerVisual(el, poi, visitedPois.has(poi.id))
    })
  }, [visitedPois, pois])

  // Rebuild stationed-squad markers whenever squads change. Only ever a few, so
  // full teardown is simpler than diffing.
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

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
