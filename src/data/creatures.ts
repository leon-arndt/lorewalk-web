export type CreatureType = 'stray' | 'community' | 'wild' | 'mythic'
export type CreatureRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface CreatureDef {
  id: string
  species: string
  emoji: string
  type: CreatureType
  rarity: CreatureRarity
  poiCategory: string
}

// ponytail: legendary excluded from hatch pool; add special event system when needed
export const CREATURES: CreatureDef[] = [
  // Stray - Common
  { id: 'orange_cat',       species: 'Orange Cat',       emoji: '🐈',   type: 'stray',     rarity: 'common',    poiCategory: 'landmark' },
  { id: 'grey_cat',         species: 'Grey Cat',         emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'heritage' },
  { id: 'black_cat',        species: 'Black Cat',        emoji: '🐈‍⬛', type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'white_cat',        species: 'White Cat',        emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'arts' },
  { id: 'brown_cat',        species: 'Brown Cat',        emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'heritage' },
  { id: 'cream_cat',        species: 'Cream Cat',        emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'arts' },
  { id: 'tabby_cat',        species: 'Tabby Cat',        emoji: '🐈',   type: 'stray',     rarity: 'common',    poiCategory: 'landmark' },
  { id: 'tuxedo_cat',       species: 'Tuxedo Cat',       emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'museum' },
  { id: 'calico_cat',       species: 'Calico Cat',       emoji: '🐈',   type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'tortoiseshell_cat',species: 'Tortoiseshell Cat',emoji: '🐈',   type: 'stray',     rarity: 'common',    poiCategory: 'nature' },
  { id: 'siamese_cat',      species: 'Siamese Cat',      emoji: '🐱',   type: 'stray',     rarity: 'common',    poiCategory: 'religious' },
  { id: 'striped_cat',      species: 'Striped Cat',      emoji: '🐈',   type: 'stray',     rarity: 'common',    poiCategory: 'nature' },

  // Community Cat - Rare
  { id: 'ear_tipped_cat',   species: 'Ear-tipped Cat',   emoji: '🐱',   type: 'community', rarity: 'rare',      poiCategory: 'landmark' },
  { id: 'bobtail_cat',      species: 'Bobtail Cat',      emoji: '🐈',   type: 'community', rarity: 'rare',      poiCategory: 'heritage' },
  { id: 'polydactyl_cat',   species: 'Polydactyl Cat',   emoji: '🐾',   type: 'community', rarity: 'rare',      poiCategory: 'museum' },
  { id: 'one_eyed_cat',     species: 'One-eyed Cat',     emoji: '🐱',   type: 'community', rarity: 'rare',      poiCategory: 'heritage' },
  { id: 'longhaired_cat',   species: 'Long-haired Cat',  emoji: '🐱',   type: 'community', rarity: 'rare',      poiCategory: 'arts' },
  { id: 'fat_cat',          species: 'Fat Cat',          emoji: '🐈',   type: 'community', rarity: 'rare',      poiCategory: 'landmark' },
  { id: 'singapura_cat',    species: 'Singapura Cat',    emoji: '🐱',   type: 'community', rarity: 'rare',      poiCategory: 'landmark' },

  // Wild Cat - Epic
  { id: 'clouded_leopard',  species: 'Clouded Leopard',  emoji: '🐆',   type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'malayan_tiger',    species: 'Malayan Tiger',    emoji: '🐯',   type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'fishing_cat',      species: 'Fishing Cat',      emoji: '🐱',   type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'flat_headed_cat',  species: 'Flat-headed Cat',  emoji: '🐱',   type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },
  { id: 'leopard_cat',      species: 'Leopard Cat',      emoji: '🐆',   type: 'wild',      rarity: 'epic',      poiCategory: 'nature' },

  // Mythic - Legendary (not in hatch pool)
  { id: 'merlion',          species: 'Merlion',          emoji: '🦁',   type: 'mythic',    rarity: 'legendary', poiCategory: 'landmark' },
  { id: 'stone_lion',       species: 'Stone Lion',       emoji: '🦁',   type: 'mythic',    rarity: 'legendary', poiCategory: 'heritage' },
  { id: 'white_tiger',      species: 'White Tiger',      emoji: '🐯',   type: 'mythic',    rarity: 'legendary', poiCategory: 'nature' },
  { id: 'singa',            species: 'Singa',            emoji: '🦁',   type: 'mythic',    rarity: 'legendary', poiCategory: 'landmark' },
]

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
