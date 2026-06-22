import type { Achievement, Egg, EggTier, HatchedCreature, PlayerProfile, Poi, Squad, SquadExpedition, VisitRecord } from '@/types'

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

// Streak: did the player also visit yesterday?
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
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

const CREATURE_BY_CATEGORY: Record<string, { species: string; emoji: string; tier: EggTier }> = {
  heritage:  { species: 'Stonewarden', emoji: '🗿', tier: 'common' },
  landmark:  { species: 'Pathfinder',  emoji: '🧭', tier: 'common' },
  arts:      { species: 'Muse',        emoji: '🎨', tier: 'common' },
  religious: { species: 'Luminary',    emoji: '🌟', tier: 'rare' },
  museum:    { species: 'Archivist',   emoji: '📜', tier: 'rare' },
  nature:    { species: 'Fernspark',   emoji: '🌿', tier: 'rare' },
}

const FALLBACK_CREATURE = { species: 'Wanderer', emoji: '✨', tier: 'common' as EggTier }

const TIER_VISITS: Record<EggTier, number> = { common: 5, rare: 8 }

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
    visitsRequired: TIER_VISITS[tier],
    visitsProgress: 0,
    acquiredAt: new Date().toISOString(),
  }
}

export function createEgg(poi: Poi): Egg {
  return createEggFor(poi.id, poi.name, poi.category ?? 'landmark')
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
    bondLevel: 1,
  }
}

// Advance all eggs by 1 visit; split into still-incubating and newly-hatched.
export function advanceEggs(eggs: Egg[]): { incubating: Egg[]; hatched: Egg[] } {
  const incubating: Egg[] = []
  const hatched: Egg[] = []
  for (const egg of eggs) {
    const updated = { ...egg, visitsProgress: egg.visitsProgress + 1 }
    ;(updated.visitsProgress >= updated.visitsRequired ? hatched : incubating).push(updated)
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

// Reward multiplier: +25% per matching member whose type equals the category.
export function affinityMultiplier(
  squad: Squad | undefined,
  category: string,
  creaturesById: Map<string, HatchedCreature>,
): number {
  if (!squad) return 1
  const matches = squad.slots.filter((id) => {
    const c = id ? creaturesById.get(id) : undefined
    return c?.poiCategory === category
  }).length
  return 1 + 0.25 * matches
}

export function isAway(squad: Squad): boolean {
  return squad.expedition !== null
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
): { xp: number; coins: number } {
  if (!squad.expedition) return { xp: 0, coins: 0 }
  const mult = affinityMultiplier(squad, squad.expedition.poiCategory, creaturesById)
  const xp = Math.round(EXPEDITION_BASE_XP * mult)
  const coins = Math.round((EXPEDITION_BASE_COINS + Math.random() * EXPEDITION_BASE_COINS) * mult)
  return { xp, coins }
}

// ─── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'lorewalk_profile'

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile
      const squads = parsed.squads ?? createEmptySquads()
      return {
        ...parsed,
        eggs: parsed.eggs ?? [],
        hatchedCreatures: parsed.hatchedCreatures ?? [],
        maxEggSlots: parsed.maxEggSlots ?? MAX_EGG_SLOTS,
        squads,
        activeSquadId: parsed.activeSquadId ?? squads[0]?.id ?? null,
        coins: parsed.coins ?? 0,
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
    maxEggSlots: MAX_EGG_SLOTS,
    squads: createEmptySquads(),
    activeSquadId: 'squad_1',
    coins: 0,
  }
}

export function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}
