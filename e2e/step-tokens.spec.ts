import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// The Monthly Step Goal and the Step Tokens: a month with the goal and with
// Premium is a goal month, and a count of goal months earns a token. The test
// serves a tiny map style, so it needs no tile server.
test.use({ viewport: { width: 390, height: 760 } })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

async function open(page: Page, overrides: Record<string, unknown>) {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await page.addInitScript((p) => {
    if (localStorage.getItem('lorewalk_profile')) return
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
  await page.goto('/profile')
}

const profile = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk_profile')!))
const pad = (n: number) => String(n).padStart(2, '0')
const now = new Date()
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
const today = `${thisMonth}-${pad(now.getDate())}`
const months = (n: number) => Array.from({ length: n }, (_, i) => `2000-${pad(i + 1)}`)
const premium = { isPremium: true, premiumInterval: 'monthly' }

test('a free player sees the goal, and the month does not count', async ({ page }) => {
  await open(page, { dailySteps: { [today]: 50_000 } })
  const section = page.getByTestId('step-tokens')
  await expect(section).toContainText('Goal months: 0')
  await expect(section).toContainText('50,000 / 200,000 steps')
  await expect(section).toContainText('Only months with Premium count.')

  await section.getByRole('button', { name: 'Go Premium' }).click()
  await expect(page.getByText(/You earn a real metal token after 1, 3, 6, and 12 goal months/)).toBeVisible()
})

test('a month counts when the player has the goal and gets Premium', async ({ page }) => {
  await open(page, { dailySteps: { [today]: 200_000 } })
  const section = page.getByTestId('step-tokens')
  await expect(section).toContainText('Goal reached this month')
  await expect(section).toContainText('Goal months: 0')
  expect((await profile(page)).stepGoalMonths).toEqual([])

  await page.getByRole('button', { name: /Toggle Premium/ }).click()
  await expect(section).toContainText('Goal months: 1')
  await expect(section.getByRole('button', { name: 'Collect the 1-month token' })).toBeVisible()
  expect((await profile(page)).stepGoalMonths).toEqual([thisMonth])
})

test('a Premium player collects the first token', async ({ page }) => {
  await open(page, { ...premium, dailySteps: { [today]: 200_000 } })
  const section = page.getByTestId('step-tokens')
  await expect(section).toContainText('Goal months: 1')
  await section.getByRole('button', { name: 'Collect the 1-month token' }).click()
  await expect(page.getByText('Token ready for pickup!')).toBeVisible()

  const saved = await profile(page)
  expect(saved.stepGoalMonths).toEqual([thisMonth])
  expect(saved.stepTokens.map((x: { milestone: number }) => x.milestone)).toEqual([1])
})

test('the next token waits a month', async ({ page }) => {
  await open(page, { ...premium, stepGoalMonths: months(3) })
  const section = page.getByTestId('step-tokens')
  await section.getByRole('button', { name: 'Collect the 1-month token' }).click()
  await expect(page.getByText('Token ready for pickup!')).toBeVisible()

  // The reward screen ignores a tap in its first 600 ms.
  await page.waitForTimeout(700)
  await page.getByText('Token ready for pickup!').click()
  await expect(section).toContainText('You collect one token each month')
  await expect(section.getByRole('button', { name: /Collect the/ })).toHaveCount(0)

  await page.getByTestId('step-token-1').click()
  await expect(page.getByText(/Collected on/)).toBeVisible()
})

test('a token from an earlier month does not hold the next one', async ({ page }) => {
  const earlier = { milestone: 1, monthKey: '2000-01', claimedAt: '2000-01-15T04:00:00.000Z', claimCode: 'abc123' }
  await open(page, { ...premium, stepGoalMonths: months(3), stepTokens: [earlier] })
  const section = page.getByTestId('step-tokens')
  await expect(section.getByRole('button', { name: 'Collect the 3-month token' })).toBeVisible()

  // A collected token shows its pickup code.
  await page.getByTestId('step-token-1').click()
  await expect(page.getByTestId('step-token-pickup').locator('img')).toBeVisible()
})

test('a Premium player below the goal has no claim', async ({ page }) => {
  await open(page, { ...premium, dailySteps: { [today]: 199_999 } })
  const section = page.getByTestId('step-tokens')
  await expect(section).toContainText('199,999 / 200,000 steps')
  await expect(section.getByRole('button')).toHaveCount(5)
  await page.getByTestId('step-token-1').click()
  await expect(page.getByText('Goal months to go: 1')).toBeVisible()
})

test('the ladder moves on after the 12-month token', async ({ page }) => {
  const tokens = [1, 3, 6, 12].map((milestone, i) => ({ milestone, monthKey: `2000-0${i + 1}`, claimedAt: `2000-0${i + 1}-15T04:00:00.000Z` }))
  await open(page, { ...premium, stepGoalMonths: months(12), stepTokens: tokens })
  const section = page.getByTestId('step-tokens')
  await expect(section.getByTestId('step-token-24')).toBeVisible()
  await expect(section.getByTestId('step-token-1')).toHaveCount(0)
})
