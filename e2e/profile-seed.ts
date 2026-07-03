import type { Page } from '@playwright/test'

// Mirrors ACHIEVEMENT_DEFS from profile.ts — needs to stay in sync if new achievements are added.
const ACHIEVEMENT_IDS = [
  'first_step', 'explorer', 'history_buff', 'wanderer', 'legend', 'complete',
  'nature_lover', 'heritage_hunter', 'devout', 'museum_goer',
  'streak_3', 'streak_7', 'level_5', 'level_10',
]
const ACHIEVEMENTS = ACHIEVEMENT_IDS.map((id) => ({ id, name: id, description: '', icon: '⭐', unlockedAt: null }))

const DEFAULT_SQUADS = [
  { id: 'squad-1', name: 'Squad Alpha', slots: [null, null, null, null], expedition: null },
  { id: 'squad-2', name: 'Squad Beta',  slots: [null, null, null, null], expedition: null },
  { id: 'squad-3', name: 'Squad Gamma', slots: [null, null, null, null], expedition: null },
]

export function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-player',
    displayName: 'Test Player',
    level: 3,
    xp: 50,
    totalXp: 350,
    visitHistory: [],
    achievements: ACHIEVEMENTS,
    createdAt: new Date().toISOString(),
    lastVisitDate: null,
    streakDays: 0,
    eggs: [],
    hatchedCreatures: [],
    foodInventory: [],
    foodNodes: [],
    shrineNodes: [],
    stepsAppliedToEggs: 0,
    maxEggSlots: 3,
    bonusCreatureSlots: 0,
    squads: DEFAULT_SQUADS,
    activeSquadId: 'squad-1',
    coins: 500,
    tickets: 0,
    claims: [],
    postcards: [],
    outbox: [],
    weeklyWalk: null,
    dailySteps: {},
    ...overrides,
  }
}

export async function seedProfile(page: Page, overrides: Record<string, unknown> = {}) {
  const profile = makeProfile(overrides)
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
  }, profile)
}
