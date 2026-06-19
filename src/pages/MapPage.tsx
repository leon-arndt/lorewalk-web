import { useState, useCallback } from 'react'
import { MapView } from '@/components/Map/MapView'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { ModeToggle } from '@/components/UI/ModeToggle'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePois } from '@/hooks/usePois'
import type { Poi } from '@/types'

export function MapPage() {
  const { position, error: gpsError, loading: gpsLoading } = useGeolocation()
  const { pois } = usePois(position)
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)

  const handlePoiClick = useCallback((poi: Poi) => setSelectedPoi(poi), [])
  const handleClose = useCallback(() => setSelectedPoi(null), [])

  return (
    <div className="relative flex-1 overflow-hidden">
      <MapView position={position} pois={pois} onPoiClick={handlePoiClick} />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <ModeToggle />
        </div>

        {gpsLoading && (
          <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Locating…
          </div>
        )}

        {gpsError && !position && (
          <div className="bg-red-900/80 text-red-200 text-xs px-3 py-1.5 rounded-full pointer-events-none">
            GPS unavailable
          </div>
        )}
      </div>

      {selectedPoi && (
        <PoiDetailPanel poi={selectedPoi} onClose={handleClose} />
      )}
    </div>
  )
}
