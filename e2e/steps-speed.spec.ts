import { test, expect } from '@playwright/test'
import { seedProfile } from './profile-seed'

// Steps come from GPS distance. A leg faster than the limit is a vehicle, so it
// adds no steps. The next leg measures from where the ride ended.
// The limit is 15 km/h.
test.use({ geolocation: { latitude: 1.2935, longitude: 103.8455 }, permissions: ['geolocation'] })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

test('a ride above 15 km/h adds no steps, and walking after it does', async ({ page, context }) => {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await seedProfile(page, {})
  await page.goto('/')
  await expect(page.getByText('0 steps')).toBeVisible()
  await page.waitForTimeout(1500)

  // About 200 m in about a second: far above the limit.
  await context.setGeolocation({ latitude: 1.2953, longitude: 103.8455 })
  await page.waitForTimeout(1500)
  await expect(page.getByText('0 steps')).toBeVisible()

  // About 10 m in 4 seconds: a jog at about 9 km/h.
  await page.waitForTimeout(2500)
  await context.setGeolocation({ latitude: 1.29539, longitude: 103.8455 })
  await expect(page.getByText(/^1\d steps$/)).toBeVisible({ timeout: 5_000 })
})
