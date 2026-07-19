import type { PlayerAppearance } from '@/types'

export interface ColorSwatch {
  id: string
  label: string
  color: number
}

export const SKIN_TONES: ColorSwatch[] = [
  { id: 'porcelain', label: 'Porcelain', color: 0xffe0bd },
  { id: 'ivory',     label: 'Ivory',     color: 0xf1c27d },
  { id: 'honey',     label: 'Honey',     color: 0xe0ac69 },
  { id: 'almond',    label: 'Almond',    color: 0xc68642 },
  { id: 'sienna',    label: 'Sienna',    color: 0x8d5524 },
  { id: 'espresso',  label: 'Espresso',  color: 0x4a2c17 },
]

export const HAIR_COLORS: ColorSwatch[] = [
  { id: 'black',    label: 'Black',    color: 0x0a0a0a },
  { id: 'brown',    label: 'Brown',    color: 0x3b2417 },
  { id: 'chestnut', label: 'Chestnut', color: 0x8b5a2b },
  { id: 'blonde',   label: 'Blonde',   color: 0xd4a017 },
  { id: 'auburn',   label: 'Auburn',   color: 0xb34700 },
  { id: 'silver',   label: 'Silver',   color: 0xd6d6d6 },
]

export const EYE_COLORS: ColorSwatch[] = [
  { id: 'brown',  label: 'Brown',  color: 0x4b3621 },
  { id: 'blue',   label: 'Blue',   color: 0x3b83bd },
  { id: 'green',  label: 'Green',  color: 0x4a7c59 },
  { id: 'hazel',  label: 'Hazel',  color: 0xa67b3d },
  { id: 'grey',   label: 'Grey',   color: 0x7d8491 },
  { id: 'amber',  label: 'Amber',  color: 0xb5651d },
]

export type CosmeticSlot = 'top' | 'bottom' | 'shoes' | 'headItem'

export interface CosmeticItemDef {
  id: string
  slot: CosmeticSlot
  label: string
  color: number
}

export const COSMETIC_ITEMS: CosmeticItemDef[] = [
  // Tops
  { id: 'tee',      slot: 'top',      label: 'Tee',        color: 0x6366f1 },
  { id: 'tank',     slot: 'top',      label: 'Tank Top',   color: 0xf59e0b },
  { id: 'hoodie',   slot: 'top',      label: 'Hoodie',     color: 0x475569 },
  { id: 'jacket',   slot: 'top',      label: 'Jacket',     color: 0xa855f7 },

  // Bottoms
  { id: 'shorts',   slot: 'bottom',   label: 'Shorts',     color: 0x334155 },
  { id: 'jeans',    slot: 'bottom',   label: 'Jeans',      color: 0x3b5b8c },
  { id: 'cargo',    slot: 'bottom',   label: 'Cargo Pants',color: 0x5b6650 },
  { id: 'skirt',    slot: 'bottom',   label: 'Skirt',      color: 0xdb2777 },

  // Shoes
  { id: 'sneakers', slot: 'shoes',    label: 'Sneakers',   color: 0xf8fafc },
  { id: 'sandals',  slot: 'shoes',    label: 'Sandals',    color: 0xca8a04 },
  { id: 'boots',    slot: 'shoes',    label: 'Boots',      color: 0x44403c },
  { id: 'flipflops',slot: 'shoes',    label: 'Flip-flops', color: 0x22c55e },

  // Head items
  { id: 'none',     slot: 'headItem', label: 'None',       color: 0x000000 },
  { id: 'cap',      slot: 'headItem', label: 'Cap',        color: 0xef4444 },
  { id: 'sunhat',   slot: 'headItem', label: 'Sun Hat',    color: 0xfde68a },
  { id: 'beanie',   slot: 'headItem', label: 'Beanie',     color: 0x1d4ed8 },
]

const ITEM_BY_ID = new Map(COSMETIC_ITEMS.map((i) => [i.id, i]))
const SKIN_BY_ID = new Map(SKIN_TONES.map((s) => [s.id, s]))
const HAIR_BY_ID = new Map(HAIR_COLORS.map((h) => [h.id, h]))
const EYE_BY_ID = new Map(EYE_COLORS.map((e) => [e.id, e]))

export function cosmeticItemById(id: string): CosmeticItemDef | undefined {
  return ITEM_BY_ID.get(id)
}

export function cosmeticItemsBySlot(slot: CosmeticSlot): CosmeticItemDef[] {
  return COSMETIC_ITEMS.filter((i) => i.slot === slot)
}

export function skinToneById(id: string): ColorSwatch | undefined {
  return SKIN_BY_ID.get(id)
}

export function hairColorById(id: string): ColorSwatch | undefined {
  return HAIR_BY_ID.get(id)
}

export function eyeColorById(id: string): ColorSwatch | undefined {
  return EYE_BY_ID.get(id)
}

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export const DEFAULT_APPEARANCE: PlayerAppearance = {
  skinToneId: SKIN_TONES[1].id,
  hairColorId: HAIR_COLORS[0].id,
  eyeColorId: EYE_COLORS[0].id,
  topId: 'tee',
  bottomId: 'jeans',
  shoesId: 'sneakers',
  headItemId: 'none',
}
