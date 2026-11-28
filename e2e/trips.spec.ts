import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// Creatures on a trip walk to the place and back along a dashed line, and the
// map holds its frame rate down while nothing moves. The player stands at Fort
// Canning. The test serves a tiny map style, so it needs no tile server.
const HERE = { latitude: 1.2935, longitude: 103.8455 }
test.use({ viewport: { width: 390, height: 760 }, geolocation: { ...HERE, accuracy: 5 }, permissions: ['geolocation'] })

const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

interface Line { geometry: { coordinates: [number, number][] } }
interface TestWindow {
  _map: {
    on: (event: string, fn: () => void) => void
    off: (event: string, fn: () => void) => void
    getSource: (id: string) => { serialize: () => { data: { features: Line[] } } } | undefined
  }
}

const CREATURE = {
  id: 'creature-1', species: 'Kampung Chicken', emoji: '🐔', creatureType: 'heritage',
  poiOriginId: 'poi-test', poiOriginName: 'Test Shrine', poiCategory: 'heritage',
  hatchedAt: new Date().toISOString(), level: 1, xp: 0,
}

const NODE = { lat: 1.2952, lon: 103.844 }

// A food node with a trip that began `agoMs` ago and takes `totalMs`.
function foodTrip(agoMs: number, totalMs: number) {
  const now = Date.now()
  return {
    id: 'fn-1', foodId: 'kaya_toast', ...NODE, poiId: 'spot-1', poiName: 'Test Kopitiam', poiCategory: 'heritage',
    spawnedAt: new Date(now).toISOString(),
    expedition: {
      creatureIds: ['creature-1'],
      startedAt: new Date(now - agoMs).toISOString(),
      returnsAt: new Date(now - agoMs + totalMs).toISOString(),
      fromLat: HERE.latitude, fromLon: HERE.longitude,
    },
  }
}

async function open(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
  await page.goto('/')
  await page.waitForFunction(() => '_map' in window)
}

const routes = (page: Page) => page.evaluate(() => {
  const source = (window as unknown as TestWindow)._map.getSource('trip-routes')
  return source ? source.serialize().data.features.map((f) => f.geometry.coordinates) : []
})

test('a trip draws a line from where it set out to the place, then from the place to the player', async ({ page }) => {
  // 4 seconds into a trip of 20: the creatures walk out until second 9.
  await open(page, { hatchedCreatures: [CREATURE], foodNodes: [foodTrip(4_000, 20_000)] })
  await expect.poll(() => routes(page), { timeout: 10_000 }).toEqual([
    [[HERE.longitude, HERE.latitude], [NODE.lon, NODE.lat]],
  ])
  // From second 11 they walk back.
  await expect.poll(() => routes(page), { timeout: 15_000 }).toEqual([
    [[NODE.lon, NODE.lat], [HERE.longitude, HERE.latitude]],
  ])
})

test('a trip that is home draws no line, and its food is ready', async ({ page }) => {
  await open(page, { hatchedCreatures: [CREATURE], foodNodes: [foodTrip(60_000, 20_000)] })
  await expect(page.locator('[data-food-node="fn-1"]')).toBeVisible()
  expect(await routes(page)).toEqual([])
  await page.locator('[data-food-node="fn-1"]').click()
  await expect(page.getByRole('button', { name: /collect/i })).toBeVisible()
})

test('the map draws at most 30 frames a second while nothing moves', async ({ page }) => {
  await open(page)
  const framesInTwoSeconds = () => page.evaluate(() => new Promise<number>((resolve) => {
    const map = (window as unknown as TestWindow)._map
    let n = 0
    const count = () => { n++ }
    map.on('render', count)
    setTimeout(() => { map.off('render', count); resolve(n) }, 2_000)
  }))
  // The camera ease to the first GPS fix and each model that loads draw frames
  // of their own, so the count goes down to the idle rate after a moment. The
  // browser refreshes 60 times a second, and without the limit the map draws
  // on each one.
  await expect.poll(framesInTwoSeconds, { timeout: 20_000 }).toBeLessThanOrEqual(66)
  // The companions animate, so the map does not stop.
  expect(await framesInTwoSeconds()).toBeGreaterThan(20)
})
