import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
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

// MapLibre applies its own transform to the element passed to Marker({ element }).
// We must NOT apply our own transform there or it will fight with MapLibre's positioning.
// Solution: nest an inner element for all visual styling and animation.
function createMarkerElement(poi: Poi, isVisited: boolean, onClick: () => void) {
  // Outer: MapLibre positions this — no visual styling, no transform
  const outer = document.createElement('div')
  outer.style.cssText = 'position: relative; width: 40px; height: 40px;'

  // Inner: carries all visual styling — we safely animate this
  const inner = document.createElement('div')
  inner.style.cssText = `
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    user-select: none;
  `
  applyMarkerVisual(inner, poi, isVisited)

  // Tooltip: shows POI name above the marker on hover
  const tooltip = document.createElement('div')
  tooltip.textContent = poi.name
  tooltip.style.cssText = `
    position: absolute; bottom: 48px; left: 50%;
    transform: translateX(-50%);
    background: white; color: #1e293b;
    font-size: 12px; font-weight: 600;
    padding: 4px 10px; border-radius: 8px; white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12);
    pointer-events: none;
    opacity: 0; transition: opacity 0.12s ease;
  `

  outer.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.2)'
    inner.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)'
    tooltip.style.opacity = '1'
  })
  outer.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    inner.style.boxShadow = ''
    tooltip.style.opacity = '0'
  })
  outer.addEventListener('click', onClick)

  outer.appendChild(inner)
  outer.appendChild(tooltip)

  return { outer, inner }
}

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

interface MapViewProps {
  position: PlayerPosition | null
  pois: Poi[]
  visitedPois: Set<string>
  onPoiClick: (poi: Poi) => void
}

export function MapView({ position, pois, visitedPois, onPoiClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null)
  const poiMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const poiInnerEls = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const initialCenter: [number, number] = position
      ? [position.longitude, position.latitude]
      : [103.8198, 1.3521]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: 14,
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return

    const lngLat: [number, number] = [position.longitude, position.latitude]

    if (!playerMarkerRef.current) {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 18px; height: 18px; border-radius: 50%;
        background: #6366f1; border: 3px solid white;
        box-shadow: 0 0 0 5px rgba(99,102,241,0.25), 0 2px 8px rgba(0,0,0,0.2);
      `
      playerMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map)
    } else {
      playerMarkerRef.current.setLngLat(lngLat)
    }

    map.easeTo({ center: lngLat, duration: 500 })
  }, [position])

  // Add new POI markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

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
      const { outer, inner } = createMarkerElement(poi, isVisited, () => onPoiClick(poi))

      poiInnerEls.current.set(poi.id, inner)

      const marker = new maplibregl.Marker({ element: outer })
        .setLngLat([poi.lon, poi.lat])
        .addTo(map)

      poiMarkersRef.current.set(poi.id, marker)
    })
  }, [pois, onPoiClick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker visuals when visited state changes — no need to recreate markers
  useEffect(() => {
    pois.forEach((poi) => {
      const el = poiInnerEls.current.get(poi.id)
      if (el) applyMarkerVisual(el, poi, visitedPois.has(poi.id))
    })
  }, [visitedPois, pois])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
