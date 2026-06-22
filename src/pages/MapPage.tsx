import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapView } from '@/components/Map/MapView'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { ModeToggle } from '@/components/UI/ModeToggle'
import { StepCounter } from '@/components/UI/StepCounter'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStepCounter } from '@/hooks/useStepCounter'
import { usePois } from '@/hooks/usePois'
import { useProfile } from '@/contexts/ProfileContext'
import type { Poi } from '@/types'

export function MapPage() {
  const { position, error: gpsError, loading: gpsLoading } = useGeolocation()
  const { steps, distanceM } = useStepCounter(position)
  const { pois } = usePois(position)
  const { profile, visitedPois, addVisit, justHatched, clearJustHatched } = useProfile()
  const navigate = useNavigate()
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const squadMarkers = useMemo(() => {
    const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const now = Date.now()
    return profile.squads
      .filter((s) => s.expedition)
      .map((s) => ({
        id: s.id,
        name: s.name,
        emojis: s.slots
          .filter((id): id is string => !!id)
          .map((id) => byId.get(id)?.emoji ?? '❓'),
        lat: s.expedition!.lat,
        lon: s.expedition!.lon,
        isActive: profile.activeSquadId === s.id,
        ready: now >= new Date(s.expedition!.returnsAt).getTime(),
      }))
  }, [profile.squads, profile.hatchedCreatures, profile.activeSquadId])

  const handleSquadClick = useCallback(() => navigate('/squads'), [navigate])
  const handlePoiClick = useCallback((poi: Poi) => setSelectedPoi(poi), [])
  const handleClose = useCallback(() => setSelectedPoi(null), [])
  const handleCheckIn = useCallback(() => {
    if (selectedPoi) addVisit(selectedPoi)
  }, [selectedPoi, addVisit])

  // Show hatching toast
  useEffect(() => {
    if (justHatched.length === 0) return
    const names = justHatched.map((c) => c.species).join(', ')
    setToast(`🎉 ${names} hatched! Check Creatures →`)
    const t = setTimeout(() => {
      setToast(null)
      clearJustHatched()
    }, 4000)
    return () => clearTimeout(t)
  }, [justHatched, clearJustHatched])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView
        position={position}
        pois={pois}
        visitedPois={visitedPois}
        onPoiClick={handlePoiClick}
        squadMarkers={squadMarkers}
        onSquadClick={handleSquadClick}
      />

      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <ModeToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <StepCounter steps={steps} distanceM={distanceM} />
        </div>
      </div>

      {/* Hatching toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          color: 'white', fontSize: 13, fontWeight: 600,
          padding: '10px 20px', borderRadius: 24,
          boxShadow: '0 4px 16px rgba(129,140,248,0.45)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {toast}
        </div>
      )}

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
