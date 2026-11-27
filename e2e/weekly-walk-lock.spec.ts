import { test, expect } from '@playwright/test'
import { seedProfile } from './profile-seed'

test('the weekly walk is locked below level 5, and a tap says when it opens', async ({ page }) => {
  await seedProfile(page, { level: 3 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Weekly Walk' }).click()
  await expect(page.getByText('Unlocks at level 5')).toBeVisible()
  await expect(page.getByText('Weekly Party Walk')).toHaveCount(0)
})

test('the weekly walk opens at level 5', async ({ page }) => {
  await seedProfile(page, { level: 5 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Weekly Walk' }).click()
  await expect(page.getByText('Weekly Party Walk')).toBeVisible()
})
