import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { MapView } from '@/components/Map/MapView'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { ModeToggle } from '@/components/UI/ModeToggle'
import { StepCounter } from '@/components/UI/StepCounter'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStepCounter } from '@/hooks/useStepCounter'
import { usePois } from '@/hooks/usePois'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useMusic } from '@/contexts/MusicContext'
import { glassChrome } from '@/lib/glass'
import { haversineDistance } from '@/lib/mapUtils'
import type { Poi } from '@/types'

const CHECKIN_RADIUS_M = 50

// Map a creature's type (POI category) to a 3D companion body colour.
const CATEGORY_COLORS: Record<string, number> = {
  heritage: 0xf59e0b,
  landmark: 0x6366f1,
  arts: 0xa855f7,
  religious: 0xfacc15,
  museum: 0xf472b6,
  nature: 0x22c55e,
}
function categoryColor(category?: string): number {
  return (category && CATEGORY_COLORS[category]) || 0x94a3b8
}

export function MapPage() {
  const { t } = useLocale()
  const { position, error: gpsError, loading: gpsLoading } = useGeolocation()
  const { steps, distanceM } = useStepCounter(position)
  const { pois } = usePois(position)
  const { profile, visitedPois, addVisit, advanceEggsBySteps, justHatched, clearJustHatched } = useProfile()
  const { mode } = useConnectionMode()
  const navigate = useNavigate()
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [isPanelClosing, setIsPanelClosing] = useState(false)
  const panelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [bearing, setBearing] = useState(0)
  const compassResetRef = useRef<(() => void) | null>(null)
  const { muted, toggle: toggleMusic } = useMusic()

  // The active squad's creatures become the 3D companions that walk with you —
  // unless that squad is away on an expedition, in which case nobody follows.
  // When the active squad is empty, show a few neutral "ambient" wanderers so the
  // map is never lifeless (they're replaced by real members once you assign any).
  const companions = useMemo(() => {
    const active = profile.squads.find((s) => s.id === profile.activeSquadId)
    if (active?.expedition) return []
    const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const members = (active?.slots ?? [])
      .filter((id): id is string => !!id)
      .map((id) => ({
        id,
        color: categoryColor(byId.get(id)?.poiCategory),
        category: byId.get(id)?.poiCategory,
      }))
    if (members.length > 0) return members
    return [0, 1, 2].map((i) => ({ id: `ambient-${i}`, color: 0x94a3b8, category: undefined }))
  }, [profile.squads, profile.activeSquadId, profile.hatchedCreatures])

  const claimMarkers = useMemo(
    () => profile.claims.map((c) => ({
      id: c.poiId, name: c.poiName, lat: c.lat, lon: c.lon,
      color: `#${categoryColor(c.poiCategory).toString(16).padStart(6, '0')}`,
    })),
    [profile.claims],
  )

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
  const handlePoiClick = useCallback((poi: Poi) => {
    if (panelCloseTimer.current) {
      clearTimeout(panelCloseTimer.current)
      panelCloseTimer.current = null
    }
    setIsPanelClosing(false)
    setSelectedPoi(poi)
  }, [])

  const handleClose = useCallback(() => {
    setIsPanelClosing(true)
    panelCloseTimer.current = setTimeout(() => {
      setSelectedPoi(null)
      setIsPanelClosing(false)
      panelCloseTimer.current = null
    }, 300)
  }, [])
  const handleCheckIn = useCallback(() => {
    if (!selectedPoi) return
    // Re-verify proximity here too — visits are the core progression currency, so
    // don't trust only the render-time button gate. Offline mode is a deliberate
    // GPS-free test path and is exempt.
    if (mode === 'online') {
      if (!position) return
      const d = haversineDistance(position.latitude, position.longitude, selectedPoi.lat, selectedPoi.lon)
      if (d > CHECKIN_RADIUS_M) return
    }
    addVisit(selectedPoi)
  }, [selectedPoi, addVisit, mode, position])

  // Advance egg incubation as the player walks
  useEffect(() => {
    if (steps > 0) advanceEggsBySteps(steps)
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

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
        companions={companions}
        claimMarkers={claimMarkers}
        onClaimClick={handleSquadClick}
        onBearingChange={setBearing}
        compassResetRef={compassResetRef}
      />

      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto', justifySelf: 'start' }}>
          <ModeToggle />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <StepCounter steps={steps} distanceM={distanceM} />
          {gpsLoading && (
            <div style={{
              ...glassChrome, color: '#64748b', fontSize: 12,
              padding: '4px 10px', borderRadius: 999,
            }}>
              {t('hud_locating')}
            </div>
          )}
          {gpsError && !position && (
            <div style={{
              ...glassChrome,
              background: 'rgba(255,241,242,0.72)',
              color: '#e11d48', fontSize: 12,
              padding: '4px 10px', borderRadius: 999,
            }}>
              {t('hud_gps_unavailable')}
            </div>
          )}
        </div>
        <div />
      </div>

      {/* Right-side HUD — below CoinCapsule (which sits at top:16, ~34px tall) */}
      <div style={{
        position: 'absolute', top: 64, right: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'auto',
      }}>
        <button
          onClick={() => compassResetRef.current?.()}
          title="Reset to north"
          style={{
            width: 44, height: 44, borderRadius: 14, padding: 0,
            ...glassChrome,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg
            width="28" height="28"
            viewBox="-14 -14 28 28"
            style={{
              transform: `rotate(${-bearing}deg)`,
              transition: 'transform 0.1s linear',
              display: 'block',
            }}
          >
            <polygon points="0,-11 -5.5,0 5.5,0" fill="#ef4444" />
            <polygon points="0,11 -5.5,0 5.5,0" fill="white" stroke="#cbd5e1" strokeWidth="0.5" />
            <circle r="2" fill="#334155" />
          </svg>
        </button>
        <button
          onClick={toggleMusic}
          title={muted ? 'Unmute music' : 'Mute music'}
          style={{
            width: 44, height: 44, borderRadius: 14, padding: 0,
            ...glassChrome,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {muted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
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
          isClosing={isPanelClosing}
        />
      )}
    </div>
  )
}
