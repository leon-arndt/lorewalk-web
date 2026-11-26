import { test, expect } from '@playwright/test'
import { seedProfile } from './profile-seed'

test('the reward screen closes on a tap almost anywhere, after a short guard', async ({ page }) => {
  await seedProfile(page, { pendingStreakChest: true, streakDays: 7 })
  await page.goto('/profile')
  await page.getByText('Tap to open your reward chest').click()
  const title = page.getByRole('heading', { name: 'Perfect Week!' })
  await expect(title).toBeVisible()
  await expect(page.getByText('Tap anywhere to continue')).toBeVisible()
  await page.waitForTimeout(800)
  await title.click()
  await expect(title).toBeHidden()
})
