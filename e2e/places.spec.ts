import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// The imported places: markers and spots, food at hawker centres, daily finds,
// and the trail of the week. The player stands at Fort Canning. The test
// serves a tiny map style, so it needs no tile server.
const HERE = { latitude: 1.2935, longitude: 103.8455 }
test.use({ viewport: { width: 390, height: 760 }, geolocation: HERE, permissions: ['geolocation'] })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

interface TestWindow {
  _map: {
    jumpTo: (o: { center: [number, number]; pitch: number; zoom: number }) => void
    project: (p: [number, number]) => { x: number; y: number }
  }
  _ambience: (o: { hour?: number; rain?: number; cloud?: number } | null) => void
}

async function open(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
  await page.goto('/')
  await page.waitForFunction(() => '_ambience' in window)
  // A fixed noon without rain, so the test does not depend on the real sky.
  await page.evaluate(() => (window as unknown as TestWindow)._ambience({ hour: 12, rain: 0, cloud: 0 }))
}

const profile = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk_profile')!))

function metres(a: { lat: number; lon: number }, b: { latitude: number; longitude: number }) {
  return Math.hypot((a.lat - b.latitude) * 110_574, (a.lon - b.longitude) * 111_290)
}

test('food nodes show at food spots near the player', async ({ page }) => {
  await open(page)
  await expect.poll(async () => (await profile(page)).foodNodes.length, { timeout: 15_000 }).toBeGreaterThan(0)
  const nodes: { poiId: string; lat: number; lon: number }[] = (await profile(page)).foodNodes
  expect(nodes.length).toBeLessThanOrEqual(5)
  for (const node of nodes) {
    expect(node.poiId).toMatch(/^(nea|osm)-/)
    expect(metres(node, HERE)).toBeLessThan(1600)
  }
})

test('a tap on a daily find gives its coins one time', async ({ page }) => {
  await open(page, { coins: 100 })
  const find = page.getByRole('button', { name: 'Find', exact: true }).first()
  await expect(find).toBeVisible({ timeout: 15_000 })
  const id = await find.getAttribute('data-find')
  // The marker can be off the screen, so the test sends the click to it directly.
  await find.dispatchEvent('click')
  await expect(page.getByText(/^You found /)).toBeVisible()
  await expect(page.locator(`[data-find="${id}"]`)).toHaveCount(0)
  const saved = await profile(page)
  expect(saved.coins).toBeGreaterThan(100)
  expect(saved.daily.finds).toEqual([id])
})

test('rain brings rain finds, and they leave with the rain', async ({ page }) => {
  await open(page)
  const rainFinds = page.getByRole('button', { name: 'Rain find' })
  await expect(page.getByRole('button', { name: 'Find', exact: true }).first()).toBeVisible({ timeout: 15_000 })
  await expect(rainFinds).toHaveCount(0)
  await page.evaluate(() => (window as unknown as TestWindow)._ambience({ hour: 12, rain: 1 }))
  await expect(rainFinds.first()).toBeVisible()
  await page.evaluate(() => (window as unknown as TestWindow)._ambience({ hour: 12, rain: 0 }))
  await expect(rainFinds).toHaveCount(0)
})

test('a tap on a marker checks in, and the visit records its tier', async ({ page }) => {
  await open(page)
  // The marker nearest to the player, so the test does not depend on one place.
  const marker = await page.evaluate(async (here) => {
    const file = await (await fetch('/pois/sg-places.json')).json()
    const away = (p: { lat: number; lon: number }) => Math.hypot(p.lat - here.latitude, p.lon - here.longitude)
    return file.places
      .filter((p: { tier: string }) => p.tier === 'marker')
      .reduce((best: { lat: number; lon: number }, p: { lat: number; lon: number }) => (away(p) < away(best) ? p : best))
  }, HERE)
  expect(marker).toBeTruthy()
  // Look straight down at the marker, so its pin is in the middle of the screen.
  await page.evaluate((m) => (window as unknown as TestWindow)._map.jumpTo({ center: [m.lon, m.lat], pitch: 0, zoom: 18 }), marker)
  await expect.poll(async () => {
    const pt = await page.evaluate((m) => (window as unknown as TestWindow)._map.project([m.lon, m.lat]), marker)
    await page.mouse.click(pt.x, pt.y)
    return (await profile(page)).visitHistory.length
  }, { timeout: 15_000 }).toBe(1)
  const visit = (await profile(page)).visitHistory[0]
  expect(visit.poiId).toBe(marker.id)
  expect(visit.tier).toBe('marker')
})

test('the trail of the week chip opens a trail stop without a check-in', async ({ page }) => {
  await open(page)
  const chip = page.getByTestId('trail-chip')
  await expect(chip).toContainText('Trail of the week', { timeout: 15_000 })
  await expect(chip).toContainText('0/5')
  await chip.click()
  await expect(page.getByText('Trail stop')).toBeVisible()
  expect((await profile(page)).visitHistory.length).toBe(0)
})
