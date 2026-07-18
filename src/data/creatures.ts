export type CreatureType = 'stray' | 'community' | 'wild' | 'mythic'
export type CreatureRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface CreatureDef {
  id: string
  species: string
  emoji: string
  /** Coat tint applied to the shared cat.glb mesh's Cat_Main/Cat_Secondary/Ears materials. */
  color: number
  type: CreatureType
  rarity: CreatureRarity
  poiCategory: string
}

// ponytail: legendary excluded from hatch pool; add special event system when needed
export const CREATURES: CreatureDef[] = [
  // Stray - Common
  { id: 'orange_cat',       species: 'Orange Cat',       emoji: '🐈',   color: 0xf2984a, type: 'stray',     rarity: 'common',    poiCategory: 'landmark' },
  { id: 'grey_cat',         species: 'Grey Cat',         emoji: '🐱',   color: 0x9aa0ab, type: 'stray',     rarity: 'common',    poiCategory: 'heritage' },
  { id: 'black_cat',        species: 'Black Cat',        emoji: '🐈‍⬛', color: 0x2b2b2e, type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'white_cat',        species: 'White Cat',        emoji: '🐱',   color: 0xf5f2ea, type: 'stray',     rarity: 'common',    poiCategory: 'arts' },
  { id: 'brown_cat',        species: 'Brown Cat',        emoji: '🐱',   color: 0x8a5a35, type: 'stray',     rarity: 'common',    poiCategory: 'heritage' },
  { id: 'cream_cat',        species: 'Cream Cat',        emoji: '🐱',   color: 0xf0dcb0, type: 'stray',     rarity: 'common',    poiCategory: 'arts' },
  { id: 'tabby_cat',        species: 'Tabby Cat',        emoji: '🐈',   color: 0xc98f4e, type: 'stray',     rarity: 'common',    poiCategory: 'landmark' },
  { id: 'tuxedo_cat',       species: 'Tuxedo Cat',       emoji: '🐱',   color: 0x232323, type: 'stray',     rarity: 'common',    poiCategory: 'museum' },
  { id: 'calico_cat',       species: 'Calico Cat',       emoji: '🐈',   color: 0xe8b774, type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'tortoiseshell_cat',species: 'Tortoiseshell Cat',emoji: '🐈',   color: 0x6b4a30, type: 'stray',     rarity: 'common',    poiCategory: 'nature' },
  { id: 'siamese_cat',      species: 'Siamese Cat',      emoji: '🐱',   color: 0xe9dcc3, type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'striped_cat',      species: 'Striped Cat',      emoji: '🐈',   color: 0xb0895a, type: 'stray',     rarity: 'common',    poiCategory: 'nature' },

  // Community Cat - Rare
  { id: 'ear_tipped_cat',   species: 'Ear-tipped Cat',   emoji: '🐱',   color: 0x9aa0ab, type: 'community', rarity: 'rare',      poiCategory: 'landmark' },
  { id: 'bobtail_cat',      species: 'Bobtail Cat',      emoji: '🐈',   color: 0xc9a26a, type: 'community', rarity: 'rare',      poiCategory: 'heritage' },
  { id: 'polydactyl_cat',   species: 'Polydactyl Cat',   emoji: '🐾',   color: 0x8a5a35, type: 'community', rarity: 'rare',      poiCategory: 'museum' },
  { id: 'one_eyed_cat',     species: 'One-eyed Cat',     emoji: '🐱',   color: 0x707070, type: 'community', rarity: 'rare',      poiCategory: 'heritage' },
  { id: 'longhaired_cat',   species: 'Long-haired Cat',  emoji: '🐱',   color: 0xede0c8, type: 'community', rarity: 'rare',      poiCategory: 'arts' },
  { id: 'fat_cat',          species: 'Fat Cat',          emoji: '🐈',   color: 0xe0a95c, type: 'community', rarity: 'rare',      poiCategory: 'landmark' },
  { id: 'singapura_cat',    species: 'Singapura Cat',    emoji: '🐱',   color: 0xb98456, type: 'community', rarity: 'rare',      poiCategory: 'landmark' },

  // Wild Cat - Epic
  { id: 'clouded_leopard',  species: 'Clouded Leopard',  emoji: '🐆',   color: 0xc9a15a, type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'malayan_tiger',    species: 'Malayan Tiger',    emoji: '🐯',   color: 0xe07a2c, type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'fishing_cat',      species: 'Fishing Cat',      emoji: '🐱',   color: 0x8f8f7a, type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'flat_headed_cat',  species: 'Flat-headed Cat',  emoji: '🐱',   color: 0x6b5a4a, type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'leopard_cat',      species: 'Leopard Cat',      emoji: '🐆',   color: 0xd1a662, type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },

  // Mythic - Legendary (not in hatch pool)
  { id: 'merlion',          species: 'Merlion',          emoji: '🦁',   color: 0xe8e8ec, type: 'mythic',    rarity: 'legendary', poiCategory: 'landmark' },
  { id: 'stone_lion',       species: 'Stone Lion',       emoji: '🦁',   color: 0x9c9c94, type: 'mythic',    rarity: 'legendary', poiCategory: 'heritage' },
  { id: 'white_tiger',      species: 'White Tiger',      emoji: '🐯',   color: 0xf2f2ef, type: 'mythic',    rarity: 'legendary', poiCategory: 'nature' },
  { id: 'singa',            species: 'Singa',            emoji: '🦁',   color: 0xd9a13a, type: 'mythic',    rarity: 'legendary', poiCategory: 'landmark' },
]

const BY_SPECIES = new Map(CREATURES.map((c) => [c.species, c]))

export function creatureDefBySpecies(species: string): CreatureDef | undefined {
  return BY_SPECIES.get(species)
}

// Tier probability weights [common, rare, epic] per POI category
const TIER_WEIGHTS: Record<string, [number, number, number]> = {
  heritage: [70, 25, 5],
  landmark: [65, 28, 7],
  arts:     [70, 25, 5],
  religious:[70, 25, 5],
  museum:   [65, 30, 5],
  nature:   [55, 33, 12],
}

function weightedTier(category: string): 'common' | 'rare' | 'epic' {
  const [wC, wR] = TIER_WEIGHTS[category] ?? [70, 25, 5]
  const roll = Math.random() * 100
  if (roll < wC) return 'common'
  if (roll < wC + wR) return 'rare'
  return 'epic'
}

export function rollEggTier(poiCategory: string): 'common' | 'rare' | 'epic' {
  return weightedTier(poiCategory)
}

const HATCH_POOL = CREATURES.filter((c) => c.rarity !== 'legendary')

export function drawCreature(poiCategory: string, tier: string): CreatureDef {
  const pool = HATCH_POOL.filter((c) => c.poiCategory === poiCategory && c.rarity === tier)
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  // fallback: any creature of this tier
  const byTier = HATCH_POOL.filter((c) => c.rarity === tier)
  if (byTier.length > 0) return byTier[Math.floor(Math.random() * byTier.length)]
  return HATCH_POOL[0]
}
