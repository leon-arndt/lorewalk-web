import { test, expect } from '@playwright/test'
import { seedProfile } from './profile-seed'

// The camera follows the player until the player pans the map. Then it stays,
// and a recenter button brings it back. The test serves a tiny map style, so
// it needs no tile server.
test.use({ viewport: { width: 390, height: 760 }, geolocation: { latitude: 1.2935, longitude: 103.8455 }, permissions: ['geolocation'] })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }
const center = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { _map: { getCenter: () => { lat: number; lng: number } } })._map.getCenter())

test('a pan stops the camera follow, and the recenter button brings it back', async ({ page, context }) => {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await seedProfile(page, {})
  await page.addInitScript(() => localStorage.setItem('lorewalk.connectionMode', 'online'))
  await page.goto('/')
  await expect.poll(async () => (await center(page)).lat, { timeout: 15_000 }).toBeCloseTo(1.2935, 4)

  const recenter = page.getByRole('button', { name: 'Back to my location' })
  await expect(recenter).toHaveCount(0)

  await page.mouse.move(200, 450)
  await page.mouse.down()
  await page.mouse.move(60, 250, { steps: 10 })
  await page.mouse.up()
  await expect(recenter).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as { _map: { isMoving: () => boolean } })._map.isMoving())).toBe(false)

  const panned = await center(page)
  await context.setGeolocation({ latitude: 1.29352, longitude: 103.84552 })
  await page.waitForTimeout(1500)
  const after = await center(page)
  expect(after.lat).toBeCloseTo(panned.lat, 6)
  expect(after.lng).toBeCloseTo(panned.lng, 6)

  await recenter.click()
  await expect(recenter).toHaveCount(0)
  await expect.poll(async () => (await center(page)).lat).toBeCloseTo(1.29352, 5)
})

// Offline mode once framed the default centre after the first GPS fix had
// already moved the camera, so the avatar stood off screen.
test('offline mode frames the player, not the default centre', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await seedProfile(page, {})
  await page.addInitScript(() => localStorage.setItem('lorewalk.connectionMode', 'offline'))
  await page.goto('/')
  await expect.poll(async () => (await center(page)).lat, { timeout: 15_000 }).toBeCloseTo(1.2935, 4)
})
