import { createContext, useContext, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Claim, ExpeditionCollectResult, ExpeditionTarget, HatchedCreature, PlayerProfile, Poi, SquadExpedition } from '@/types'
import {
  loadProfile, saveProfile,
  applyXp, updateStreak, checkAchievements,
  createEgg, createEggFor, advanceEggs, hatchEgg,
  affinityMultiplier, isAway, hasReturned, rollExpeditionPayout, claimPendingCoins,
  creatureCap, creatureSlotsCost, eggSlotCost, CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
  EXPEDITION_EGG_CHANCE,
} from '@/lib/profile'

interface ProfileContextValue {
  profile: PlayerProfile
  visitedPois: Set<string>
  addVisit: (poi: Poi) => void
  setDisplayName: (name: string) => void
  justHatched: HatchedCreature[]
  clearJustHatched: () => void
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
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile)
  const [justHatched, setJustHatched] = useState<HatchedCreature[]>([])

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

    // Advance all active eggs; split newly-hatched from still-incubating
    const { incubating, hatched } = advanceEggs(profile.eggs)

    // Only hatch as many as the creature cap allows; the rest stay as ready eggs
    // (they hatch once you make room — release a creature or buy storage).
    const cap = creatureCap(level, profile.bonusCreatureSlots)
    const available = Math.max(0, cap - profile.hatchedCreatures.length)
    const newCreatures = hatched.slice(0, available).map(hatchEgg)
    const blockedEggs = hatched.slice(available) // already at visitsRequired = ready

    // Award a new egg from this POI if a slot is available
    const carriedEggs = [...incubating, ...blockedEggs]
    const updatedEggs =
      carriedEggs.length < profile.maxEggSlots
        ? [...carriedEggs, createEgg(poi)]
        : carriedEggs

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
      hatchedCreatures: [...profile.hatchedCreatures, ...newCreatures],
    }

    setProfile(updated)
    saveProfile(updated)

    if (newCreatures.length > 0) setJustHatched(newCreatures)
  }

  function setDisplayName(name: string) {
    const updated = { ...profile, displayName: name.trim() || 'Explorer' }
    setProfile(updated)
    saveProfile(updated)
  }

  function clearJustHatched() {
    setJustHatched([])
  }

  function persist(updated: PlayerProfile) {
    setProfile(updated)
    saveProfile(updated)
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

  // Collect a returned expedition: award affinity-scaled XP + coins, roll for a
  // bonus egg (only if a slot is free), and bring the squad home. Returns the
  // reward summary, or null if it hasn't returned yet.
  function collectExpedition(squadId: string): ExpeditionCollectResult | null {
    const squad = profile.squads.find((s) => s.id === squadId)
    if (!squad?.expedition || !hasReturned(squad.expedition, Date.now())) return null

    const exp = squad.expedition
    const creaturesById = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
    const { xp, coins } = rollExpeditionPayout(squad, creaturesById)
    const { level, xp: newXp } = applyXp(profile.level, profile.xp, xp)

    const slotFree = profile.eggs.length < profile.maxEggSlots
    const gotEgg = slotFree && Math.random() < EXPEDITION_EGG_CHANCE
    const eggs = gotEgg
      ? [...profile.eggs, createEggFor(exp.poiId, exp.poiName, exp.poiCategory)]
      : profile.eggs

    // Finishing the expedition claims (or refreshes) that landmark for the player.
    const nowIso = new Date().toISOString()
    const newClaim: Claim = {
      poiId: exp.poiId, poiName: exp.poiName, poiCategory: exp.poiCategory,
      lat: exp.lat, lon: exp.lon,
      affinity: affinityMultiplier(squad, exp.poiCategory, creaturesById),
      claimedAt: nowIso, lastCollectedAt: nowIso,
    }
    const claims = [...profile.claims.filter((c) => c.poiId !== exp.poiId), newClaim]

    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition: null } : sq,
    )
    persist({
      ...profile,
      squads,
      eggs,
      claims,
      level,
      xp: newXp,
      totalXp: profile.totalXp + xp,
      coins: profile.coins + coins,
    })
    return { xp, coins, egg: gotEgg }
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

  function recallSquad(squadId: string) {
    const squads = profile.squads.map((sq) =>
      sq.id === squadId ? { ...sq, expedition: null } : sq,
    )
    persist({ ...profile, squads })
  }

  return (
    <ProfileContext.Provider value={{
      profile, visitedPois, addVisit, setDisplayName, justHatched, clearJustHatched,
      assignToSlot, clearSlot, setActiveSquad, renameSquad,
      startExpedition, collectExpedition, recallSquad, collectClaim,
      releaseCreature, buyCreatureSlots, buyEggSlot, addCoins,
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
