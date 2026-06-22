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

export interface Creature {
  id: string
  name: string
  species: string
  bond_level: number
  acquired_at: string
  poi_origin_id: string | null
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

export type EggTier = 'common' | 'rare'

export interface Egg {
  id: string
  poiId: string
  poiName: string
  poiCategory: string
  tier: EggTier
  visitsRequired: number
  visitsProgress: number
  acquiredAt: string
}

export interface HatchedCreature {
  id: string
  species: string
  emoji: string
  poiOriginId: string
  poiOriginName: string
  poiCategory: string
  hatchedAt: string
  bondLevel: number
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

// Target a squad can be sent to — drawn from a visited POI.
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
  maxEggSlots: number
  squads: Squad[]
  activeSquadId: string | null
  coins: number
}

export interface ExpeditionCollectResult {
  xp: number
  coins: number
  egg: boolean   // whether an egg was also awarded
}
