import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { MapView } from '@/components/Map/MapView'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { FoodNodePanel } from '@/components/UI/FoodNodePanel'
import { ShrinePanel } from '@/components/UI/ShrinePanel'
import { WeeklyWalkPanel } from '@/components/UI/WeeklyWalkPanel'
import { WeekStrip } from '@/components/UI/WeekStrip'
import { JournalOverlay } from '@/components/UI/JournalOverlay'
import { useReward } from '@/contexts/RewardContext'
import { ModeToggle } from '@/components/UI/ModeToggle'
import { StepCounter } from '@/components/UI/StepCounter'
import { LevelCapsule } from '@/components/UI/LevelCapsule'
import { CoinCapsule } from '@/components/UI/CoinCapsule'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStepCounter } from '@/hooks/useStepCounter'
import { usePois } from '@/hooks/usePois'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { glassChrome } from '@/lib/glass'
import { haversineDistance } from '@/lib/mapUtils'
import { localDateKey, isPoiLocked } from '@/lib/profile'
import { getFoodDef } from '@/data/foods'
import type { Poi } from '@/types'
import { accent, rewardGradient } from '@/lib/theme'

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
  const { profile, visitedPois, addVisit, advanceEggsBySteps, recordDailySteps, justReady, clearJustReady, syncFoodNodes, startFoodExpedition, collectFoodNode, busyCreatureIds, syncShrineNodes, startShrineExpedition, collectShrineNode } = useProfile()
  const { showReward } = useReward()
  const { mode } = useConnectionMode()
  const navigate = useNavigate()
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [isPanelClosing, setIsPanelClosing] = useState(false)
  const panelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedFoodNodeId, setSelectedFoodNodeId] = useState<string | null>(null)
  const [isFoodPanelClosing, setIsFoodPanelClosing] = useState(false)
  const foodPanelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedShrineNodeId, setSelectedShrineNodeId] = useState<string | null>(null)
  const [isShrinePanelClosing, setIsShrinePanelClosing] = useState(false)
  const shrinePanelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [weeklyWalkOpen, setWeeklyWalkOpen] = useState(false)
  const [isWeeklyWalkClosing, setIsWeeklyWalkClosing] = useState(false)
  const weeklyWalkCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [journalOpen, setJournalOpen] = useState(false)
  const [bearing, setBearing] = useState(0)
  const compassResetRef = useRef<(() => void) | null>(null)

  // The active squad's creatures become the 3D companions that walk with you -
  // unless that squad is away on an expedition, in which case nobody follows.
  // When the active squad is empty, show a few neutral "ambient" wanderers so the
  // map is never lifeless (they're replaced by real members once you assign any).
  const companions = useMemo(() => {
    const active = profile.squads.find((s) => s.id === profile.activeSquadId)
    if (active?.expedition) return []
    const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const members = (active?.slots ?? [])
      .filter((id): id is string => !!id)
      // Creatures away foraging at a food node don't walk with you.
      .filter((id) => !busyCreatureIds.has(id))
      .map((id) => ({
        id,
        color: categoryColor(byId.get(id)?.poiCategory),
        category: byId.get(id)?.poiCategory,
      }))
    if (members.length > 0) return members
    return [0, 1, 2].map((i) => ({ id: `ambient-${i}`, color: 0x94a3b8, category: undefined }))
  }, [profile.squads, profile.activeSquadId, profile.hatchedCreatures, busyCreatureIds])

  const foodNodeMarkers = useMemo(
    () => {
      const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
      return profile.foodNodes.map((n) => {
        const def = getFoodDef(n.foodId)
        const state: 'idle' | 'busy' | 'ready' = !n.expedition
          ? 'idle'
          : Date.now() >= new Date(n.expedition.returnsAt).getTime() ? 'ready' : 'busy'
        const travelers = n.expedition ? n.expedition.creatureIds.map((id) => byId.get(id)?.emoji ?? '🐾') : []
        return { id: n.id, emoji: def?.emoji ?? '🍜', name: def?.name ?? 'Food', lat: n.lat, lon: n.lon, state, travelers }
      })
    },
    [profile.foodNodes, profile.hatchedCreatures],
  )

  const selectedFoodNode = useMemo(
    () => profile.foodNodes.find((n) => n.id === selectedFoodNodeId) ?? null,
    [profile.foodNodes, selectedFoodNodeId],
  )

  const shrineNodeMarkers = useMemo(
    () => {
      const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
      return profile.shrineNodes.map((n) => {
        const now = Date.now()
        const state: 'idle' | 'busy' | 'ready' | 'cleared' =
          n.clearedUntil && now < new Date(n.clearedUntil).getTime()
            ? 'cleared'
            : !n.expedition
              ? 'idle'
              : now >= new Date(n.expedition.returnsAt).getTime() ? 'ready' : 'busy'
        const travelers = n.expedition ? n.expedition.creatureIds.map((id) => byId.get(id)?.emoji ?? '🐾') : []
        return { id: n.id, name: n.poiName, lat: n.lat, lon: n.lon, state, travelers }
      })
    },
    [profile.shrineNodes, profile.hatchedCreatures],
  )

  const selectedShrineNode = useMemo(
    () => profile.shrineNodes.find((n) => n.id === selectedShrineNodeId) ?? null,
    [profile.shrineNodes, selectedShrineNodeId],
  )

  // Spawn food nodes near visible POIs; runs whenever the nearby POI list changes.
  useEffect(() => {
    if (pois.length > 0) {
      syncFoodNodes(pois)
      syncShrineNodes(pois)
    }
  }, [pois]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Tracks POIs already auto-checked-in this session to prevent double-firing
  // while position keeps updating inside the radius.
  const autoCheckedRef = useRef<Set<string>>(new Set())

  // Online: auto check-in whenever position enters 50 m of an unvisited POI.
  useEffect(() => {
    if (mode !== 'online' || !position) return
    for (const poi of pois) {
      if (visitedPois.has(poi.id) || autoCheckedRef.current.has(poi.id)) continue
      const d = haversineDistance(position.latitude, position.longitude, poi.lat, poi.lon)
      if (d <= CHECKIN_RADIUS_M) {
        autoCheckedRef.current.add(poi.id)
        if (isPoiLocked(poi, profile)) {
          setToast(`🔒 ${poi.name} is a Premium landmark`)
          continue
        }
        addVisit(poi)
        setToast(`✅ Checked in at ${poi.name}!`)
      }
    }
  }, [position, pois]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSquadClick = useCallback(() => navigate('/squads'), [navigate])
  const handlePoiClick = useCallback((poi: Poi) => {
    if (panelCloseTimer.current) { clearTimeout(panelCloseTimer.current); panelCloseTimer.current = null }
    setIsPanelClosing(false)
    setSelectedPoi(poi)
    setSelectedFoodNodeId(null)
    setIsFoodPanelClosing(false)
    if (foodPanelCloseTimer.current) { clearTimeout(foodPanelCloseTimer.current); foodPanelCloseTimer.current = null }
    // Offline: no GPS, so check-in fires on tap instead of on proximity.
    if (mode === 'offline' && !visitedPois.has(poi.id) && !isPoiLocked(poi, profile)) {
      addVisit(poi)
    }
  }, [mode, visitedPois, addVisit, profile])

  const handleClose = useCallback(() => {
    setIsPanelClosing(true)
    panelCloseTimer.current = setTimeout(() => {
      setSelectedPoi(null)
      setIsPanelClosing(false)
      panelCloseTimer.current = null
    }, 300)
  }, [])

  const handleFoodNodeClick = useCallback((id: string) => {
    if (foodPanelCloseTimer.current) { clearTimeout(foodPanelCloseTimer.current); foodPanelCloseTimer.current = null }
    setIsFoodPanelClosing(false)
    setSelectedFoodNodeId(id)
    setSelectedPoi(null)
    setIsPanelClosing(false)
    if (panelCloseTimer.current) { clearTimeout(panelCloseTimer.current); panelCloseTimer.current = null }
  }, [])

  const handleFoodPanelClose = useCallback(() => {
    setIsFoodPanelClosing(true)
    foodPanelCloseTimer.current = setTimeout(() => {
      setSelectedFoodNodeId(null)
      setIsFoodPanelClosing(false)
      foodPanelCloseTimer.current = null
    }, 300)
  }, [])

  const handleStartFood = useCallback((creatureIds: string[], durationMs: number) => {
    if (!selectedFoodNodeId) return
    startFoodExpedition(selectedFoodNodeId, creatureIds, durationMs)
    handleFoodPanelClose()
  }, [selectedFoodNodeId, startFoodExpedition, handleFoodPanelClose])

  const handleShrineNodeClick = useCallback((id: string) => {
    if (shrinePanelCloseTimer.current) { clearTimeout(shrinePanelCloseTimer.current); shrinePanelCloseTimer.current = null }
    setIsShrinePanelClosing(false)
    setSelectedShrineNodeId(id)
    setSelectedPoi(null)
    setSelectedFoodNodeId(null)
  }, [])

  const handleShrinePanelClose = useCallback(() => {
    setIsShrinePanelClosing(true)
    shrinePanelCloseTimer.current = setTimeout(() => {
      setSelectedShrineNodeId(null)
      setIsShrinePanelClosing(false)
      shrinePanelCloseTimer.current = null
    }, 300)
  }, [])

  const handleStartShrine = useCallback((creatureIds: string[]) => {
    if (!selectedShrineNodeId) return
    startShrineExpedition(selectedShrineNodeId, creatureIds)
    handleShrinePanelClose()
  }, [selectedShrineNodeId, startShrineExpedition, handleShrinePanelClose])

  const handleCollectShrine = useCallback(() => {
    if (!selectedShrineNodeId) return
    const result = collectShrineNode(selectedShrineNodeId)
    if (result) {
      if (result.won) {
        const items: Array<{ type: 'xp' | 'coins' | 'egg' | 'level_up'; amount?: number; label?: string }> = [
          { type: 'xp', amount: result.xp },
          { type: 'coins', amount: result.coins },
        ]
        if (result.egg) items.push({ type: 'egg' })
        result.levelUps.forEach((lu) => items.push({ type: 'level_up', amount: lu.newLevel, label: lu.species }))
        showReward({ emoji: '⛩️', title: 'Shrine Claimed!', subtitle: 'Your creatures defeated the guardian.', items })
      } else {
        setToast('💀 Defeated. Send stronger creatures next time.')
      }
    }
    handleShrinePanelClose()
  }, [selectedShrineNodeId, collectShrineNode, handleShrinePanelClose, showReward])

  const handleWeeklyWalkOpen = useCallback(() => {
    if (weeklyWalkCloseTimer.current) { clearTimeout(weeklyWalkCloseTimer.current); weeklyWalkCloseTimer.current = null }
    setIsWeeklyWalkClosing(false)
    setWeeklyWalkOpen(true)
    setSelectedPoi(null)
    setSelectedFoodNodeId(null)
    setSelectedShrineNodeId(null)
  }, [])

  const handleWeeklyWalkClose = useCallback(() => {
    setIsWeeklyWalkClosing(true)
    weeklyWalkCloseTimer.current = setTimeout(() => {
      setWeeklyWalkOpen(false)
      setIsWeeklyWalkClosing(false)
      weeklyWalkCloseTimer.current = null
    }, 300)
  }, [])

  const handleCollectFood = useCallback(() => {
    if (!selectedFoodNodeId) return
    const result = collectFoodNode(selectedFoodNodeId)
    if (result) {
      const items: Array<{ type: 'food' | 'level_up'; amount?: number; label?: string; emoji?: string }> = [
        { type: 'food', label: result.food.name, emoji: result.food.emoji },
      ]
      result.levelUps.forEach((lu) => items.push({ type: 'level_up', amount: lu.newLevel, label: lu.species }))
      showReward({
        emoji: result.food.emoji,
        title: 'Expedition Complete!',
        subtitle: `Your creatures brought back ${result.food.name}.`,
        items,
      })
    }
    handleFoodPanelClose()
  }, [selectedFoodNodeId, collectFoodNode, handleFoodPanelClose, showReward])
  // Advance egg incubation as the player walks, and log today's steps for the journal.
  useEffect(() => {
    if (steps > 0) {
      advanceEggsBySteps(steps)
      recordDailySteps(localDateKey(new Date()), steps)
    }
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show "egg ready" toast
  useEffect(() => {
    if (justReady.length === 0) return
    const msg = justReady.length === 1
      ? `🥚 Egg from ${justReady[0].poiName} is ready to hatch. Check Creatures →`
      : `🥚 ${justReady.length} eggs are ready to hatch. Check Creatures →`
    setToast(msg)
    const t = setTimeout(() => {
      setToast(null)
      clearJustReady()
    }, 4000)
    return () => clearTimeout(t)
  }, [justReady, clearJustReady])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView
        position={position}
        appearance={profile.appearance}
        pois={pois}
        visitedPois={visitedPois}
        onPoiClick={handlePoiClick}
        squadMarkers={squadMarkers}
        onSquadClick={handleSquadClick}
        companions={companions}
        claimMarkers={claimMarkers}
        onClaimClick={handleSquadClick}
        foodNodeMarkers={foodNodeMarkers}
        onFoodNodeClick={handleFoodNodeClick}
        shrineNodeMarkers={shrineNodeMarkers}
        onShrineNodeClick={handleShrineNodeClick}
        onBearingChange={setBearing}
        compassResetRef={compassResetRef}
      />

      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
        }}>
          <div style={{ pointerEvents: 'auto', justifySelf: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LevelCapsule level={profile.level} />
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
          <div style={{ pointerEvents: 'auto', justifySelf: 'end' }}>
            <CoinCapsule />
          </div>
        </div>

        {/* Journal week strip - tap to open the full calendar (Pikmin-Bloom-style) */}
        <div style={{ pointerEvents: 'auto' }}>
          <WeekStrip dailySteps={profile.dailySteps} onOpen={() => setJournalOpen(true)} />
        </div>

        {/* Compass: right-aligned inside the column so it always sits below
            the week strip and never overlaps it, whatever its height. Only
            shown once the map is rotated off north, where it also acts as
            the "reset rotation" button. */}
        {Math.abs(bearing) > 0.5 && (
          <div style={{
            alignSelf: 'flex-end', marginTop: 4,
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
          </div>
        )}
      </div>

      {/* Hatching toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: rewardGradient,
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
          isLocked={isPoiLocked(selectedPoi, profile)}
          position={position}
          onClose={handleClose}
          isClosing={isPanelClosing}
        />
      )}

      {/* Weekly walk floating button - bottom left above nav */}
      <button
        onClick={handleWeeklyWalkOpen}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          left: 16,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 14px', borderRadius: 22,
          background: profile.weeklyWalk && !profile.weeklyWalk.rewardClaimed
            ? rewardGradient
            : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
          border: 'none', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          color: profile.weeklyWalk && !profile.weeklyWalk.rewardClaimed ? 'white' : '#334155',
          fontSize: 13, fontWeight: 700,
          zIndex: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>🚶</span>
        <span>Weekly Walk</span>
        {profile.tickets > 0 && !profile.weeklyWalk && (
          <span style={{
            background: accent, color: 'white',
            borderRadius: 10, fontSize: 10, fontWeight: 800,
            padding: '1px 6px', marginLeft: 2,
          }}>
            {profile.tickets}🎟️
          </span>
        )}
      </button>

      {selectedShrineNode && (
        <ShrinePanel
          node={selectedShrineNode}
          position={position}
          onStart={handleStartShrine}
          onCollect={handleCollectShrine}
          onClose={handleShrinePanelClose}
          isClosing={isShrinePanelClosing}
        />
      )}

      {selectedFoodNode && (
        <FoodNodePanel
          node={selectedFoodNode}
          position={position}
          onStart={handleStartFood}
          onCollect={handleCollectFood}
          onClose={handleFoodPanelClose}
          isClosing={isFoodPanelClosing}
        />
      )}

      {(weeklyWalkOpen || isWeeklyWalkClosing) && (
        <WeeklyWalkPanel
          currentSteps={steps}
          onClose={handleWeeklyWalkClose}
          isClosing={isWeeklyWalkClosing}
        />
      )}

      {journalOpen && <JournalOverlay onClose={() => setJournalOpen(false)} />}
    </div>
  )
}
