export interface FoodDef {
  id: string
  name: string
  emoji: string
  xp: number
}

export const FOODS: FoodDef[] = [
  { id: 'nasi_lemak',      name: 'Nasi Lemak',       emoji: '🍛', xp: 35 },
  { id: 'kaya_toast',      name: 'Kaya Toast',        emoji: '🍞', xp: 20 },
  { id: 'chicken_rice',    name: 'Chicken Rice',      emoji: '🍗', xp: 35 },
  { id: 'min_jiang_kueh',  name: 'Min Jiang Kueh',   emoji: '🥞', xp: 20 },
  { id: 'ban_mian',        name: 'Ban Mian',          emoji: '🍜', xp: 35 },
  { id: 'char_kway_teow',  name: 'Char Kway Teow',   emoji: '🥘', xp: 35 },
  { id: 'laksa',           name: 'Laksa',             emoji: '🍲', xp: 35 },
  { id: 'satay',           name: 'Satay',             emoji: '🍢', xp: 35 },
  { id: 'roti_prata',      name: 'Roti Prata',        emoji: '🫓', xp: 20 },
  { id: 'chilli_crab',     name: 'Chilli Crab',       emoji: '🦀', xp: 50 },
  { id: 'bak_kut_teh',     name: 'Bak Kut Teh',       emoji: '🫕', xp: 35 },
  { id: 'popiah',          name: 'Popiah',            emoji: '🌯', xp: 20 },
  { id: 'hokkien_mee',     name: 'Hokkien Mee',       emoji: '🍝', xp: 35 },
  { id: 'rojak',           name: 'Rojak',             emoji: '🥗', xp: 20 },
  { id: 'ice_kachang',     name: 'Ice Kachang',       emoji: '🧊', xp: 20 },
  { id: 'kueh_lapis',      name: 'Kueh Lapis',        emoji: '🎂', xp: 20 },
  { id: 'ondeh_ondeh',     name: 'Ondeh Ondeh',       emoji: '🍡', xp: 20 },
  { id: 'tau_huay',        name: 'Tau Huay',          emoji: '🍮', xp: 20 },
  { id: 'mee_rebus',       name: 'Mee Rebus',         emoji: '🍜', xp: 35 },
  { id: 'durian_pengat',   name: 'Durian Pengat',     emoji: '🍈', xp: 50 },
]

export function getFoodDef(id: string): FoodDef | undefined {
  return FOODS.find((f) => f.id === id)
}

// Total creature power needed to dispatch an expedition for this food. Scales with
// the food's value so premium dishes demand stronger (or more) creatures.
export function foodPowerRequirement(foodId: string): number {
  const def = getFoodDef(foodId)
  if (!def) return 0
  return Math.max(3, Math.round(def.xp / 3.5))   // 20xp -> 6, 35xp -> 10, 50xp -> 14
}

export function randomFood(): FoodDef {
  return FOODS[Math.floor(Math.random() * FOODS.length)]
}
