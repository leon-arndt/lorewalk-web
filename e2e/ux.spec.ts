import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// Touch and step fixes: a tap on a map marker, the GPS step counter, and the
// character designer. The player stands at Fort Canning. The test serves a
// tiny map style, so it needs no tile server.
const HERE = { latitude: 1.2935, longitude: 103.8455 }
test.use({ viewport: { width: 390, height: 760 }, geolocation: { ...HERE, accuracy: 5 }, permissions: ['geolocation'] })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

interface TestWindow {
  _map: {
    jumpTo: (o: { center: [number, number]; pitch: number; zoom: number }) => void
    panBy: (offset: [number, number], o: { animate: boolean }) => void
    project: (p: [number, number]) => { x: number; y: number }
  }
  _ambience: (o: { hour?: number; rain?: number; cloud?: number } | null) => void
}

async function open(page: Page, path = '/', overrides: Record<string, unknown> = {}) {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
  await page.goto(path)
}

const profile = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk_profile')!))

test('a press on a food marker far from the top left corner opens its panel', async ({ page }) => {
  await open(page)
  await page.waitForFunction(() => '_ambience' in window)
  await page.evaluate(() => (window as unknown as TestWindow)._ambience({ hour: 12, rain: 0, cloud: 0 }))
  await expect.poll(async () => (await profile(page)).foodNodes.length, { timeout: 15_000 }).toBeGreaterThan(0)
  const node: { id: string; lat: number; lon: number } = (await profile(page)).foodNodes[0]

  // The press squish once scaled the marker's position, so the marker left the
  // pointer. The error grows with the distance from the top left corner.
  await page.evaluate(({ lon, lat }) => {
    const map = (window as unknown as TestWindow)._map
    map.jumpTo({ center: [lon, lat], pitch: 0, zoom: 16.5 })
    map.panBy([-120, -150], { animate: false })
  }, node)
  const marker = page.locator(`[data-food-node="${node.id}"]`)
  await expect(marker).toBeVisible()
  const pt = await page.evaluate(({ lon, lat }) => (window as unknown as TestWindow)._map.project([lon, lat]), node)
  // A real press and release, not a click sent to the element.
  await page.mouse.click(pt.x, pt.y)
  await expect(page.getByRole('button', { name: 'Start expedition' })).toBeVisible()
  expect((await profile(page)).visitHistory).toEqual([])
})

test('the step counter counts a walk that arrives as one fix after another', async ({ page, context }) => {
  await open(page, '/profile')
  await page.waitForTimeout(500)
  // 3 m/s, a fix every half second: each fix is 1.5 m from the one before it,
  // which is less than the drift floor. Only the sum of the fixes clears it.
  const metresPerDegree = 110_574
  for (let i = 1; i <= 18; i++) {
    await context.setGeolocation({ latitude: HERE.latitude + (i * 1.5) / metresPerDegree, longitude: HERE.longitude, accuracy: 5 })
    await page.waitForTimeout(500)
  }
  const steps = await page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk.steps') ?? '{"steps":0}').steps)
  // 27 m is 35 steps. The last leg can still be open.
  expect(steps).toBeGreaterThanOrEqual(20)
  expect(steps).toBeLessThanOrEqual(36)
})

test('the character designer shows every tab without a sideways scroll', async ({ page }) => {
  await open(page, '/customize')
  const tabs = page.getByRole('tablist')
  await expect(page.getByRole('tab')).toHaveCount(7)
  expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)

  await page.getByRole('tab', { name: 'Bottom' }).click()
  const panel = page.getByRole('tabpanel')
  await expect(panel.getByRole('button')).toHaveCount(4)
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  // Each choice is a picture of the avatar with the item on.
  await expect(panel.locator('img')).toHaveCount(4, { timeout: 15_000 })
  await panel.getByRole('button', { name: 'Cargo Pants' }).click()
  await expect.poll(async () => (await profile(page)).appearance.bottomId).toBe('cargo')
})

test('the back button of a page goes to the profile', async ({ page }) => {
  await open(page, '/settings')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/profile$/)
})
