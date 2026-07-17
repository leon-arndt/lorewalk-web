import type { Achievement, Claim, Egg, EggTier, FoodItem, FoodNode, HatchedCreature, PartyMember, PlayerProfile, Poi, Squad, SquadExpedition, ShrineNode, VisitRecord, WeeklyPartyWalk } from '@/types'
import { randomFood } from '@/data/foods'
import { drawCreature, rollEggTier } from '@/data/creatures'
export { rollEggTier }

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
// Calendar days are anchored to Singapore time (UTC+8) - the game's home zone -
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

export const TIER_STEPS: Record<EggTier, number> = { common: 100, rare: 1000, epic: 5000 }
export const SHINY_CHANCE = 0.01

export function createEggFor(poiId: string, poiName: string, category: string): Egg {
  const tier = rollEggTier(category)
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
  const def = drawCreature(egg.poiCategory, egg.tier)
  const isShiny = egg.isShiny ?? Math.random() < SHINY_CHANCE
  return {
    id: `creature_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    species: def.species,
    emoji: def.emoji,
    creatureType: def.type,
    isShiny,
    poiOriginId: egg.poiId,
    poiOriginName: egg.poiName,
    poiCategory: egg.poiCategory,
    hatchedAt: new Date().toISOString(),
    level: 1,
    xp: 0,
  }
}

export function isEggReady(egg: Egg): boolean {
  return egg.stepsProgress >= egg.stepsRequired
}

// Advance all eggs by stepDelta steps. Eggs that reach their step requirement stay in
// the list as "ready" - hatching itself is a separate, player-triggered action.
export function advanceEggs(eggs: Egg[], stepDelta: number): Egg[] {
  return eggs.map((egg) => ({ ...egg, stepsProgress: egg.stepsProgress + stepDelta }))
}

export function creatureName(c: HatchedCreature): string {
  const base = c.nickname?.trim() || c.species
  return c.isShiny ? `✨ ${base}` : base
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

// ─── Food expeditions (Pikmin-style per-creature dispatch) ──────────────────────

// Most creatures you can send to a single food node.
export const MAX_FOOD_CREATURES = 2

// A creature's contribution toward a food node's power requirement. Scaled so that
// one or two creatures comfortably clear a node: a fresh creature is already worth 5,
// and two of them (10) clear most foods. Food requirements are 6 / 10 / 14.
export function creaturePower(c: HatchedCreature): number {
  return c.level * 5
}

// More creatures finish the trip faster: full duration solo, halved with two, etc.
export function foodExpeditionDurationMs(distanceM: number, creatureCount: number): number {
  const base = expeditionDurationMs(distanceM)
  return Math.max(15_000, Math.round(base / Math.max(1, creatureCount)))
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
// target. Coins carry a random spread so payouts feel varied.
export function rollExpeditionPayout(
  squad: Squad,
  creaturesById: Map<string, HatchedCreature>,
): { xp: number; coins: number } {
  if (!squad.expedition) return { xp: 0, coins: 0 }
  const mult = affinityMultiplier(squad, squad.expedition.poiCategory, creaturesById)
  const xp = Math.round(EXPEDITION_BASE_XP * mult)
  const coins = Math.round((EXPEDITION_BASE_COINS + Math.random() * EXPEDITION_BASE_COINS) * mult)
  return { xp, coins }
}

// ─── Food nodes (map markers for expeditions) ────────────────────────────────

export const MAX_FOOD_NODES = 15

// Small deterministic lat/lon offset per POI so the food marker sits slightly
// apart from the POI pin. Stable across sessions (same seed → same offset).
function deterministicOffset(seed: string): { dlat: number; dlon: number } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return {
    dlat: ((h & 0xff) - 128) / 128 * 0.0003,      // ≈ ±33 m
    dlon: (((h >> 8) & 0xff) - 128) / 128 * 0.0003,
  }
}

// Pick up to `count` POIs spread across the island instead of clustered together.
// POIs are bucketed into a coarse geographic grid and chosen round-robin across
// cells, so nodes don't all pile up in the dense CBD. Deterministic given the input.
const SPREAD_CELL_DEG = 0.03   // ≈ 3 km
function pickSpread(pois: Poi[], count: number): Poi[] {
  if (count <= 0 || pois.length === 0) return []
  const cells = new Map<string, Poi[]>()
  for (const p of pois) {
    const key = `${Math.round(p.lat / SPREAD_CELL_DEG)}_${Math.round(p.lon / SPREAD_CELL_DEG)}`
    const arr = cells.get(key)
    if (arr) arr.push(p)
    else cells.set(key, [p])
  }
  const cellKeys = [...cells.keys()].sort()
  for (const k of cellKeys) cells.get(k)!.sort((a, b) => a.id.localeCompare(b.id))
  const picked: Poi[] = []
  for (let round = 0; picked.length < count; round++) {
    let addedThisRound = false
    for (const k of cellKeys) {
      const arr = cells.get(k)!
      if (round < arr.length) {
        picked.push(arr[round])
        addedThisRound = true
        if (picked.length >= count) break
      }
    }
    if (!addedThisRound) break   // every cell exhausted
  }
  return picked
}

export function spawnFoodNodes(pois: Poi[], existing: FoodNode[]): FoodNode[] {
  const poiById = new Map(pois.map((p) => [p.id, p]))
  // Evict nodes for POIs no longer visible; recompute lat/lon from current POI data
  // so stale coordinates from a previous session can't persist. Nodes with an active
  // expedition are kept regardless so the dispatched creatures can still return.
  const kept: FoodNode[] = []
  for (const node of existing) {
    const poi = poiById.get(node.poiId)
    if (!poi) {
      if (node.expedition) kept.push(node)
      continue
    }
    const { dlat, dlon } = deterministicOffset(poi.id)
    kept.push({ ...node, lat: poi.lat + dlat, lon: poi.lon + dlon, poiName: poi.name })
  }
  if (kept.length >= MAX_FOOD_NODES) return kept
  const occupiedPoiIds = new Set(kept.map((n) => n.poiId))
  const available = pois.filter((p) => !occupiedPoiIds.has(p.id))
  const chosen = pickSpread(available, MAX_FOOD_NODES - kept.length)
  const newNodes: FoodNode[] = []
  for (let i = 0; i < chosen.length; i++) {
    const poi = chosen[i]
    const food = randomFood()
    const { dlat, dlon } = deterministicOffset(poi.id)
    newNodes.push({
      id: `fn_${poi.id}_${Date.now() + i}`,
      foodId: food.id,
      lat: poi.lat + dlat,
      lon: poi.lon + dlon,
      poiId: poi.id,
      poiName: poi.name,
      poiCategory: poi.category ?? 'landmark',
      spawnedAt: new Date().toISOString(),
    })
  }
  return [...kept, ...newNodes]
}

// ─── Guardian Shrines (boss fights) ──────────────────────────────────────────

// Categories that can host a shrine, and their difficulty (power required to win).
const SHRINE_CATEGORIES: Record<string, number> = {
  heritage: 30,
  religious: 50,
  museum: 20,
}
export const MAX_SHRINE_NODES = 8
export const MAX_SHRINE_CREATURES = 4
export const SHRINE_DURATION_MS = import.meta.env.DEV ? 60_000 : 2 * 3_600_000

export function shrineDifficulty(category: string): number {
  return SHRINE_CATEGORIES[category] ?? 30
}

export function solveShrineResult(
  power: number,
  difficulty: number,
  creatures: HatchedCreature[],
): { won: boolean; coins: number; xp: number; egg: boolean; levelUps: Array<{ species: string; newLevel: number }> } {
  const won = power >= difficulty
  const coins = won ? Math.round(40 + Math.random() * 40) : 5
  const xp = won ? 50 : 10
  const egg = won && Math.random() < 0.6
  // Creature XP for participants
  const levelUps: Array<{ species: string; newLevel: number }> = []
  for (const c of creatures) {
    const gained = won ? 20 : 5
    const updated = applyCreatureXp(c, gained)
    if (updated.level > c.level) levelUps.push({ species: c.species, newLevel: updated.level })
  }
  return { won, coins, xp, egg, levelUps }
}

export function spawnShrineNodes(pois: Poi[], existing: ShrineNode[]): ShrineNode[] {
  const poiById = new Map(pois.map((p) => [p.id, p]))
  const eligibleCategories = new Set(Object.keys(SHRINE_CATEGORIES))
  const kept: ShrineNode[] = []
  for (const node of existing) {
    const poi = poiById.get(node.poiId)
    if (!poi) {
      if (node.expedition) kept.push(node)
      continue
    }
    const { dlat, dlon } = deterministicOffset(poi.id + '_shrine')
    kept.push({ ...node, lat: poi.lat + dlat, lon: poi.lon + dlon, poiName: poi.name })
  }
  if (kept.length >= MAX_SHRINE_NODES) return kept
  const occupiedPoiIds = new Set(kept.map((n) => n.poiId))
  const available = pois.filter(
    (p) => !occupiedPoiIds.has(p.id) && eligibleCategories.has(p.category ?? ''),
  )
  const chosen = pickSpread(available, MAX_SHRINE_NODES - kept.length)
  const newNodes: ShrineNode[] = []
  for (let i = 0; i < chosen.length; i++) {
    const poi = chosen[i]
    const { dlat, dlon } = deterministicOffset(poi.id + '_shrine')
    newNodes.push({
      id: `sn_${poi.id}_${Date.now() + i}`,
      poiId: poi.id,
      poiName: poi.name,
      poiCategory: poi.category ?? 'heritage',
      lat: poi.lat + dlat,
      lon: poi.lon + dlon,
      difficulty: shrineDifficulty(poi.category ?? ''),
      spawnedAt: new Date().toISOString(),
    })
  }
  return [...kept, ...newNodes]
}

export function makeFoodItem(foodId: string): FoodItem {
  return { id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, foodId, acquiredAt: new Date().toISOString() }
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
        foodNodes: (parsed.foodNodes ?? []).filter((n: any) =>
          typeof n.lat === 'number' && isFinite(n.lat) &&
          typeof n.lon === 'number' && isFinite(n.lon),
        ),
        shrineNodes: (parsed.shrineNodes ?? []).filter((n: any) =>
          typeof n.lat === 'number' && isFinite(n.lat) &&
          typeof n.lon === 'number' && isFinite(n.lon),
        ),
        stepsAppliedToEggs: parsed.stepsAppliedToEggs ?? 0,
        maxEggSlots: parsed.maxEggSlots ?? MAX_EGG_SLOTS,
        bonusCreatureSlots: parsed.bonusCreatureSlots ?? 0,
        squads,
        activeSquadId: parsed.activeSquadId ?? squads[0]?.id ?? null,
        coins: parsed.coins ?? 0,
        tickets: parsed.tickets ?? 0,
        claims: parsed.claims ?? [],
        postcards: parsed.postcards ?? [],
        outbox: parsed.outbox ?? [],
        weeklyWalk: parsed.weeklyWalk ?? null,
        dailySteps: parsed.dailySteps ?? {},
        isPremium: parsed.isPremium ?? false,
        medals: parsed.medals ?? [],
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
    foodNodes: [],
    shrineNodes: [],
    stepsAppliedToEggs: 0,
    maxEggSlots: MAX_EGG_SLOTS,
    bonusCreatureSlots: 0,
    squads: createEmptySquads(),
    activeSquadId: 'squad_1',
    coins: 0,
    tickets: 0,
    claims: [],
    postcards: [],
    outbox: [],
    weeklyWalk: null,
    dailySteps: {},
    isPremium: false,
    medals: [],
  }
}

// Premium entitlement gate for premium_only POIs. Client-side only: fine while
// isPremium is a local dev toggle, but must move to a server-verified check
// (Supabase profiles row + purchase receipt) before this gates anything real.
export function isPoiLocked(poi: Poi, profile: PlayerProfile): boolean {
  return !!poi.premiumOnly && !profile.isPremium
}

// Target steps for a full daily ring on the journal calendar.
export const DAILY_STEP_GOAL = 5000

// Local (not UTC) YYYY-MM-DD, so calendar days match the player's wall clock.
export function localDateKey(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 48h in prod, 30s in dev for fast testing
export const POSTCARD_DELIVERY_MS = import.meta.env.DEV ? 30_000 : 48 * 3_600_000

export function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

// ─── Ticket economy ───────────────────────────────────────────────────────────

export const TICKET_COST_COINS = 200

// ─── Weekly party walk ────────────────────────────────────────────────────────

export const WEEKLY_WALK_PARTY_SIZE = 5
export const WEEKLY_WALK_TARGET_STEPS = 30_000
// How long mock members take to complete their share (drives their simulated pace)
const MOCK_MEMBER_DURATION_MS = import.meta.env.DEV ? 120_000 : 5 * 24 * 3_600_000

const MOCK_PARTY_POOL: Array<{ name: string; emoji: string }> = [
  { name: 'Aisha', emoji: '🌿' },
  { name: 'Rajan', emoji: '🗿' },
  { name: 'Wei Ling', emoji: '🧭' },
  { name: 'Priya', emoji: '🌸' },
]

// Returns the Monday 00:00 UTC of the week containing `now`.
export function weekStart(now = Date.now()): string {
  const d = new Date(now)
  const day = d.getUTCDay()  // 0=Sun, 1=Mon …
  const diffToMon = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diffToMon)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export function buildWeeklyWalk(startSteps: number): WeeklyPartyWalk {
  const targetPerMember = WEEKLY_WALK_TARGET_STEPS / WEEKLY_WALK_PARTY_SIZE
  const members: PartyMember[] = [
    { id: 'player', name: 'You', emoji: '🧭', targetSteps: targetPerMember, isPlayer: true },
    ...MOCK_PARTY_POOL.slice(0, WEEKLY_WALK_PARTY_SIZE - 1).map((m) => ({
      id: `mock_${m.name}`,
      name: m.name,
      emoji: m.emoji,
      targetSteps: targetPerMember,
      isPlayer: false,
    })),
  ]
  return {
    id: `walk_${Date.now()}`,
    weekStart: weekStart(),
    totalTargetSteps: WEEKLY_WALK_TARGET_STEPS,
    partyMembers: members,
    joinedAt: new Date().toISOString(),
    startSteps,
    completedAt: null,
    rewardClaimed: false,
  }
}

// Steps contributed by a mock member based on time elapsed since join.
export function mockMemberProgressSteps(joinedAt: string, targetSteps: number, now = Date.now()): number {
  const elapsed = now - new Date(joinedAt).getTime()
  const fraction = Math.min(1, elapsed / MOCK_MEMBER_DURATION_MS)
  return Math.round(fraction * targetSteps)
}

// Player's contributed steps.
export function playerProgressSteps(walk: WeeklyPartyWalk, currentSteps: number): number {
  const gained = Math.max(0, currentSteps - walk.startSteps)
  const targetSteps = walk.totalTargetSteps / WEEKLY_WALK_PARTY_SIZE
  return Math.min(targetSteps, gained)
}

// Total combined steps across all party members.
export function partyTotalSteps(walk: WeeklyPartyWalk, currentSteps: number, now = Date.now()): number {
  return walk.partyMembers.reduce((sum, m) => {
    if (m.isPlayer) return sum + playerProgressSteps(walk, currentSteps)
    return sum + mockMemberProgressSteps(walk.joinedAt, m.targetSteps, now)
  }, 0)
}

// True once combined steps hit the target.
export function isWalkComplete(walk: WeeklyPartyWalk, currentSteps: number, now = Date.now()): boolean {
  return partyTotalSteps(walk, currentSteps, now) >= walk.totalTargetSteps
}

// Walk expires if the player is still on last week's walk.
export function isWalkExpired(walk: WeeklyPartyWalk, now = Date.now()): boolean {
  return walk.weekStart !== weekStart(now)
}

// ─── Monthly medal event (Premium) ─────────────────────────────────────────────
// Deliberately not a persisted "event" object with a join step, unlike the weekly
// walk above: progress is derived live from dailySteps (already tracked for the
// journal calendar), so there's nothing to expire and nothing to lose by
// subscribing mid-month. claimMedal() in ProfileContext is the only write.

export const MEDAL_EVENT_TARGET_STEPS = 60_000

export function currentMonthKey(now = Date.now()): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
}

export function stepsThisMonth(dailySteps: Record<string, number>, monthKey = currentMonthKey()): number {
  return Object.entries(dailySteps).reduce(
    (sum, [date, steps]) => (date.startsWith(monthKey) ? sum + steps : sum),
    0,
  )
}
