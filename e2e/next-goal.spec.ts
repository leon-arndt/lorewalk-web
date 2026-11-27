import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// Offline mode gives a fixed set of landmarks and needs no GPS fix.
async function seed(page: Page, overrides: Record<string, unknown> = {}) {
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
}

const READY_EGG = {
  id: 'egg-1', poiId: 'poi-1', poiName: 'Peranakan Museum', poiCategory: 'museum',
  stepsRequired: 100, stepsProgress: 100, tier: 'common', obtainedAt: new Date().toISOString(),
}

test('the next stop bar names a landmark, and a tap opens its panel without a check-in', async ({ page }) => {
  await seed(page)
  await page.goto('/')
  const card = page.getByTestId('next-goal')
  await expect(card).toContainText('Go')
  await card.click()
  // The panel is open, so the bar steps aside.
  await expect(card).toHaveCount(0)
  const visits = await page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk_profile')!).visitHistory.length)
  expect(visits).toBe(0)
})

test('a ready egg comes before a landmark, and a tap opens the Creatures tab', async ({ page }) => {
  await seed(page, { eggs: [READY_EGG] })
  await page.goto('/')
  const card = page.getByTestId('next-goal')
  await expect(card).toContainText('An egg is ready to hatch')
  await expect(card).toContainText('Hatch')
  await card.click()
  await expect(page).toHaveURL(/\/creatures$/)
})

test('the week strip is on the Profile page and opens the journal', async ({ page }) => {
  await seed(page)
  await page.goto('/profile')
  await page.getByRole('button', { name: /^S\s*\d+/ }).click()
  await expect(page.getByRole('button', { name: 'Close journal' })).toBeVisible()
})
