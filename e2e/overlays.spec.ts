import { test, expect, type Page } from '@playwright/test'
import { seedProfile } from './profile-seed'

// A page that scrolls has a glass blur and a slide transform. Either one makes the
// page the box for a position: fixed child, so an overlay rendered inside it moves
// with the scroll. Every overlay must cover the screen, wherever the page scrolled to.
async function overlayBox(page: Page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll<HTMLElement>('[data-sfx="close"]')]
      .filter((e) => getComputedStyle(e).position === 'fixed').pop()!
    const r = el.getBoundingClientRect()
    return { top: r.top, height: r.height, viewport: innerHeight, parent: el.parentElement!.tagName }
  })
}

async function expectFullScreen(page: Page) {
  await expect.poll(async () => (await overlayBox(page)).top).toBeCloseTo(0, 0)
  const box = await overlayBox(page)
  expect(box.height).toBeCloseTo(box.viewport, 0)
  expect(box.parent).toBe('BODY')
}

test('creature detail covers the screen after a scroll', async ({ page }) => {
  const creatures = Array.from({ length: 24 }, (_, i) => ({
    id: `c-${i}`, species: 'Kampung Chicken', emoji: '🐔', creatureType: 'heritage',
    poiOriginId: 'poi-test', poiOriginName: 'Test Shrine', poiCategory: 'heritage',
    hatchedAt: new Date().toISOString(), level: 1, xp: 0,
  }))
  await seedProfile(page, { hatchedCreatures: creatures })
  await page.goto('/creatures')
  const last = page.getByText('Kampung Chicken').last()
  await last.scrollIntoViewIfNeeded()
  await last.click()
  await expectFullScreen(page)
})

test('achievement detail covers the screen after a scroll', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profile')
  const badge = page.locator('section', { has: page.getByRole('heading', { name: 'Achievements' }) }).getByRole('button').last()
  await badge.scrollIntoViewIfNeeded()
  await badge.click()
  await expectFullScreen(page)
})
