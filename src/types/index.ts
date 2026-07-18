export type PoiCategory = 'permanent' | 'temporary'

export interface Poi {
  id: string
  name: string
  description: string
  lat: number
  lon: number
  kind: PoiCategory
  points?: number
  category?: string
  learnMoreUrl?: string
  premiumOnly?: boolean
  activeUntil?: string
  creatureRewardId?: string | null
}


export interface PlanterSlot {
  id: string
  creature_species: string
  points_invested: number
  points_required: number
  started_at: string
}

export interface Expedition {
  id: string
  creature_id: string
  started_at: string
  returns_at: string
  status: 'active' | 'returned'
}

export type EggTier = 'common' | 'rare' | 'epic'

export interface Egg {
  id: string
  poiId: string
  poiName: string
  poiCategory: string
  tier: EggTier
  stepsRequired: number
  stepsProgress: number
  acquiredAt: string
  isShiny?: boolean
}

export interface HatchedCreature {
  id: string
  species: string
  nickname?: string
  emoji: string
  creatureType?: string
  isShiny?: boolean
  poiOriginId: string
  poiOriginName: string
  poiCategory: string
  hatchedAt: string
  level: number
  xp: number
}

export interface PlayerPosition {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface VisitRecord {
  poiId: string
  poiName: string
  poiCategory: string
  visitedAt: string       // ISO date string
  xpEarned: number
  lat?: number            // snapshot so visited POIs can be used as squad stations
  lon?: number
}

export interface SquadExpedition {
  poiId: string
  poiName: string
  poiCategory: string
  lat: number
  lon: number
  startedAt: string   // ISO
  returnsAt: string   // ISO
}

export interface Squad {
  id: string
  name: string
  slots: (string | null)[]   // hatched-creature ids; length === SQUAD_SLOTS
  expedition: SquadExpedition | null
}

// Target a squad can be sent to - drawn from a visited POI.
export interface ExpeditionTarget {
  poiId: string
  poiName: string
  poiCategory: string
  lat: number
  lon: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: string | null  // ISO date, null if locked
}

export interface PlayerProfile {
  id: string
  displayName: string
  level: number
  xp: number              // XP within current level (resets on level up)
  totalXp: number         // cumulative, never resets
  visitHistory: VisitRecord[]
  achievements: Achievement[]
  createdAt: string
  lastVisitDate: string | null  // ISO date of last check-in (for streak)
  streakDays: number
  eggs: Egg[]
  hatchedCreatures: HatchedCreature[]
  foodInventory: FoodItem[]
  foodNodes: FoodNode[]
  shrineNodes: ShrineNode[]
  stepsAppliedToEggs: number
  maxEggSlots: number
  bonusCreatureSlots: number   // extra creature storage bought in the shop
  squads: Squad[]
  activeSquadId: string | null
  coins: number
  tickets: number
  claims: Claim[]
  postcards: Postcard[]   // inbox (received)
  outbox: Postcard[]      // sent by this player
  weeklyWalk: WeeklyPartyWalk | null
  dailySteps: Record<string, number>   // local date (YYYY-MM-DD) -> steps that day
  isPremium: boolean   // client-side only for now; not server-verified, see lib/profile.ts
  medals: EarnedMedal[]   // one per completed monthly medal challenge, Premium only
  dailyMotivationNotifications: boolean   // preference only; no push delivery wired up yet
  partyWalkNotifications: boolean         // preference only; no push delivery wired up yet
  challengesNotifications: boolean        // preference only; no push delivery wired up yet
  friendsAndGiftsNotifications: boolean   // preference only; no push delivery wired up yet
  latestNewsNotifications: boolean        // preference only; no push delivery wired up yet
}

export type NotificationPrefKey =
  | 'dailyMotivationNotifications'
  | 'partyWalkNotifications'
  | 'challengesNotifications'
  | 'friendsAndGiftsNotifications'
  | 'latestNewsNotifications'

// A medal earned by hitting a calendar month's step goal while Premium. One per
// monthKey - claimMedal() in ProfileContext enforces that.
export interface EarnedMedal {
  id: string
  monthKey: string   // 'YYYY-MM', the challenge this came from
  title: string
  claimedAt: string
}

export interface Postcard {
  id: string
  fromPlayerId: string
  fromName: string
  toPlayerId: string
  toName: string
  poiId: string
  poiName: string
  poiCategory: string
  creatureEmoji: string
  sentAt: string
  deliverAt: string
  openedAt: string | null
}

export interface FoodItem {
  id: string       // unique inventory instance
  foodId: string   // references FoodDef.id
  acquiredAt: string
}

export interface ExpeditionCollectResult {
  xp: number
  coins: number
  egg: boolean
  food: { name: string; emoji: string } | null
  levelUps: Array<{ species: string; newLevel: number }>
}

// Creatures dispatched to a food node (Pikmin-style ad-hoc selection, not a squad).
export interface FoodExpedition {
  creatureIds: string[]
  startedAt: string   // ISO
  returnsAt: string   // ISO
}

// A food item that has appeared on the map near a POI. Send creatures to retrieve
// it; the node is removed from the map once the expedition is collected.
export interface FoodNode {
  id: string
  foodId: string
  lat: number
  lon: number
  poiId: string
  poiName: string
  poiCategory: string
  spawnedAt: string
  expedition?: FoodExpedition | null
}

export interface FoodCollectResult {
  food: { name: string; emoji: string }
  levelUps: Array<{ species: string; newLevel: number }>
}

export interface ShrineExpedition {
  creatureIds: string[]
  power: number       // total power sent, determines win/loss on collect
  startedAt: string
  returnsAt: string
}

export interface ShrineNode {
  id: string
  poiId: string
  poiName: string
  poiCategory: string
  lat: number
  lon: number
  difficulty: number   // power required to win
  spawnedAt: string
  expedition?: ShrineExpedition | null
  clearedUntil?: string | null  // ISO — shrine is "held" until this time after a win
}

export interface ShrineCollectResult {
  won: boolean
  coins: number
  egg: boolean
  xp: number
  levelUps: Array<{ species: string; newLevel: number }>
}

// ─── Weekly party walk ───────────────────────────────────────────────────────

export interface PartyMember {
  id: string
  name: string
  emoji: string       // creature emoji representing them on the party screen
  targetSteps: number  // their share of the total goal
  isPlayer: boolean
}

export interface WeeklyPartyWalk {
  id: string
  weekStart: string         // ISO Monday midnight UTC
  totalTargetSteps: number
  partyMembers: PartyMember[]
  joinedAt: string          // ISO when player joined
  startSteps: number        // player step count at join time
  completedAt: string | null
  rewardClaimed: boolean
}

// ─── Reward screen ────────────────────────────────────────────────────────────

export type RewardItemType = 'xp' | 'coins' | 'egg' | 'level_up' | 'badge' | 'food'

export interface RewardItem {
  type: RewardItemType
  amount?: number
  label?: string            // for level_up: creature name; for badge/food: item name
  emoji?: string            // overrides the type's default icon (e.g. the specific food)
}

export interface RewardConfig {
  emoji: string
  title: string
  subtitle?: string
  items: RewardItem[]
  medalMonthKey?: string  // when set, renders MedalSvg instead of the emoji header
}

// A landmark the player holds (claimed by finishing an expedition there). Held
// landmarks passively generate coins over time, scaled by the snapshot affinity.
export interface Claim {
  poiId: string
  poiName: string
  poiCategory: string
  lat: number
  lon: number
  affinity: number         // reward multiplier captured when claimed
  claimedAt: string        // ISO
  lastCollectedAt: string  // ISO
}
