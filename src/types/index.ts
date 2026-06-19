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
}
