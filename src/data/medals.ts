export interface MedalConfig {
  holidayId: string
  title: string       // Singlish punchy name
  subtitle: string    // Event / holiday label
  food: string        // Featured dish
  challenge: string
  ribbonA: string
  ribbonB: string
  faceA: string
  faceB: string
  faceC: string
  rimTop: string
  rimBot: string
}

export const MEDAL_CONFIGS: MedalConfig[] = [
  // Jan — Bak Kwa / CNY Season
  {
    holidayId: 'bak_kwa',
    title: 'Huat Ah!',
    subtitle: 'CNY Season',
    food: 'Bak Kwa',
    challenge: 'Visit 5 landmarks in January',
    ribbonA: '#7c1d0a', ribbonB: '#f97316',
    faceA: '#fed7aa', faceB: '#ea580c', faceC: '#7c1d0a',
    rimTop: 'CHINESE NEW YEAR SEASON',
    rimBot: 'HUAT AH · 发 发 发',
  },
  // Feb — Yu Sheng / CNY
  {
    holidayId: 'yu_sheng',
    title: 'Lo Hei!',
    subtitle: 'Chinese New Year',
    food: 'Yu Sheng',
    challenge: 'Visit 8 heritage sites in Chinatown',
    ribbonA: '#7f1d1d', ribbonB: '#f87171',
    faceA: '#fca5a5', faceB: '#dc2626', faceC: '#7f1d1d',
    rimTop: 'CHINESE NEW YEAR',
    rimBot: 'LO HEI · 捞起',
  },
  // Mar — Ketupat / Hari Raya Aidilfitri
  {
    holidayId: 'ketupat',
    title: 'Selamat!',
    subtitle: 'Hari Raya Aidilfitri',
    food: 'Ketupat & Rendang',
    challenge: 'Walk 60,000 steps in March',
    ribbonA: '#064e3b', ribbonB: '#34d399',
    faceA: '#a7f3d0', faceB: '#059669', faceC: '#064e3b',
    rimTop: 'HARI RAYA AIDILFITRI',
    rimBot: 'SELAMAT · MAAF ZAHIR BATIN',
  },
  // Apr — Kueh Lapis / Good Friday
  {
    holidayId: 'kueh_lapis',
    title: 'Sedap Lah!',
    subtitle: 'Good Friday',
    food: 'Kueh Lapis',
    challenge: 'Try 4 different POI types in April',
    ribbonA: '#134e4a', ribbonB: '#5eead4',
    faceA: '#ccfbf1', faceB: '#0f766e', faceC: '#134e4a',
    rimTop: 'GOOD FRIDAY · KUEH SEASON',
    rimBot: 'SEDAP LAH · APRIL',
  },
  // May — Ondeh-ondeh / Vesak
  {
    holidayId: 'ondeh_ondeh',
    title: 'Namo!',
    subtitle: 'Vesak Day',
    food: 'Ondeh-ondeh',
    challenge: '7-day check-in streak in May',
    ribbonA: '#78350f', ribbonB: '#fcd34d',
    faceA: '#fef3c7', faceB: '#d97706', faceC: '#78350f',
    rimTop: 'VESAK DAY',
    rimBot: 'NAMO BUDDHAYA',
  },
  // Jun — Biryani / Hari Raya Haji
  {
    holidayId: 'biryani',
    title: 'Makan Time!',
    subtitle: 'Hari Raya Haji',
    food: 'Biryani',
    challenge: 'Visit 6 landmarks in June',
    ribbonA: '#713f12', ribbonB: '#fbbf24',
    faceA: '#fef9c3', faceB: '#ca8a04', faceC: '#713f12',
    rimTop: 'HARI RAYA HAJI',
    rimBot: 'MAKAN TIME · SELAMAT EIDUL ADHA',
  },
  // Jul — Chilli Crab / Food Festival
  {
    holidayId: 'chilli_crab',
    title: 'Power Lah!',
    subtitle: 'Singapore Food Festival',
    food: 'Chilli Crab',
    challenge: 'Visit 7 landmarks anywhere in July',
    ribbonA: '#7c1d0a', ribbonB: '#f97316',
    faceA: '#fed7aa', faceB: '#c2410c', faceC: '#7c2d12',
    rimTop: 'SINGAPORE FOOD FESTIVAL',
    rimBot: 'POWER LAH · BEST IN THE WORLD',
  },
  // Aug — Chicken Rice / National Day
  {
    holidayId: 'chicken_rice',
    title: 'Majulah!',
    subtitle: 'National Day',
    food: 'Hainanese Chicken Rice',
    challenge: 'Visit 9 landmarks on National Day',
    ribbonA: '#7f1d1d', ribbonB: '#ef4444',
    faceA: '#fca5a5', faceB: '#dc2626', faceC: '#5a0000',
    rimTop: 'NATIONAL DAY · 9 AUGUST',
    rimBot: 'MAJULAH SINGAPURA',
  },
  // Sep — Mooncake / Mid-Autumn
  {
    holidayId: 'mooncake',
    title: 'Steady!',
    subtitle: 'Mid-Autumn Festival',
    food: 'Mooncake',
    challenge: 'Visit 5 landmarks at night in September',
    ribbonA: '#1e1b4b', ribbonB: '#818cf8',
    faceA: '#c7d2fe', faceB: '#4338ca', faceC: '#1e1b4b',
    rimTop: 'MID-AUTUMN FESTIVAL',
    rimBot: 'STEADY · 中秋快乐',
  },
  // Oct — Murukku / Deepavali
  {
    holidayId: 'prata',
    title: 'Vandakam!',
    subtitle: 'Deepavali',
    food: 'Prata',
    challenge: 'Visit 5 religious or arts sites in October',
    ribbonA: '#4c1d95', ribbonB: '#c084fc',
    faceA: '#c4b5fd', faceB: '#7c3aed', faceC: '#3b0764',
    rimTop: 'DEEPAVALI',
    rimBot: 'VANDAKAM · FESTIVAL OF LIGHTS',
  },
  // Nov — Laksa / Year-end Walk
  {
    holidayId: 'laksa',
    title: 'Tok Kong!',
    subtitle: 'Year-End Walk',
    food: 'Laksa',
    challenge: 'Walk 50,000 steps in November',
    ribbonA: '#7c2d12', ribbonB: '#fb923c',
    faceA: '#fed7aa', faceB: '#ea580c', faceC: '#431407',
    rimTop: 'YEAR-END COMMUNITY WALK',
    rimBot: 'TOK KONG · LAKSA KING',
  },
  // Dec — Pineapple Tart / Christmas
  {
    holidayId: 'pineapple_tart',
    title: 'Ho Seh!',
    subtitle: 'Christmas',
    food: 'Pineapple Tarts',
    challenge: 'Visit 12 landmarks across December',
    ribbonA: '#14532d', ribbonB: '#4ade80',
    faceA: '#bbf7d0', faceB: '#16a34a', faceC: '#14532d',
    rimTop: 'CHRISTMAS',
    rimBot: 'HO SEH · MERRY CHRISTMAS',
  },
]

const BY_HOLIDAY = new Map(MEDAL_CONFIGS.map((m) => [m.holidayId, m]))

// Maps 2-digit month number to holidayId (works for any year)
const MONTH_TO_HOLIDAY: Record<string, string> = {
  '01': 'bak_kwa',
  '02': 'yu_sheng',
  '03': 'ketupat',
  '04': 'kueh_lapis',
  '05': 'ondeh_ondeh',
  '06': 'biryani',
  '07': 'chilli_crab',
  '08': 'chicken_rice',
  '09': 'mooncake',
  '10': 'prata',
  '11': 'laksa',
  '12': 'pineapple_tart',
}

export function getMedalConfig(monthKey: string): MedalConfig | null {
  const month = monthKey.split('-')[1] // '2026-08' → '08'
  const holidayId = month ? (MONTH_TO_HOLIDAY[month] ?? null) : null
  return holidayId ? (BY_HOLIDAY.get(holidayId) ?? null) : null
}
