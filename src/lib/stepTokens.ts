import type { StepToken } from '@/types'

// The Monthly Step Goal and the Step Tokens. A month in which a Premium player
// walks the goal is a goal month. A count of goal months earns a physical
// token. See GameDesign.md "Step Tokens".
export const MONTHLY_STEP_GOAL = 200_000

// 'YYYY-MM' of the device clock.
export function currentMonthKey(now = Date.now()): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function stepsInMonth(dailySteps: Record<string, number>, monthKey = currentMonthKey()): number {
  return Object.entries(dailySteps).reduce(
    (sum, [date, steps]) => (date.startsWith(monthKey) ? sum + steps : sum),
    0,
  )
}

// The months that can still become a goal month: this month, and the month
// before it in its first 7 days. The phone gives the steps of the last 7 days,
// so a goal that the player reached on the last day still counts. The
// record_step_goal RPC uses the same rule.
const GRACE_DAYS = 7

export function openGoalMonths(now = Date.now()): string[] {
  const d = new Date(now)
  const current = currentMonthKey(now)
  if (d.getDate() > GRACE_DAYS) return [current]
  return [currentMonthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime()), current]
}

interface GoalState {
  isPremium: boolean
  dailySteps: Record<string, number>
  stepGoalMonths: string[]
}

// Adds each open month that reached the goal. Only a month with Premium counts,
// so a free player gets the profile back as it is.
export function withStepGoalMonths<T extends GoalState>(profile: T, now = Date.now()): T {
  if (!profile.isPremium) return profile
  const reached = openGoalMonths(now).filter(
    (m) => !profile.stepGoalMonths.includes(m) && stepsInMonth(profile.dailySteps, m) >= MONTHLY_STEP_GOAL,
  )
  return reached.length > 0 ? { ...profile, stepGoalMonths: [...profile.stepGoalMonths, ...reached] } : profile
}

// A token comes at 1, 3, 6, and 12 goal months, then every 6 months.
export function nextStepTokenMilestone(after: number): number {
  if (after < 1) return 1
  if (after < 3) return 3
  if (after < 6) return 6
  if (after < 12) return 12
  return after - (after % 6) + 6
}

function highestToken(tokens: StepToken[]): number {
  return tokens.reduce((max, t) => Math.max(max, t.milestone), 0)
}

// The next token of the player, if the goal months reach it. A player collects
// in order, so a token is never skipped.
export function pendingStepToken(goalMonths: number, tokens: StepToken[]): number | null {
  const next = nextStepTokenMilestone(highestToken(tokens))
  return goalMonths >= next ? next : null
}

// The hand-over is the monthly Community Walk, so a player collects one token each month.
export function collectedStepTokenThisMonth(tokens: StepToken[], monthKey = currentMonthKey()): boolean {
  return tokens.some((t) => t.monthKey === monthKey)
}

// The five tokens that the profile page shows: the ladder moves on after the 12-month token.
export function stepTokenLadder(tokens: StepToken[]): number[] {
  const ladder = [1, 3, 6, 12, 18]
  const highest = highestToken(tokens)
  while (highest >= ladder[3]) {
    ladder.push(ladder[4] + 6)
    ladder.shift()
  }
  return ladder
}
