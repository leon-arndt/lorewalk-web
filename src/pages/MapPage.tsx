import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { MapView, type MapViewState, type MarkerCreature } from '@/components/Map/MapView'
import { creatureSpriteKey } from '@/lib/creaturePreview'
import { PoiDetailPanel } from '@/components/UI/PoiDetailPanel'
import { FoodNodePanel } from '@/components/UI/FoodNodePanel'
import { ShrinePanel } from '@/components/UI/ShrinePanel'
import { WeeklyWalkPanel } from '@/components/UI/WeeklyWalkPanel'
import { NextGoalCard } from '@/components/UI/NextGoalCard'
import { pickNextGoal } from '@/lib/nextGoal'
import { JournalOverlay } from '@/components/UI/JournalOverlay'
import { NewsOverlay } from '@/components/UI/NewsOverlay'
import { useReward } from '@/contexts/RewardContext'
import { StepCounter } from '@/components/UI/StepCounter'
import { LevelCapsule } from '@/components/UI/LevelCapsule'
import { CoinCapsule } from '@/components/UI/CoinCapsule'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { usePlayerLocation } from '@/contexts/PlayerLocationContext'
import { usePois } from '@/hooks/usePois'
import { useNews, unreadCount } from '@/hooks/useNews'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { hudTag } from '@/lib/paper'
import { haversineDistance } from '@/lib/mapUtils'
import { dailyFor, isPoiLocked, isWeeklyWalkLocked, todayStr, WEEKLY_WALK_UNLOCK_LEVEL } from '@/lib/profile'
import { dailyFinds, FIND_PICKUP_RADIUS_M, poiTier, poisInView } from '@/lib/places'
import { getAmbience, onAmbienceChange } from '@/lib/ambience'
import { getFoodDef } from '@/data/foods'
import { creatureDefBySpecies } from '@/data/creatures'
import type { DailyFind, FindKind, HatchedCreature, Poi, RewardItem } from '@/types'
import { accent, categoryColors, indigo, paperLight, stamp, inkHint } from '@/lib/theme'
import { motion } from 'motion/react'
import { popSpring } from '@/lib/motion'

const CHECKIN_RADIUS_M = 50

// The camera reports its middle in steps of about 330 m, and the player in steps
// of about 110 m, so the nearby pins, finds, and food do not change on each frame.
const VIEW_STEP_DEG = 0.003
const FOCUS_STEP_DEG = 0.001
function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

const FIND_EMOJI: Record<FindKind, string> = { day: '✨', night: '🌙', rain: '☔' }
const FIND_LABEL = { day: 'find_label_day', night: 'find_label_night', rain: 'find_label_rain' } as const

// The parts of the sky that change what the map offers, plus the Singapore day.
function readSky() {
  const a = getAmbience()
  return { night: a.night > 0.5, rain: a.rain > 0.15, day: todayStr() }
}

function categoryColor(category?: string): number {
  return (category && categoryColors[category]) || 0x94a3b8
}

const AMBIENT_SPECIES = ['Kampung Chicken', 'Asian Koel ♀', 'Cicada']

function markerCreature(c?: HatchedCreature): MarkerCreature {
  return c ? { emoji: c.emoji, key: creatureSpriteKey(c.species, c.isShiny) } : { emoji: '🐾', key: '' }
}

export function MapPage() {
  const { t } = useLocale()
  const { position, gpsError, gpsLoading, steps, distanceM } = usePlayerLocation()
  const { pois, places } = usePois()
  const { posts: newsPosts } = useNews()
  const { profile, visitedPois, addVisit, syncFoodNodes, collectFind, startFoodExpedition, collectFoodNode, busyCreatureIds, syncShrineNodes, startShrineExpedition, collectShrineNode } = useProfile()
  const { showReward, showToast } = useReward()
  const { mode } = useConnectionMode()
  const navigate = useNavigate()
  // The map stays mounted under every tab so it shows through their frosted
  // pages. Its HUD and panels only show on the map tab itself.
  const onMapTab = useLocation().pathname === '/'
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
  const [journalOpen, setJournalOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [bearing, setBearing] = useState(0)
  const compassResetRef = useRef<(() => void) | null>(null)
  const recenterRef = useRef<(() => void) | null>(null)
  const focusRef = useRef<((lat: number, lon: number) => void) | null>(null)
  const [cameraAway, setCameraAway] = useState(false)
  const [view, setView] = useState<MapViewState | null>(null)
  const [sky, setSky] = useState(readSky)

  const handleViewChange = useCallback((v: MapViewState) => {
    const next = { lat: snap(v.lat, VIEW_STEP_DEG), lon: snap(v.lon, VIEW_STEP_DEG), zoom: Math.floor(v.zoom) }
    setView((prev) => (prev && prev.lat === next.lat && prev.lon === next.lon && prev.zoom === next.zoom ? prev : next))
  }, [])

  useEffect(() => {
    const update = () => {
      const next = readSky()
      setSky((prev) => (prev.night === next.night && prev.rain === next.rain && prev.day === next.day ? prev : next))
    }
    const off = onAmbienceChange(update)
    const tick = setInterval(update, 60_000)
    return () => { off(); clearInterval(tick) }
  }, [])

  // Where the nearby things gather: the player, or the middle of the map
  // without a GPS fix.
  const focusLat = position ? snap(position.latitude, FOCUS_STEP_DEG) : view?.lat ?? null
  const focusLon = position ? snap(position.longitude, FOCUS_STEP_DEG) : view?.lon ?? null
  const focus = useMemo(
    () => (focusLat !== null && focusLon !== null ? { lat: focusLat, lon: focusLon } : null),
    [focusLat, focusLon],
  )

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
      .map((id) => {
        const c = byId.get(id)
        const def = c && creatureDefBySpecies(c.species)
        return {
          id,
          color: def?.color ?? categoryColor(c?.poiCategory),
          category: c?.poiCategory,
          shiny: c?.isShiny,
          hat: def?.hat,
          body: def?.body,
          color2: def?.color2,
        }
      })
    if (members.length > 0) return members
    // The ambient wanderers are the neighbourhood regulars: a kampung chicken,
    // a koel, and a cicada.
    return AMBIENT_SPECIES.map((species, i) => {
      const def = creatureDefBySpecies(species)!
      return { id: `ambient-${i}`, color: def.color, color2: def.color2, body: def.body }
    })
  }, [profile.squads, profile.activeSquadId, profile.hatchedCreatures, busyCreatureIds])

  const foodNodeMarkers = useMemo(
    () => {
      const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
      return profile.foodNodes.map((n) => {
        const def = getFoodDef(n.foodId)
        const state: 'idle' | 'busy' | 'ready' = !n.expedition
          ? 'idle'
          : Date.now() >= new Date(n.expedition.returnsAt).getTime() ? 'ready' : 'busy'
        const travelers = n.expedition ? n.expedition.creatureIds.map((id) => markerCreature(byId.get(id))) : []
        return { id: n.id, foodId: n.foodId, emoji: def?.emoji ?? '🍜', name: def?.name ?? 'Food', lat: n.lat, lon: n.lon, state, travelers }
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
        const travelers = n.expedition ? n.expedition.creatureIds.map((id) => markerCreature(byId.get(id))) : []
        return { id: n.id, name: n.poiName, lat: n.lat, lon: n.lon, state, travelers }
      })
    },
    [profile.shrineNodes, profile.hatchedCreatures],
  )

  const selectedShrineNode = useMemo(
    () => profile.shrineNodes.find((n) => n.id === selectedShrineNodeId) ?? null,
    [profile.shrineNodes, selectedShrineNodeId],
  )

  // Shrines stand at landmarks only, not at a marker or a spot.
  const landmarks = useMemo(() => pois.filter((p) => poiTier(p) === 'landmark' && p.kind === 'permanent'), [pois])
  useEffect(() => {
    if (landmarks.length > 0) syncShrineNodes(landmarks)
  }, [landmarks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Food shows at the hawker centres and kopitiams near the focus, and the set
  // changes each day. The sync waits one task: a check-in in the same GPS fix
  // saves the profile first, and the sync must build on that save, not replace it.
  const syncFoodRef = useRef(syncFoodNodes)
  useEffect(() => { syncFoodRef.current = syncFoodNodes })
  const foodSpots = places?.foodSpots
  const foodDone = dailyFor(profile, sky.day).foodSpots.length
  useEffect(() => {
    if (!foodSpots || !focus) return
    const timer = setTimeout(() => syncFoodRef.current(foodSpots, focus), 0)
    return () => clearTimeout(timer)
  }, [foodSpots, focus, sky.day, foodDone])

  const finds = useMemo(
    () => (places && focus ? dailyFinds(places, focus, sky.day, sky, dailyFor(profile, sky.day).finds) : []),
    [places, focus, sky, profile.daily], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const findMarkers = useMemo(
    () => finds.map((f) => ({ id: f.id, emoji: FIND_EMOJI[f.kind], name: t(FIND_LABEL[f.kind]), lat: f.lat, lon: f.lon })),
    [finds, t],
  )

  const takeFind = useCallback((find: DailyFind) => {
    if (!collectFind(find)) return
    const food = find.foodId ? getFoodDef(find.foodId)?.name : undefined
    showToast(food
      ? t('find_toast_food', { food, coins: find.coins })
      : t('find_toast_coins', { coins: find.coins }))
  }, [collectFind, showToast, t])

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
        creatures: s.slots
          .filter((id): id is string => !!id)
          .map((id) => markerCreature(byId.get(id))),
        lat: s.expedition!.lat,
        lon: s.expedition!.lon,
        isActive: profile.activeSquadId === s.id,
        ready: now >= new Date(s.expedition!.returnsAt).getTime(),
      }))
  }, [profile.squads, profile.hatchedCreatures, profile.activeSquadId])

  // Tracks POIs already auto-checked-in this session to prevent double-firing
  // while position keeps updating inside the radius.
  const autoCheckedRef = useRef<Set<string>>(new Set())

  const checkIn = useCallback((poi: Poi) => {
    const result = addVisit(poi)
    if (!result) return
    const items: RewardItem[] = [{ type: 'xp', amount: result.xp }]
    if (result.egg) items.push({ type: 'egg' })
    if (result.trailCoins) items.push({ type: 'coins', amount: result.trailCoins })
    const subtitle = result.trailCoins && poi.trail ? t('trail_complete', { area: poi.trail.area }) : poi.name
    showReward({ emoji: '📍', title: t('checkin_reward_title'), subtitle, items })
  }, [addVisit, showReward, t])

  // Online: auto check-in whenever position enters 50 m of an unvisited POI.
  useEffect(() => {
    if (mode !== 'online' || !position) return
    for (const poi of pois) {
      if (visitedPois.has(poi.id) || autoCheckedRef.current.has(poi.id)) continue
      const d = haversineDistance(position.latitude, position.longitude, poi.lat, poi.lon)
      if (d <= CHECKIN_RADIUS_M) {
        autoCheckedRef.current.add(poi.id)
        if (isPoiLocked(poi, profile)) {
          showToast(t('toast_poi_premium_locked', { name: poi.name }))
          continue
        }
        // One per fix: a second addVisit from the same profile snapshot would
        // overwrite the first. The next fix picks up any other POI in range.
        checkIn(poi)
        return
      }
    }
    // A find comes after the check-ins for the same reason: one save per fix.
    const find = finds.find((f) =>
      haversineDistance(position.latitude, position.longitude, f.lat, f.lon) <= FIND_PICKUP_RADIUS_M)
    if (find) takeFind(find)
  }, [position, pois, finds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Offline has no GPS rule, so a tap picks the find up. Online, the player walks to it.
  const handleFindClick = useCallback((id: string) => {
    const find = finds.find((f) => f.id === id)
    if (!find) return
    const dist = position
      ? Math.round(haversineDistance(position.latitude, position.longitude, find.lat, find.lon))
      : null
    if (mode === 'offline' || (dist !== null && dist <= FIND_PICKUP_RADIUS_M)) takeFind(find)
    else if (dist !== null) showToast(t('find_walk_closer', { radius: FIND_PICKUP_RADIUS_M, dist }))
  }, [finds, position, mode, takeFind, showToast, t])

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
      checkIn(poi)
    }
  }, [mode, visitedPois, checkIn, profile])

  // The "next stop" bar: a ready reward first, then the nearest open landmark.
  const readySquadName = squadMarkers.find((m) => m.ready)?.name ?? null
  const nextGoal = useMemo(
    () => pickNextGoal({ profile, readySquadName, pois, visitedPois, position }),
    [profile, readySquadName, pois, visitedPois, position],
  )
  const walkLocked = isWeeklyWalkLocked(profile)
  const panelOpen = !!selectedPoi || !!selectedFoodNodeId || !!selectedShrineNodeId || weeklyWalkOpen

  const goalPoi = nextGoal?.kind === 'poi' && !panelOpen ? nextGoal.poi : null
  const goalPoint = useMemo(() => (goalPoi ? { lat: goalPoi.lat, lon: goalPoi.lon } : null), [goalPoi])

  // The pins on the map: every landmark, plus the small places near the middle
  // of the screen. The next stop and the open place always keep their pin.
  const pinnedPoi = selectedPoi ?? goalPoi
  const visiblePois = useMemo(() => poisInView(pois, view, pinnedPoi), [pois, view, pinnedPoi])

  // The trail of the week: its area, and how many of its stops the player has.
  const trail = useMemo(() => {
    const stops = pois.filter((p) => p.trail)
    if (stops.length === 0) return null
    return { area: stops[0].trail!.area, stops, done: stops.filter((s) => visitedPois.has(s.id)).length }
  }, [pois, visitedPois])

  // Shows the nearest open stop and its panel. As with the next stop bar, it
  // does not check in.
  const handleTrail = useCallback(() => {
    if (!trail) return
    const open = trail.stops.filter((s) => !visitedPois.has(s.id))
    if (open.length === 0) return
    const m = (s: Poi) => (position ? haversineDistance(position.latitude, position.longitude, s.lat, s.lon) : 0)
    const stop = open.reduce((best, s) => (m(s) < m(best) ? s : best))
    focusRef.current?.(stop.lat, stop.lon)
    if (panelCloseTimer.current) { clearTimeout(panelCloseTimer.current); panelCloseTimer.current = null }
    setIsPanelClosing(false)
    setSelectedPoi(stop)
    setSelectedFoodNodeId(null)
    setSelectedShrineNodeId(null)
  }, [trail, visitedPois, position])

  const handleGoal = useCallback(() => {
    if (!nextGoal) return
    if (nextGoal.kind === 'egg') navigate('/creatures')
    else if (nextGoal.kind === 'squad') navigate('/squads')
    else if (nextGoal.kind === 'chest') navigate('/profile')
    else {
      // Shows the landmark and its panel. It does not check in, in any mode:
      // the player still has to walk there, or tap the pin in offline mode.
      focusRef.current?.(nextGoal.poi.lat, nextGoal.poi.lon)
      if (panelCloseTimer.current) { clearTimeout(panelCloseTimer.current); panelCloseTimer.current = null }
      setIsPanelClosing(false)
      setSelectedPoi(nextGoal.poi)
    }
  }, [nextGoal, navigate])

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
      const items: RewardItem[] = [
        { type: 'xp', amount: result.xp },
        { type: 'coins', amount: result.coins },
      ]
      if (result.egg) items.push({ type: 'egg' })
      result.levelUps.forEach((lu) => items.push({ type: 'level_up', amount: lu.newLevel, label: lu.species }))
      showReward(result.won
        ? { emoji: '⛩️', spriteId: 'item_shrine', title: t('shrine_claimed_title'), subtitle: t('shrine_claimed_subtitle'), items }
        : { emoji: '⛩️', spriteId: 'item_shrine', title: t('shrine_defeated_title'), subtitle: t('shrine_defeated_subtitle'), items })
    }
    handleShrinePanelClose()
  }, [selectedShrineNodeId, collectShrineNode, handleShrinePanelClose, showReward, t])

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
      const items: RewardItem[] = [
        { type: 'food', label: result.food.name, emoji: result.food.emoji, spriteId: `food_${result.food.id}` },
      ]
      result.levelUps.forEach((lu) => items.push({ type: 'level_up', amount: lu.newLevel, label: lu.species }))
      showReward({
        emoji: result.food.emoji,
        spriteId: `food_${result.food.id}`,
        title: t('food_expedition_complete_title'),
        subtitle: t('food_expedition_complete_subtitle', { food: result.food.name }),
        items,
      })
    }
    handleFoodPanelClose()
  }, [selectedFoodNodeId, collectFoodNode, handleFoodPanelClose, showReward, t])
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView
        position={position}
        appearance={profile.appearance}
        pois={visiblePois}
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
        findMarkers={findMarkers}
        onFindClick={handleFindClick}
        onViewChange={handleViewChange}
        onBearingChange={setBearing}
        compassResetRef={compassResetRef}
        onAwayChange={setCameraAway}
        recenterRef={recenterRef}
        focusRef={focusRef}
        goal={goalPoint}
        paused={!onMapTab}
      />

      <div hidden={!onMapTab}>
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-start',
        }}>
          <div style={{ pointerEvents: 'auto', justifySelf: 'start' }}>
            <LevelCapsule level={profile.level} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* Today's steps. A tap opens the journal with the month calendar. */}
            <button
              type="button"
              onClick={() => setJournalOpen(true)}
              aria-label={t('journal_open')}
              style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', WebkitTapHighlightColor: 'transparent' }}
            >
              <StepCounter steps={steps} distanceM={distanceM} />
            </button>
            {gpsLoading && (
              <div style={{
                ...hudTag, color: '#6A5843', fontSize: 12,
                padding: '4px 10px',
              }}>
                {t('hud_locating')}
              </div>
            )}
            {gpsError && !position && (
              <div style={{
                ...hudTag,
                borderColor: '#A8361F',
                color: '#A8361F', fontSize: 12,
                padding: '4px 10px',
              }}>
                {t('hud_gps_unavailable')}
              </div>
            )}
            {trail && trail.done < trail.stops.length && (
              <button
                type="button"
                data-testid="trail-chip"
                onClick={handleTrail}
                style={{
                  ...hudTag, pointerEvents: 'auto', cursor: 'pointer',
                  minHeight: 32, padding: '4px 10px', fontSize: 12, fontFamily: 'inherit',
                  borderColor: indigo, color: indigo,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {t('trail_chip', { area: trail.area, done: trail.done, total: trail.stops.length })}
              </button>
            )}
          </div>
          <div style={{ pointerEvents: 'auto', justifySelf: 'end' }}>
            <CoinCapsule />
          </div>
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
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={popSpring}
            onClick={() => compassResetRef.current?.()}
            title={t('map_reset_to_north')}
            style={{
              width: 44, height: 44, borderRadius: 10, padding: 0,
              ...hudTag,
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
              <polygon points="0,-11 -5.5,0 5.5,0" fill="#A8361F" />
              <polygon points="0,11 -5.5,0 5.5,0" fill="white" stroke="#CDBF9F" strokeWidth="0.5" />
              <circle r="2" fill="#33281E" />
            </svg>
          </motion.button>
          </div>
        )}

        {/* Recenter: only once the player has moved the camera away from
            their avatar. The camera does not follow the player until then. */}
        {cameraAway && (
          <div style={{ alignSelf: 'flex-end', pointerEvents: 'auto' }}>
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={popSpring}
            onClick={() => recenterRef.current?.()}
            aria-label={t('map_recenter')}
            title={t('map_recenter')}
            style={{
              width: 44, height: 44, borderRadius: 10, padding: 0,
              ...hudTag,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" style={{ display: 'block' }}>
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.6" fill={accent} stroke="none" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </motion.button>
          </div>
        )}
      </div>

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

      {/* The next thing to do: a slim bar above the two bottom buttons. It hides
          while a panel is open, because the panel covers this part of the map. */}
      {nextGoal && !panelOpen && (
        <div style={{
          position: 'absolute', left: 16, right: 16, zIndex: 8,
          bottom: 'calc(env(safe-area-inset-bottom) + 140px)',
        }}>
          <NextGoalCard goal={nextGoal} onAct={handleGoal} />
        </div>
      )}

      {/* Weekly walk floating button - bottom left above nav */}
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...popSpring, delay: 0.25 }}
        onClick={walkLocked
          ? () => showToast(t('weekly_walk_locked', { level: WEEKLY_WALK_UNLOCK_LEVEL }))
          : handleWeeklyWalkOpen}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          left: 16,
          display: 'flex', alignItems: 'center', gap: 7,
          minHeight: 44, padding: '0 13px 0 8px',
          ...hudTag,
          background: 'rgba(198,230,218,0.78)',
          ...(profile.weeklyWalk && !profile.weeklyWalk.rewardClaimed && {
            background: stamp, borderColor: stamp, color: paperLight,
          }),
          ...(walkLocked && { background: 'rgba(226,211,174,0.8)', color: inkHint, borderColor: inkHint }),
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
          zIndex: 8,
        }}
      >
        {walkLocked ? (
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 2px' }}>
            <rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        ) : (
          <EmojiSprite id="item_sneaker" emoji="🚶" size={22} />
        )}
        <span>{t('weekly_walk_button')}</span>
        {profile.tickets > 0 && !profile.weeklyWalk && !walkLocked && (
          <span style={{
            background: accent, color: paperLight,
            borderRadius: 6, fontSize: 11, fontWeight: 600,
            padding: '1px 6px', marginLeft: 2,
          }}>
            {profile.tickets}🎟️
          </span>
        )}
      </motion.button>

      {/* News - bottom right, mirroring the weekly walk button on the left.
          Kept as a compact icon so a long localized "Weekly Walk" label can
          never collide with it. */}
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...popSpring, delay: 0.35 }}
        onClick={() => setNewsOpen(true)}
        aria-label={t('news_open')}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          right: 16,
          width: 44, height: 44, padding: 0,
          ...hudTag,
          background: 'rgba(243,220,154,0.8)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
          zIndex: 8,
        }}
      >
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5z" /><path d="M17 9h3v8a2 2 0 0 1-2 2" /><path d="M8 9h5" /><path d="M8 13h5" />
        </svg>
        {unreadCount(newsPosts, profile.lastReadNewsAt) > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 9, height: 9, borderRadius: '50%',
            background: stamp, border: `1.5px solid ${paperLight}`,
          }} />
        )}
      </motion.button>

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

      {newsOpen && <NewsOverlay onClose={() => setNewsOpen(false)} />}
      </div>
    </div>
  )
}
