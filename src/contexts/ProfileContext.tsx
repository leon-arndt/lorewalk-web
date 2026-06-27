import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Claim, ExpeditionCollectResult, ExpeditionTarget, HatchedCreature, PlayerProfile, Poi, SquadExpedition } from '@/types'
import { getFoodDef } from '@/data/foods'
import {
  loadProfile, saveProfile,
  applyXp, updateStreak, checkAchievements,
  createEgg, createEggFor, advanceEggs, hatchEgg,
  affinityMultiplier, isAway, hasReturned, rollExpeditionPayout, claimPendingCoins,
  creatureCap, creatureSlotsCost, eggSlotCost, CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
  EXPEDITION_EGG_CHANCE, CREATURE_BASE_XP, applyCreatureXp,
  levelRewardsFor, applyLevelRewards, type LevelReward,
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
  startExpedition: (squadId: string, target: ExpeditionTarget, durationMs: number) => void
  collectExpedition: (squadId: string) => ExpeditionCollectResult | null
  recallSquad: (squadId: string) => void
  collectClaim: (poiId: string) => number
  releaseCreature: (creatureId: string) => void
  buyCreatureSlots: () => boolean
  buyEggSlot: () => boolean
  addCoins: (amount: number) => void
  feedCreature: (creatureId: string, foodItemId: string) => void
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

  // Collect a returned expedition: award affinity-scaled XP + coins, level up squad
  // creatures, roll for a bonus egg (only if a slot is free), and bring the squad home.
  function collectExpedition(squadId: string): ExpeditionCollectResult | null {
    const squad = profile.squads.find((s) => s.id === squadId)
    if (!squad?.expedition || !hasReturned(squad.expedition, Date.now())) return null

    const exp = squad.expedition
    const creaturesById = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const mult = affinityMultiplier(squad, exp.poiCategory, creaturesById)
    const { xp, coins, food: foodItem } = rollExpeditionPayout(squad, creaturesById)
    const { level, xp: newXp } = applyXp(profile.level, profile.xp, xp)

    // Award creature XP to every squad member, scaled by the same affinity multiplier.
    const creatureXp = Math.round(CREATURE_BASE_XP * mult)
    const squadMemberIds = new Set(squad.slots.filter(Boolean) as string[])
    const levelUps: Array<{ species: string; newLevel: number }> = []
    const hatchedCreatures = profile.hatchedCreatures.map((c) => {
      if (!squadMemberIds.has(c.id)) return c
      const updated = applyCreatureXp(c, creatureXp)
      if (updated.level > c.level) levelUps.push({ species: c.species, newLevel: updated.level })
      return updated
    })

    const slotFree = profile.eggs.length < profile.maxEggSlots
    const gotEgg = slotFree && Math.random() < EXPEDITION_EGG_CHANCE
    const eggs = gotEgg
      ? [...profile.eggs, createEggFor(exp.poiId, exp.poiName, exp.poiCategory)]
      : profile.eggs

    const foodInventory = [...profile.foodInventory, foodItem]
    const foodDef = getFoodDef(foodItem.foodId)

    // Finishing the expedition claims (or refreshes) that landmark for the player.
    const nowIso = new Date().toISOString()
    const newClaim: Claim = {
      poiId: exp.poiId, poiName: exp.poiName, poiCategory: exp.poiCategory,
      lat: exp.lat, lon: exp.lon,
      affinity: mult,
      claimedAt: nowIso, lastCollectedAt: nowIso,
    }
    const claims = [...profile.claims.filter((c) => c.poiId !== exp.poiId), newClaim]

    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition: null } : sq,
    )
    const built: PlayerProfile = {
      ...profile,
      squads,
      eggs,
      claims,
      hatchedCreatures,
      foodInventory,
      level,
      xp: newXp,
      totalXp: profile.totalXp + xp,
      coins: profile.coins + coins,
    }
    persist(withLevelUpRewards(profile, built))
    return { xp, coins, egg: gotEgg, food: foodDef ? { name: foodDef.name, emoji: foodDef.emoji } : null, levelUps }
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
    persist({ ...profile, hatchedCreatures, foodInventory })
  }

  function recallSquad(squadId: string) {
    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition: null } : sq,
    )
    persist({ ...profile, squads })
  }

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), [])

  return (
    <ProfileContext.Provider value={{
      profile, visitedPois, addVisit, advanceEggsBySteps, setDisplayName, justHatched, clearJustHatched,
      pendingLevelUp, dismissLevelUp,
      assignToSlot, clearSlot, setActiveSquad, renameSquad,
      startExpedition, collectExpedition, recallSquad, collectClaim,
      releaseCreature, buyCreatureSlots, buyEggSlot, addCoins, feedCreature,
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
