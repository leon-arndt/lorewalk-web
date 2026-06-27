import type { Achievement, Claim, Egg, EggTier, FoodItem, HatchedCreature, PlayerProfile, Poi, Squad, SquadExpedition, VisitRecord } from '@/types'
import { randomFood } from '@/data/foods'

// XP needed to go from level N to level N+1
export function xpForNextLevel(level: number): number {
  return level * 100
}

// Apply XP gain, handle level-ups, return updated level + xp
export function applyXp(currentLevel: number, currentXp: number, gained: number) {
  let level = currentLevel
  let xp = currentXp + gained

  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level)
    level++
  }

  return { level, xp }
}

// ─── Creature level system ────────────────────────────────────────────────────

export const CREATURE_BASE_XP = 10
export const CREATURE_LEVEL_CAP = 20

export function xpForCreatureLevel(level: number): number {
  return level * 20
}

export function applyCreatureXp(creature: HatchedCreature, gained: number): HatchedCreature {
  if (creature.level >= CREATURE_LEVEL_CAP) return creature
  let level = creature.level
  let xp = creature.xp + gained
  while (level < CREATURE_LEVEL_CAP && xp >= xpForCreatureLevel(level)) {
    xp -= xpForCreatureLevel(level)
    level++
  }
  if (level >= CREATURE_LEVEL_CAP) xp = 0
  return { ...creature, level, xp }
}

// Streak: did the player also visit yesterday?
// Calendar days are anchored to Singapore time (UTC+8) — the game's home zone —
// so a check-in just before local midnight isn't bucketed into the wrong UTC day.
const SGT_OFFSET_MS = 8 * 3_600_000
function sgtDayStr(epochMs: number) {
  return new Date(epochMs + SGT_OFFSET_MS).toISOString().slice(0, 10)
}
function todayStr() {
  return sgtDayStr(Date.now())
}
function yesterdayStr() {
  return sgtDayStr(Date.now() - 24 * 3_600_000)
}

export function updateStreak(lastVisitDate: string | null, currentStreak: number): { streakDays: number; lastVisitDate: string } {
  const today = todayStr()
  if (lastVisitDate === today) return { streakDays: currentStreak, lastVisitDate }
  if (lastVisitDate === yesterdayStr()) return { streakDays: currentStreak + 1, lastVisitDate: today }
  return { streakDays: 1, lastVisitDate: today }
}

// ─── Achievement definitions ────────────────────────────────────────────────
const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_step',       name: 'First Step',          icon: '👣', description: 'Visit your first landmark' },
  { id: 'explorer',         name: 'Explorer',            icon: '🗺️', description: 'Visit 5 landmarks' },
  { id: 'history_buff',     name: 'History Buff',        icon: '📜', description: 'Visit 10 landmarks' },
  { id: 'wanderer',         name: 'Wanderer',            icon: '🚶', description: 'Visit 25 landmarks' },
  { id: 'legend',           name: 'Legend of Singapore', icon: '🦁', description: 'Visit 50 landmarks' },
  { id: 'complete',         name: 'Complete Explorer',   icon: '🏆', description: 'Visit all 100 landmarks' },
  { id: 'nature_lover',     name: 'Nature Lover',        icon: '🌿', description: 'Visit 5 nature sites' },
  { id: 'heritage_hunter',  name: 'Heritage Hunter',     icon: '🏛', description: 'Visit 10 heritage sites' },
  { id: 'devout',           name: 'Devout',              icon: '🕌', description: 'Visit 5 religious sites' },
  { id: 'museum_goer',      name: 'Museum Goer',         icon: '🎨', description: 'Visit 3 museums' },
  { id: 'streak_3',         name: 'On a Roll',           icon: '🔥', description: 'Check in 3 days in a row' },
  { id: 'streak_7',         name: 'Week Warrior',        icon: '⚡', description: 'Check in 7 days in a row' },
  { id: 'level_5',          name: 'Rising Explorer',     icon: '⭐', description: 'Reach level 5' },
  { id: 'level_10',         name: 'Seasoned Explorer',   icon: '🌟', description: 'Reach level 10' },
]

export function buildInitialAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, unlockedAt: null }))
}

export function checkAchievements(
  achievements: Achievement[],
  history: VisitRecord[],
  level: number,
  streak: number,
): Achievement[] {
  const total = history.length
  const byCategory = (cat: string) => history.filter((v) => v.poiCategory === cat).length

  const conditions: Record<string, boolean> = {
    first_step:      total >= 1,
    explorer:        total >= 5,
    history_buff:    total >= 10,
    wanderer:        total >= 25,
    legend:          total >= 50,
    complete:        total >= 100,
    nature_lover:    byCategory('nature') >= 5,
    heritage_hunter: byCategory('heritage') >= 10,
    devout:          byCategory('religious') >= 5,
    museum_goer:     byCategory('museum') >= 3,
    streak_3:        streak >= 3,
    streak_7:        streak >= 7,
    level_5:         level >= 5,
    level_10:        level >= 10,
  }

  const now = new Date().toISOString()
  return achievements.map((a) =>
    !a.unlockedAt && conditions[a.id] ? { ...a, unlockedAt: now } : a,
  )
}

// ─── Egg / Creature system ───────────────────────────────────────────────────

export const MAX_EGG_SLOTS = 3

// ── Creature storage cap (Pikmin-Bloom-style) ───────────────────────────────
// Cap grows with level; the shop adds a stored bonus on top.
export const CREATURE_SLOTS_BASE = 6
export const CREATURE_SLOTS_PER_LEVEL = 2
export function creatureCap(level: number, bonus: number): number {
  return CREATURE_SLOTS_BASE + Math.max(0, level - 1) * CREATURE_SLOTS_PER_LEVEL + bonus
}

// ── Shop ─────────────────────────────────────────────────────────────────────
export const MAX_EGG_SLOTS_CAP = 6
export const CREATURE_SLOT_CHUNK = 3
export function creatureSlotsCost(bonus: number): number {
  return 60 + 60 * (bonus / CREATURE_SLOT_CHUNK) // 60, 120, 180, …
}
export function eggSlotCost(currentMax: number): number {
  return 120 * (currentMax - MAX_EGG_SLOTS + 1) // 120, 240, 360, …
}

const CREATURE_BY_CATEGORY: Record<string, { species: string; emoji: string; tier: EggTier }> = {
  heritage:  { species: 'Stonewarden', emoji: '🗿', tier: 'common' },
  landmark:  { species: 'Pathfinder',  emoji: '🧭', tier: 'common' },
  arts:      { species: 'Muse',        emoji: '🎨', tier: 'common' },
  religious: { species: 'Luminary',    emoji: '🌟', tier: 'rare' },
  nature:    { species: 'Fernspark',   emoji: '🌿', tier: 'rare' },
  museum:    { species: 'Archivist',   emoji: '📜', tier: 'epic' },
}

const FALLBACK_CREATURE = { species: 'Wanderer', emoji: '✨', tier: 'common' as EggTier }

export const TIER_STEPS: Record<EggTier, number> = { common: 100, rare: 1000, epic: 5000 }

function creatureForCategory(category: string) {
  return CREATURE_BY_CATEGORY[category] ?? FALLBACK_CREATURE
}

export function createEggFor(poiId: string, poiName: string, category: string): Egg {
  const { tier } = creatureForCategory(category)
  return {
    id: `egg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    poiId,
    poiName,
    poiCategory: category,
    tier,
    stepsRequired: TIER_STEPS[tier],
    stepsProgress: 0,
    acquiredAt: new Date().toISOString(),
  }
}

export function createEgg(poi: Poi): Egg {
  return createEggFor(poi.id, poi.name, poi.category ?? '')
}

export function hatchEgg(egg: Egg): HatchedCreature {
  const { species, emoji } = creatureForCategory(egg.poiCategory)
  return {
    id: `creature_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    species,
    emoji,
    poiOriginId: egg.poiId,
    poiOriginName: egg.poiName,
    poiCategory: egg.poiCategory,
    hatchedAt: new Date().toISOString(),
    level: 1,
    xp: 0,
  }
}

// Advance all eggs by stepDelta steps; split into still-incubating and newly-hatched.
export function advanceEggs(eggs: Egg[], stepDelta: number): { incubating: Egg[]; hatched: Egg[] } {
  const incubating: Egg[] = []
  const hatched: Egg[] = []
  for (const egg of eggs) {
    const updated = { ...egg, stepsProgress: egg.stepsProgress + stepDelta }
    ;(updated.stepsProgress >= updated.stepsRequired ? hatched : incubating).push(updated)
  }
  return { incubating, hatched }
}

// ─── Squad system ─────────────────────────────────────────────────────────────

export const MAX_SQUADS = 3
export const SQUAD_SLOTS = 4

export function createEmptySquads(): Squad[] {
  return Array.from({ length: MAX_SQUADS }, (_, i) => ({
    id: `squad_${i + 1}`,
    name: `Squad ${i + 1}`,
    slots: Array<string | null>(SQUAD_SLOTS).fill(null),
    expedition: null,
  }))
}

// Duration scales with how far the squad has to travel. DEV-tuned so nearby trips
// finish in ~half a minute and the longest cross-island trip caps at a few minutes;
// raise these for production (idle reward over hours).
const EXPEDITION_BASE_MS = 20_000
const EXPEDITION_MS_PER_KM = 8_000
const EXPEDITION_MAX_MS = 6 * 60_000

export function expeditionDurationMs(distanceM: number): number {
  return Math.round(Math.min(EXPEDITION_MAX_MS, EXPEDITION_BASE_MS + (distanceM / 1000) * EXPEDITION_MS_PER_KM))
}

const EXPEDITION_BASE_XP = 25
const EXPEDITION_BASE_COINS = 10
export const EXPEDITION_EGG_CHANCE = 0.4

// Reward multiplier: matching members contribute +0.25 × (1 + (level−1) × 0.05),
// so higher-level creatures amplify check-in and expedition rewards more.
export function affinityMultiplier(
  squad: Squad | undefined,
  category: string,
  creaturesById: Map<string, HatchedCreature>,
): number {
  if (!squad) return 1
  const contribution = squad.slots.reduce((sum, id) => {
    const c = id ? creaturesById.get(id) : undefined
    if (!c || c.poiCategory !== category) return sum
    return sum + 0.25 * (1 + (c.level - 1) * 0.05)
  }, 0)
  return 1 + contribution
}

export function isAway(squad: Squad): boolean {
  return squad.expedition !== null
}

// ── Claimed landmarks (light, solo "areas of control") ───────────────────────
// DEV-tuned rate so holdings are testable in a minute or two; lower for production.
const CLAIM_COINS_PER_MIN = 3
const CLAIM_MAX_COINS = 150

// Coins accrued since last collection, scaled by the claim's affinity, capped.
export function claimPendingCoins(claim: Claim, now: number): number {
  const minutes = (now - new Date(claim.lastCollectedAt).getTime()) / 60_000
  return Math.floor(Math.min(CLAIM_MAX_COINS, minutes * CLAIM_COINS_PER_MIN * claim.affinity))
}

export function hasReturned(exp: SquadExpedition, now: number): boolean {
  return now >= new Date(exp.returnsAt).getTime()
}

// XP + coins earned when an expedition is collected, scaled by type affinity to the
// target. Coins carry a random spread so payouts feel varied. (Egg roll is handled by
// the caller, which knows whether an egg slot is free.)
export function rollExpeditionPayout(
  squad: Squad,
  creaturesById: Map<string, HatchedCreature>,
): { xp: number; coins: number; food: FoodItem } {
  if (!squad.expedition) return { xp: 0, coins: 0, food: makeFoodItem() }
  const mult = affinityMultiplier(squad, squad.expedition.poiCategory, creaturesById)
  const xp = Math.round(EXPEDITION_BASE_XP * mult)
  const coins = Math.round((EXPEDITION_BASE_COINS + Math.random() * EXPEDITION_BASE_COINS) * mult)
  return { xp, coins, food: makeFoodItem() }
}

function makeFoodItem(): FoodItem {
  const def = randomFood()
  return { id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, foodId: def.id, acquiredAt: new Date().toISOString() }
}

// ─── Player level-up rewards ─────────────────────────────────────────────────

export type LevelReward =
  | { type: 'coins'; amount: number }
  | { type: 'egg_slot' }
  | { type: 'creature_slots'; amount: number }

export function levelRewardsFor(level: number): LevelReward[] {
  const rewards: LevelReward[] = []
  rewards.push({ type: 'coins', amount: Math.floor(25 + level * 25) })
  if (level % 4 === 0) rewards.push({ type: 'egg_slot' })
  if (level % 5 === 0) rewards.push({ type: 'creature_slots', amount: 3 })
  return rewards
}

export function applyLevelRewards(
  profile: PlayerProfile,
  rewards: LevelReward[],
): Pick<PlayerProfile, 'coins' | 'maxEggSlots' | 'bonusCreatureSlots'> {
  let { coins, maxEggSlots, bonusCreatureSlots } = profile
  for (const r of rewards) {
    if (r.type === 'coins') coins += r.amount
    else if (r.type === 'egg_slot') maxEggSlots = Math.min(MAX_EGG_SLOTS_CAP, maxEggSlots + 1)
    else if (r.type === 'creature_slots') bonusCreatureSlots += r.amount
  }
  return { coins, maxEggSlots, bonusCreatureSlots }
}

// ─── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'lorewalk_profile'

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile
      const squads = parsed.squads ?? createEmptySquads()
      // Migrate bondLevel → level + xp for saves created before the level system.
      const hatchedCreatures = (parsed.hatchedCreatures ?? []).map((c: any) => {
        if (c.level !== undefined) return c as HatchedCreature
        const { bondLevel, ...rest } = c
        return { ...rest, level: bondLevel ?? 1, xp: 0 } as HatchedCreature
      })
      const eggs: Egg[] = (parsed.eggs ?? []).map((e: any) => {
        // Migrate pre-steps saves: rename visitsRequired/visitsProgress → steps fields
        if (e.stepsRequired !== undefined) return e as Egg
        const tier: EggTier = e.tier ?? 'common'
        return {
          ...e,
          stepsRequired: TIER_STEPS[tier] ?? TIER_STEPS.common,
          stepsProgress: 0,
          visitsRequired: undefined,
          visitsProgress: undefined,
        } as Egg
      })
      return {
        ...parsed,
        eggs,
        hatchedCreatures,
        foodInventory: parsed.foodInventory ?? [],
        stepsAppliedToEggs: parsed.stepsAppliedToEggs ?? 0,
        maxEggSlots: parsed.maxEggSlots ?? MAX_EGG_SLOTS,
        bonusCreatureSlots: parsed.bonusCreatureSlots ?? 0,
        squads,
        activeSquadId: parsed.activeSquadId ?? squads[0]?.id ?? null,
        coins: parsed.coins ?? 0,
        claims: parsed.claims ?? [],
      }
    }
  } catch { /* ignore */ }

  return {
    id: `guest_${Date.now()}`,
    displayName: 'Explorer',
    level: 1,
    xp: 0,
    totalXp: 0,
    visitHistory: [],
    achievements: buildInitialAchievements(),
    createdAt: new Date().toISOString(),
    lastVisitDate: null,
    streakDays: 0,
    eggs: [],
    hatchedCreatures: [],
    foodInventory: [],
    stepsAppliedToEggs: 0,
    maxEggSlots: MAX_EGG_SLOTS,
    bonusCreatureSlots: 0,
    squads: createEmptySquads(),
    activeSquadId: 'squad_1',
    coins: 0,
    claims: [],
  }
}

export function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}
