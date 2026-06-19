import { useState, useCallback } from 'react'
import { MapView } from '@/components/Map/MapView'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { ModeToggle } from '@/components/UI/ModeToggle'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePois } from '@/hooks/usePois'
import { useProfile } from '@/contexts/ProfileContext'
import type { Poi } from '@/types'

export function MapPage() {
  const { position, error: gpsError, loading: gpsLoading } = useGeolocation()
  const { pois } = usePois(position)
  const { visitedPois, addVisit } = useProfile()
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)

  const handlePoiClick = useCallback((poi: Poi) => setSelectedPoi(poi), [])
  const handleClose = useCallback(() => setSelectedPoi(null), [])
  const handleCheckIn = useCallback(() => {
    if (selectedPoi) addVisit(selectedPoi)
  }, [selectedPoi, addVisit])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView
        position={position}
        pois={pois}
        visitedPois={visitedPois}
        onPoiClick={handlePoiClick}
      />

      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <ModeToggle />
        </div>
        {gpsLoading && (
          <div style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            color: '#64748b', fontSize: 12, padding: '6px 12px',
            borderRadius: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
            Locating…
          </div>
        )}
        {gpsError && !position && (
          <div style={{
            background: '#fff1f2', color: '#e11d48', fontSize: 12,
            padding: '6px 12px', borderRadius: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
            GPS unavailable
          </div>
        )}
      </div>

      {selectedPoi && (
        <PoiDetailPanel
          poi={selectedPoi}
          isVisited={visitedPois.has(selectedPoi.id)}
          position={position}
          onCheckIn={handleCheckIn}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
