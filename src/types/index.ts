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
}

export interface HatchedCreature {
  id: string
  species: string
  emoji: string
  creatureType?: string
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
  foodNodeId?: string  // set for food-marker expeditions
  foodId?: string      // food to award on return
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
  stepsAppliedToEggs: number
  maxEggSlots: number
  bonusCreatureSlots: number   // extra creature storage bought in the shop
  squads: Squad[]
  activeSquadId: string | null
  coins: number
  claims: Claim[]
  postcards: Postcard[]   // inbox (received)
  outbox: Postcard[]      // sent by this player
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

// A food item that has appeared on the map near a POI. Sent on a food expedition
// to retrieve it; removed from the map when the squad returns.
export interface FoodNode {
  id: string
  foodId: string
  lat: number
  lon: number
  poiId: string
  poiName: string
  poiCategory: string
  spawnedAt: string
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
