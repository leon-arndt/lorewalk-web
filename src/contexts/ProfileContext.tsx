import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Claim, ExpeditionCollectResult, ExpeditionTarget, FoodCollectResult, HatchedCreature, Postcard, PlayerProfile, Poi, ShrineCollectResult, ShrineNode, SquadExpedition } from '@/types'
import { getFoodDef } from '@/data/foods'
import {
  loadProfile, saveProfile,
  applyXp, updateStreak, checkAchievements,
  createEgg, createEggFor, advanceEggs, hatchEgg,
  affinityMultiplier, isAway, hasReturned, rollExpeditionPayout, claimPendingCoins,
  creatureCap, creatureSlotsCost, eggSlotCost, CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
  EXPEDITION_EGG_CHANCE, CREATURE_BASE_XP, applyCreatureXp,
  levelRewardsFor, applyLevelRewards, type LevelReward,
  spawnFoodNodes, makeFoodItem, POSTCARD_DELIVERY_MS,
  spawnShrineNodes, solveShrineResult, SHRINE_DURATION_MS,
} from '@/lib/profile'

interface ProfileContextValue {
  profile: PlayerProfile
  visitedPois: Set<string>
  addVisit: (poi: Poi) => void
  advanceEggsBySteps: (currentStepsToday: number) => void
  setDisplayName: (name: string) => void
  justHatched: HatchedCreature[]
  clearJustHatched: () => void
  pendingLevelUp: { level: number; rewards: LevelReward[] } | null
  dismissLevelUp: () => void
  assignToSlot: (squadId: string, slotIndex: number, creatureId: string) => void
  clearSlot: (squadId: string, slotIndex: number) => void
  setActiveSquad: (squadId: string) => void
  renameSquad: (squadId: string, name: string) => void
  syncFoodNodes: (pois: Poi[]) => void
  startExpedition: (squadId: string, target: ExpeditionTarget, durationMs: number) => void
  startFoodExpedition: (nodeId: string, creatureIds: string[], durationMs: number) => void
  collectFoodNode: (nodeId: string) => FoodCollectResult | null
  busyCreatureIds: Set<string>
  collectExpedition: (squadId: string) => ExpeditionCollectResult | null
  recallSquad: (squadId: string) => void
  collectClaim: (poiId: string) => number
  releaseCreature: (creatureId: string) => void
  buyCreatureSlots: () => boolean
  buyEggSlot: () => boolean
  addCoins: (amount: number) => void
  feedCreature: (creatureId: string, foodItemId: string) => void
  addXp: (amount: number) => void
  sendPostcard: (toPlayerId: string, toName: string, poi: { id: string; name: string; category: string }) => void
  openPostcard: (postcardId: string) => void
  seedMockPostcard: () => void
  syncShrineNodes: (pois: Poi[]) => void
  startShrineExpedition: (nodeId: string, creatureIds: string[]) => void
  collectShrineNode: (nodeId: string) => ShrineCollectResult | null
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile)
  const [justHatched, setJustHatched] = useState<HatchedCreature[]>([])
  const [pendingLevelUp, setPendingLevelUp] = useState<{ level: number; rewards: LevelReward[] } | null>(null)

  const visitedPois = useMemo(
    () => new Set(profile.visitHistory.map((v) => v.poiId)),
    [profile.visitHistory],
  )

  // Creatures currently away and unavailable for new food expeditions: those already
  // dispatched to a food node, plus members of any squad out on a POI expedition.
  const busyCreatureIds = useMemo(() => {
    const ids = new Set<string>()
    for (const n of profile.foodNodes) {
      if (n.expedition) n.expedition.creatureIds.forEach((id) => ids.add(id))
    }
    for (const s of profile.squads) {
      if (s.expedition) s.slots.forEach((id) => id && ids.add(id))
    }
    return ids
  }, [profile.foodNodes, profile.squads])

  function addVisit(poi: Poi) {
    if (visitedPois.has(poi.id)) return

    const category = poi.category ?? 'landmark'
    const creaturesById = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const activeSquad = profile.squads.find((s) => s.id === profile.activeSquadId)
    // A squad that's away on an expedition can't also boost live check-ins.
    const boostingSquad = activeSquad && !isAway(activeSquad) ? activeSquad : undefined
    const mult = affinityMultiplier(boostingSquad, category, creaturesById)
    const xpGained = Math.round((poi.points ?? 5) * mult)
    const { level, xp } = applyXp(profile.level, profile.xp, xpGained)
    const { streakDays, lastVisitDate } = updateStreak(profile.lastVisitDate, profile.streakDays)

    const newHistory = [
      {
        poiId: poi.id,
        poiName: poi.name,
        poiCategory: category,
        visitedAt: new Date().toISOString(),
        xpEarned: xpGained,
        lat: poi.lat,
        lon: poi.lon,
      },
      ...profile.visitHistory,
    ]

    const updatedAchievements = checkAchievements(
      profile.achievements,
      newHistory,
      level,
      streakDays,
    )

    // Award a new egg from this POI if a slot is available
    const updatedEggs =
      profile.eggs.length < profile.maxEggSlots
        ? [...profile.eggs, createEgg(poi)]
        : profile.eggs

    const updated: PlayerProfile = {
      ...profile,
      level,
      xp,
      totalXp: profile.totalXp + xpGained,
      visitHistory: newHistory,
      achievements: updatedAchievements,
      lastVisitDate,
      streakDays,
      eggs: updatedEggs,
    }

    const final = withLevelUpRewards(profile, updated)
    setProfile(final)
    saveProfile(final)
  }

  function setDisplayName(name: string) {
    const updated = { ...profile, displayName: name.trim() || 'Explorer' }
    setProfile(updated)
    saveProfile(updated)
  }

  // Advance incubating eggs by steps walked. Call with the current today's step count
  // each time it changes; handles daily resets by detecting when count decreases.
  function advanceEggsBySteps(currentStepsToday: number) {
    if (profile.eggs.length === 0) return
    const prev = profile.stepsAppliedToEggs
    // If count went down (new day), apply all of today's steps; otherwise apply delta.
    const delta = currentStepsToday <= prev ? currentStepsToday : currentStepsToday - prev
    if (delta <= 0) return

    const { incubating, hatched } = advanceEggs(profile.eggs, delta)
    const cap = creatureCap(profile.level, profile.bonusCreatureSlots)
    const available = Math.max(0, cap - profile.hatchedCreatures.length)
    const newCreatures = hatched.slice(0, available).map(hatchEgg)
    const blockedEggs = hatched.slice(available)

    const updated: PlayerProfile = {
      ...profile,
      stepsAppliedToEggs: currentStepsToday,
      eggs: [...incubating, ...blockedEggs],
      hatchedCreatures: [...profile.hatchedCreatures, ...newCreatures],
    }
    setProfile(updated)
    saveProfile(updated)
    if (newCreatures.length > 0) setJustHatched(newCreatures)
  }

  // Stable identity: consumers list this in effect deps (MapPage's hatch toast),
  // so recreating it each render would reset their timers on any profile change.
  const clearJustHatched = useCallback(() => {
    setJustHatched([])
  }, [])

  function persist(updated: PlayerProfile) {
    setProfile(updated)
    saveProfile(updated)
  }

  // If the player crossed a level boundary, collect rewards for every new level,
  // apply them to the profile, and queue the level-up screen.
  function withLevelUpRewards(before: PlayerProfile, after: PlayerProfile): PlayerProfile {
    if (after.level <= before.level) return after
    const allRewards: LevelReward[] = []
    for (let lvl = before.level + 1; lvl <= after.level; lvl++) {
      allRewards.push(...levelRewardsFor(lvl))
    }
    const rewardUpdates = applyLevelRewards(after, allRewards)
    setPendingLevelUp({ level: after.level, rewards: allRewards })
    return { ...after, ...rewardUpdates }
  }

  // Assign a creature to a slot, removing it from any slot it already occupies
  // (a creature can be in at most one slot across all squads).
  function assignToSlot(squadId: string, slotIndex: number, creatureId: string) {
    const squads = profile.squads.map((sq) => {
      const slots = sq.slots.map((id) => (id === creatureId ? null : id))
      if (sq.id === squadId) slots[slotIndex] = creatureId
      return { ...sq, slots }
    })
    persist({ ...profile, squads })
  }

  function clearSlot(squadId: string, slotIndex: number) {
    const squads = profile.squads.map((sq) =>
      sq.id === squadId
        ? { ...sq, slots: sq.slots.map((id, i) => (i === slotIndex ? null : id)) }
        : sq,
    )
    persist({ ...profile, squads })
  }

  function setActiveSquad(squadId: string) {
    persist({ ...profile, activeSquadId: squadId })
  }

  function renameSquad(squadId: string, name: string) {
    const trimmed = name.trim()
    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, name: trimmed || sq.name } : sq,
    )
    persist({ ...profile, squads })
  }

  function syncFoodNodes(pois: Poi[]) {
    const updated = spawnFoodNodes(pois, profile.foodNodes)
    const changed =
      updated.length !== profile.foodNodes.length ||
      updated.some((n, i) => {
        const old = profile.foodNodes[i]
        return !old || n.id !== old.id || n.lat !== old.lat || n.lon !== old.lon
      })
    if (changed) persist({ ...profile, foodNodes: updated })
  }

  // Dispatch a set of creatures (not a squad) to a food node, Pikmin-style.
  function startFoodExpedition(nodeId: string, creatureIds: string[], durationMs: number) {
    if (creatureIds.length === 0) return
    const node = profile.foodNodes.find((n) => n.id === nodeId)
    if (!node || node.expedition) return
    const now = Date.now()
    const foodNodes = profile.foodNodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            expedition: {
              creatureIds,
              startedAt: new Date(now).toISOString(),
              returnsAt: new Date(now + durationMs).toISOString(),
            },
          }
        : n,
    )
    persist({ ...profile, foodNodes })
  }

  // Collect a returned food expedition: award the food, grant the dispatched
  // creatures XP, and remove the node from the map.
  function collectFoodNode(nodeId: string): FoodCollectResult | null {
    const node = profile.foodNodes.find((n) => n.id === nodeId)
    if (!node?.expedition || Date.now() < new Date(node.expedition.returnsAt).getTime()) return null

    const def = getFoodDef(node.foodId)
    if (!def) return null

    const memberIds = new Set(node.expedition.creatureIds)
    const levelUps: Array<{ species: string; newLevel: number }> = []
    const hatchedCreatures = profile.hatchedCreatures.map((c) => {
      if (!memberIds.has(c.id)) return c
      const updated = applyCreatureXp(c, def.xp)
      if (updated.level > c.level) levelUps.push({ species: c.species, newLevel: updated.level })
      return updated
    })

    const foodInventory = [...profile.foodInventory, makeFoodItem(node.foodId)]
    const foodNodes = profile.foodNodes.filter((n) => n.id !== nodeId)
    persist({ ...profile, hatchedCreatures, foodInventory, foodNodes })
    return { food: { name: def.name, emoji: def.emoji }, levelUps }
  }

  function startExpedition(squadId: string, target: ExpeditionTarget, durationMs: number) {
    const squad = profile.squads.find((sq) => sq.id === squadId)
    if (!squad || !squad.slots.some(Boolean)) return
    const now = Date.now()
    const expedition: SquadExpedition = {
      ...target,
      startedAt: new Date(now).toISOString(),
      returnsAt: new Date(now + durationMs).toISOString(),
    }
    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition } : sq,
    )
    persist({ ...profile, squads })
  }

  // Collect a returned squad expedition: award XP/coins/egg and claim the landmark.
  function collectExpedition(squadId: string): ExpeditionCollectResult | null {
    const squad = profile.squads.find((s) => s.id === squadId)
    if (!squad?.expedition || !hasReturned(squad.expedition, Date.now())) return null

    const exp = squad.expedition
    const creaturesById = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const mult = affinityMultiplier(squad, exp.poiCategory, creaturesById)
    const { xp, coins } = rollExpeditionPayout(squad, creaturesById)
    const { level, xp: newXp } = applyXp(profile.level, profile.xp, xp)

    const creatureXp = Math.round(CREATURE_BASE_XP * mult)
    const squadMemberIds = new Set(squad.slots.filter(Boolean) as string[])
    const levelUps: Array<{ species: string; newLevel: number }> = []
    const hatchedCreatures = profile.hatchedCreatures.map((c) => {
      if (!squadMemberIds.has(c.id)) return c
      const updated = applyCreatureXp(c, creatureXp)
      if (updated.level > c.level) levelUps.push({ species: c.species, newLevel: updated.level })
      return updated
    })

    const squads = profile.squads.map((sq) => sq.id === squadId ? { ...sq, expedition: null } : sq)

    // Egg chance + claim landmark.
    const slotFree = profile.eggs.length < profile.maxEggSlots
    const gotEgg = slotFree && Math.random() < EXPEDITION_EGG_CHANCE
    const eggs = gotEgg ? [...profile.eggs, createEggFor(exp.poiId, exp.poiName, exp.poiCategory)] : profile.eggs
    const nowIso = new Date().toISOString()
    const newClaim: Claim = {
      poiId: exp.poiId, poiName: exp.poiName, poiCategory: exp.poiCategory,
      lat: exp.lat, lon: exp.lon, affinity: mult, claimedAt: nowIso, lastCollectedAt: nowIso,
    }
    const claims = [...profile.claims.filter((c) => c.poiId !== exp.poiId), newClaim]
    const built: PlayerProfile = {
      ...profile, squads, eggs, claims, hatchedCreatures,
      level, xp: newXp, totalXp: profile.totalXp + xp, coins: profile.coins + coins,
    }
    persist(withLevelUpRewards(profile, built))
    return { xp, coins, egg: gotEgg, food: null, levelUps }
  }

  // Collect coins a held landmark has accrued since its last collection.
  function collectClaim(poiId: string): number {
    const claim = profile.claims.find((c) => c.poiId === poiId)
    if (!claim) return 0
    const coins = claimPendingCoins(claim, Date.now())
    if (coins <= 0) return 0
    const claims = profile.claims.map((c) =>
      c.poiId === poiId ? { ...c, lastCollectedAt: new Date().toISOString() } : c,
    )
    persist({ ...profile, claims, coins: profile.coins + coins })
    return coins
  }

  // Release a creature (frees a storage slot); also pull it from any squad slot.
  function releaseCreature(creatureId: string) {
    const hatchedCreatures = profile.hatchedCreatures.filter((c) => c.id !== creatureId)
    const squads = profile.squads.map((sq) => ({
      ...sq,
      slots: sq.slots.map((id) => (id === creatureId ? null : id)),
    }))
    persist({ ...profile, hatchedCreatures, squads })
  }

  // ── Shop ──────────────────────────────────────────────────────────────────
  function buyCreatureSlots(): boolean {
    const cost = creatureSlotsCost(profile.bonusCreatureSlots)
    if (profile.coins < cost) return false
    persist({
      ...profile,
      coins: profile.coins - cost,
      bonusCreatureSlots: profile.bonusCreatureSlots + CREATURE_SLOT_CHUNK,
    })
    return true
  }

  function buyEggSlot(): boolean {
    if (profile.maxEggSlots >= MAX_EGG_SLOTS_CAP) return false
    const cost = eggSlotCost(profile.maxEggSlots)
    if (profile.coins < cost) return false
    persist({ ...profile, coins: profile.coins - cost, maxEggSlots: profile.maxEggSlots + 1 })
    return true
  }

  // Credit purchased coins. NOTE: real money flows through Google Play Billing
  // (Digital Goods API in a TWA); this just applies the granted amount.
  function addCoins(amount: number) {
    persist({ ...profile, coins: profile.coins + amount })
  }

  function feedCreature(creatureId: string, foodItemId: string) {
    const item = profile.foodInventory.find((f) => f.id === foodItemId)
    if (!item) return
    const def = getFoodDef(item.foodId)
    if (!def) return
    const hatchedCreatures = profile.hatchedCreatures.map((c) =>
      c.id === creatureId ? applyCreatureXp(c, def.xp) : c,
    )
    const foodInventory = profile.foodInventory.filter((f) => f.id !== foodItemId)
    const FEED_PLAYER_XP = 5
    const { level, xp } = applyXp(profile.level, profile.xp, FEED_PLAYER_XP)
    const before = profile
    const built: PlayerProfile = {
      ...profile, hatchedCreatures, foodInventory,
      level, xp, totalXp: profile.totalXp + FEED_PLAYER_XP,
    }
    persist(withLevelUpRewards(before, built))
  }

  function recallSquad(squadId: string) {
    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition: null } : sq,
    )
    persist({ ...profile, squads })
  }

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), [])

  function addXp(amount: number) {
    const { level, xp } = applyXp(profile.level, profile.xp, amount)
    const updated = { ...profile, level, xp, totalXp: profile.totalXp + amount }
    persist(withLevelUpRewards(profile, updated))
  }

  function sendPostcard(toPlayerId: string, toName: string, poi: { id: string; name: string; category: string }) {
    const activeSquad = profile.squads.find((s) => s.id === profile.activeSquadId)
    const firstCreatureId = activeSquad?.slots.find(Boolean)
    const creature = firstCreatureId ? profile.hatchedCreatures.find((c) => c.id === firstCreatureId) : null
    const now = Date.now()
    const card: Postcard = {
      id: `pc_${now}_${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: profile.id,
      fromName: profile.displayName,
      toPlayerId,
      toName,
      poiId: poi.id,
      poiName: poi.name,
      poiCategory: poi.category,
      creatureEmoji: creature?.emoji ?? '✨',
      sentAt: new Date(now).toISOString(),
      deliverAt: new Date(now + POSTCARD_DELIVERY_MS).toISOString(),
      openedAt: null,
    }
    persist({ ...profile, outbox: [...profile.outbox, card] })
  }

  function openPostcard(postcardId: string) {
    const card = profile.postcards.find((p) => p.id === postcardId)
    if (!card || card.openedAt) return
    const { level, xp } = applyXp(profile.level, profile.xp, 10)
    const postcards = profile.postcards.map((p) =>
      p.id === postcardId ? { ...p, openedAt: new Date().toISOString() } : p,
    )
    const built: PlayerProfile = { ...profile, postcards, level, xp, totalXp: profile.totalXp + 10 }
    persist(withLevelUpRewards(profile, built))
  }

  function seedMockPostcard() {
    const mockSenders = ['Aisha', 'Rajan', 'Wei Ling']
    const mockPois = ['Merlion Park', 'Gardens by the Bay', 'Raffles Hotel']
    const mockEmojis = ['🗿', '🌿', '🧭']
    const i = profile.postcards.length % 3
    const now = Date.now()
    const card: Postcard = {
      id: `pc_mock_${now}`,
      fromPlayerId: `mock_${i}`,
      fromName: mockSenders[i],
      toPlayerId: profile.id,
      toName: profile.displayName,
      poiId: `sg-00${i + 1}`,
      poiName: mockPois[i],
      poiCategory: 'landmark',
      creatureEmoji: mockEmojis[i],
      sentAt: new Date(now - POSTCARD_DELIVERY_MS - 1000).toISOString(),
      deliverAt: new Date(now + (import.meta.env.DEV ? 30_000 : POSTCARD_DELIVERY_MS)).toISOString(),
      openedAt: null,
    }
    persist({ ...profile, postcards: [...profile.postcards, card] })
  }

  function syncShrineNodes(pois: Poi[]) {
    const updated = spawnShrineNodes(pois, profile.shrineNodes)
    const changed =
      updated.length !== profile.shrineNodes.length ||
      updated.some((n, i) => n.id !== profile.shrineNodes[i]?.id)
    if (changed) persist({ ...profile, shrineNodes: updated })
  }

  function startShrineExpedition(nodeId: string, creatureIds: string[]) {
    const node = profile.shrineNodes.find((n) => n.id === nodeId)
    if (!node || node.expedition) return
    const now = Date.now()
    const expedition = {
      creatureIds,
      power: creatureIds.reduce((sum, id) => {
        const c = profile.hatchedCreatures.find((x) => x.id === id)
        return sum + (c ? c.level * 5 : 0)
      }, 0),
      startedAt: new Date(now).toISOString(),
      returnsAt: new Date(now + SHRINE_DURATION_MS).toISOString(),
    }
    const shrineNodes = profile.shrineNodes.map((n) =>
      n.id === nodeId ? { ...n, expedition } : n,
    )
    persist({ ...profile, shrineNodes })
  }

  function collectShrineNode(nodeId: string): ShrineCollectResult | null {
    const node = profile.shrineNodes.find((n) => n.id === nodeId)
    const exp = node?.expedition
    if (!exp || Date.now() < new Date(exp.returnsAt).getTime()) return null
    const participants = exp.creatureIds
      .map((id) => profile.hatchedCreatures.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c)
    const result = solveShrineResult(exp.power, node!.difficulty, participants)
    const { level, xp: newXp } = applyXp(profile.level, profile.xp, result.xp)
    const hatchedCreatures = profile.hatchedCreatures.map((c) => {
      if (!exp.creatureIds.includes(c.id)) return c
      return applyCreatureXp(c, result.won ? 20 : 5)
    })
    const eggs = result.egg
      ? [...profile.eggs, createEggFor(node!.poiId, node!.poiName, node!.poiCategory)]
      : profile.eggs
    const clearedUntil = result.won
      ? new Date(Date.now() + 24 * 3_600_000).toISOString()
      : null
    const shrineNodes = profile.shrineNodes.map((n) =>
      n.id === nodeId ? { ...n, expedition: null, clearedUntil } : n,
    )
    const built: PlayerProfile = {
      ...profile, shrineNodes, hatchedCreatures, eggs,
      level, xp: newXp, totalXp: profile.totalXp + result.xp,
      coins: profile.coins + result.coins,
    }
    persist(withLevelUpRewards(profile, built))
    return { ...result, levelUps: result.levelUps }
  }

  return (
    <ProfileContext.Provider value={{
      profile, visitedPois, addVisit, advanceEggsBySteps, setDisplayName, justHatched, clearJustHatched,
      pendingLevelUp, dismissLevelUp,
      assignToSlot, clearSlot, setActiveSquad, renameSquad,
      syncFoodNodes, startExpedition, startFoodExpedition, collectFoodNode, busyCreatureIds, collectExpedition, recallSquad, collectClaim,
      releaseCreature, buyCreatureSlots, buyEggSlot, addCoins, feedCreature, addXp,
      sendPostcard, openPostcard, seedMockPostcard,
      syncShrineNodes, startShrineExpedition, collectShrineNode,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
