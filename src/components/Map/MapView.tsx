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

interface MapViewProps {
  position: PlayerPosition | null
  pois: Poi[]
  onPoiClick: (poi: Poi) => void
}

export function MapView({ position, pois, onPoiClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null)
  const poiMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const initialCenter: [number, number] = position
      ? [position.longitude, position.latitude]
      : [103.8198, 1.3521]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: 16,
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

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const currentIds = new Set(pois.map((p) => p.id))

    poiMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        poiMarkersRef.current.delete(id)
      }
    })

    pois.forEach((poi) => {
      if (poiMarkersRef.current.has(poi.id)) return

      const isPermanent = poi.kind === 'permanent'
      const el = document.createElement('div')
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: ${isPermanent ? '#fff7ed' : '#faf5ff'};
        border: 2px solid ${isPermanent ? '#fb923c' : '#c084fc'};
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
        transition: transform 0.15s ease;
      `
      el.textContent = isPermanent ? '🏛' : '✨'
      el.title = poi.name
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      el.addEventListener('click', () => onPoiClick(poi))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lon, poi.lat])
        .addTo(map)

      poiMarkersRef.current.set(poi.id, marker)
    })
  }, [pois, onPoiClick])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
