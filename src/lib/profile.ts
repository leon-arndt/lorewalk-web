import type { Achievement, PlayerProfile, VisitRecord } from '@/types'

// XP needed to go from level N to level N+1
export function xpForNextLevel(level: number): number {
  return level * 100
}

// Apply XP gain, handle level-ups, return updated level + xp
export function applyXp(currentLevel: number, currentXp: number, gained: number) {
  let level = currentLevel
  let xp = currentXp + gained

  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level)
    level++
  }

  return { level, xp }
}

// Streak: did the player also visit yesterday?
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function updateStreak(lastVisitDate: string | null, currentStreak: number): { streakDays: number; lastVisitDate: string } {
  const today = todayStr()
  if (lastVisitDate === today) return { streakDays: currentStreak, lastVisitDate }
  if (lastVisitDate === yesterdayStr()) return { streakDays: currentStreak + 1, lastVisitDate: today }
  return { streakDays: 1, lastVisitDate: today }
}

// ─── Achievement definitions ────────────────────────────────────────────────
const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_step',       name: 'First Step',          icon: '👣', description: 'Visit your first landmark' },
  { id: 'explorer',         name: 'Explorer',            icon: '🗺️', description: 'Visit 5 landmarks' },
  { id: 'history_buff',     name: 'History Buff',        icon: '📜', description: 'Visit 10 landmarks' },
  { id: 'wanderer',         name: 'Wanderer',            icon: '🚶', description: 'Visit 25 landmarks' },
  { id: 'legend',           name: 'Legend of Singapore', icon: '🦁', description: 'Visit 50 landmarks' },
  { id: 'complete',         name: 'Complete Explorer',   icon: '🏆', description: 'Visit all 100 landmarks' },
  { id: 'nature_lover',     name: 'Nature Lover',        icon: '🌿', description: 'Visit 5 nature sites' },
  { id: 'heritage_hunter',  name: 'Heritage Hunter',     icon: '🏛', description: 'Visit 10 heritage sites' },
  { id: 'devout',           name: 'Devout',              icon: '🕌', description: 'Visit 5 religious sites' },
  { id: 'museum_goer',      name: 'Museum Goer',         icon: '🎨', description: 'Visit 3 museums' },
  { id: 'streak_3',         name: 'On a Roll',           icon: '🔥', description: 'Check in 3 days in a row' },
  { id: 'streak_7',         name: 'Week Warrior',        icon: '⚡', description: 'Check in 7 days in a row' },
  { id: 'level_5',          name: 'Rising Explorer',     icon: '⭐', description: 'Reach level 5' },
  { id: 'level_10',         name: 'Seasoned Explorer',   icon: '🌟', description: 'Reach level 10' },
]

export function buildInitialAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, unlockedAt: null }))
}

export function checkAchievements(
  achievements: Achievement[],
  history: VisitRecord[],
  level: number,
  streak: number,
): Achievement[] {
  const total = history.length
  const byCategory = (cat: string) => history.filter((v) => v.poiCategory === cat).length

  const conditions: Record<string, boolean> = {
    first_step:      total >= 1,
    explorer:        total >= 5,
    history_buff:    total >= 10,
    wanderer:        total >= 25,
    legend:          total >= 50,
    complete:        total >= 100,
    nature_lover:    byCategory('nature') >= 5,
    heritage_hunter: byCategory('heritage') >= 10,
    devout:          byCategory('religious') >= 5,
    museum_goer:     byCategory('museum') >= 3,
    streak_3:        streak >= 3,
    streak_7:        streak >= 7,
    level_5:         level >= 5,
    level_10:        level >= 10,
  }

  const now = new Date().toISOString()
  return achievements.map((a) =>
    !a.unlockedAt && conditions[a.id] ? { ...a, unlockedAt: now } : a,
  )
}

// ─── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'lorewalk_profile'

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PlayerProfile
  } catch { /* ignore */ }

  return {
    id: `guest_${Date.now()}`,
    displayName: 'Explorer',
    level: 1,
    xp: 0,
    totalXp: 0,
    visitHistory: [],
    achievements: buildInitialAchievements(),
    createdAt: new Date().toISOString(),
    lastVisitDate: null,
    streakDays: 0,
  }
}

export function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}
