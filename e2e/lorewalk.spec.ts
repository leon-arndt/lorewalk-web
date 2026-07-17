import { test, expect } from '@playwright/test'
import { seedProfile } from './profile-seed'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const READY_EGG = {
  id: 'egg-ready',
  poiId: 'poi-test',
  poiName: 'Test Shrine',
  poiCategory: 'heritage',
  tier: 'common',
  stepsRequired: 100,
  stepsProgress: 100,
  acquiredAt: new Date().toISOString(),
}

const TEST_CREATURE = {
  id: 'creature-1',
  species: 'Stone Sprite',
  emoji: '🗿',
  creatureType: 'heritage',
  poiOriginId: 'poi-test',
  poiOriginName: 'Test Shrine',
  poiCategory: 'heritage',
  hatchedAt: new Date().toISOString(),
  level: 1,
  xp: 0,
}

const TEST_FOOD = {
  id: 'food-inv-1',
  foodId: 'kaya_toast',
  acquiredAt: new Date().toISOString(),
}

const VISIT_RECORD = {
  poiId: 'poi-visited',
  poiName: 'Fort Canning',
  poiCategory: 'heritage',
  visitedAt: new Date().toISOString(),
  xpEarned: 50,
  lat: 1.2932,
  lon: 103.8461,
}

const SQUAD_WITH_CREATURE = [
  { id: 'squad-1', name: 'Squad Alpha', slots: ['creature-1', null, null, null], expedition: null },
  { id: 'squad-2', name: 'Squad Beta',  slots: [null, null, null, null], expedition: null },
  { id: 'squad-3', name: 'Squad Gamma', slots: [null, null, null, null], expedition: null },
]

// ── Map and navigation ────────────────────────────────────────────────────────

test.describe('Map and navigation', () => {
  test('app loads and bottom nav is visible', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('map canvas renders within 10 seconds', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('bottom nav links route to correct pages', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Creatures' }).click()
    await expect(page).toHaveURL('/creatures')
    await page.getByRole('link', { name: 'Squads' }).click()
    await expect(page).toHaveURL('/squads')
    await page.getByRole('link', { name: 'Profile' }).click()
    await expect(page).toHaveURL('/profile')
    await page.getByRole('link', { name: 'Map' }).click()
    await expect(page).toHaveURL('/')
  })
})

// ── Creatures page ────────────────────────────────────────────────────────────

test.describe('Creatures page', () => {
  test('shows egg slots and creature collection sections', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/creatures')
    await expect(page.getByText(/hatching/i)).toBeVisible()
    await expect(page.getByText(/collection/i)).toBeVisible()
  })

  test('ready egg shows Tap to hatch label', async ({ page }) => {
    await seedProfile(page, { eggs: [READY_EGG] })
    await page.goto('/creatures')
    await expect(page.getByText('Tap to hatch!')).toBeVisible()
  })

  test('tapping a ready egg opens the hatch reward screen', async ({ page }) => {
    await seedProfile(page, { eggs: [READY_EGG] })
    await page.goto('/creatures')
    await page.getByText('Tap to hatch!').click()
    await expect(page.getByText('Hatched!')).toBeVisible({ timeout: 5_000 })
  })

  test('partial egg shows steps remaining', async ({ page }) => {
    const partialEgg = { ...READY_EGG, id: 'egg-partial', stepsProgress: 50 }
    await seedProfile(page, { eggs: [partialEgg] })
    await page.goto('/creatures')
    await expect(page.getByText('50 steps left')).toBeVisible()
  })

  test('pantry shows food name and tap-to-feed hint when food exists', async ({ page }) => {
    await seedProfile(page, { foodInventory: [TEST_FOOD], hatchedCreatures: [TEST_CREATURE] })
    await page.goto('/creatures')
    await expect(page.getByText('Kaya Toast')).toBeVisible()
    await expect(page.getByText('Tap a creature to feed it.')).toBeVisible()
  })

  test('tapping a creature opens the detail view with food section', async ({ page }) => {
    await seedProfile(page, { foodInventory: [TEST_FOOD], hatchedCreatures: [TEST_CREATURE] })
    await page.goto('/creatures')
    await page.getByText('Stone Sprite').click()
    await expect(page.getByText('Drag a food onto the creature')).toBeVisible()
    await expect(page.getByText('Kaya Toast').last()).toBeVisible()
  })

  test('creature detail view shows release button', async ({ page }) => {
    await seedProfile(page, { foodInventory: [TEST_FOOD], hatchedCreatures: [TEST_CREATURE] })
    await page.goto('/creatures')
    await page.getByText('Stone Sprite').click()
    await expect(page.getByRole('button', { name: /release/i })).toBeVisible()
  })
})

// ── Profile dev cheats ────────────────────────────────────────────────────────

test.describe('Profile dev cheats', () => {
  test('dev cheats panel is visible in dev mode', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/profile')
    await expect(page.getByText(/dev cheats/i)).toBeVisible()
  })

  test('+100 coins cheat updates coin display', async ({ page }) => {
    await seedProfile(page, { coins: 0 })
    await page.goto('/profile')
    await page.getByRole('button', { name: /\+100.*🪙/i }).click()
    // CoinCapsule in top-right shows the updated total
    await expect(page.getByRole('button', { name: /🪙.*100/i })).toBeVisible()
  })

  test('+100 steps cheat hatches a 100-step egg', async ({ page }) => {
    const unreadyEgg = { ...READY_EGG, id: 'egg-unready', stepsProgress: 0 }
    await seedProfile(page, { eggs: [unreadyEgg], stepsAppliedToEggs: 0 })
    await page.goto('/profile')
    await page.getByRole('button', { name: /\+100.*steps/i }).first().click()
    // Wait for saveProfile to write the updated stepsAppliedToEggs before navigating
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('lorewalk_profile')
      if (!raw) return false
      return JSON.parse(raw).stepsAppliedToEggs >= 100
    })
    await page.getByRole('link', { name: 'Creatures' }).click()
    await expect(page.getByText('Tap to hatch!')).toBeVisible()
  })
})

// ── Squads page ───────────────────────────────────────────────────────────────

test.describe('Squads page', () => {
  test('renders squad names', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/squads')
    await expect(page.getByRole('textbox').first()).toHaveValue('Squad Alpha')
  })

  test('creature assigned to a squad slot appears in the grid', async ({ page }) => {
    await seedProfile(page, {
      hatchedCreatures: [TEST_CREATURE],
      squads: SQUAD_WITH_CREATURE,
    })
    await page.goto('/squads')
    // CreaturePreview renders the emoji in a span inside the slot button
    const slot = page.locator('button').filter({ hasText: '🗿' }).first()
    await expect(slot).toBeVisible()
  })

  test('squad with creature shows Send on expedition button', async ({ page }) => {
    await seedProfile(page, {
      hatchedCreatures: [TEST_CREATURE],
      squads: SQUAD_WITH_CREATURE,
    })
    await page.goto('/squads')
    await expect(page.getByRole('button', { name: /send on expedition/i })).toBeVisible()
  })

  test('Send on expedition opens destination picker with visited POIs', async ({ page }) => {
    await seedProfile(page, {
      hatchedCreatures: [TEST_CREATURE],
      squads: SQUAD_WITH_CREATURE,
      visitHistory: [VISIT_RECORD],
    })
    await page.goto('/squads')
    await page.getByRole('button', { name: /send on expedition/i }).click()
    await expect(page.getByText('Fort Canning')).toBeVisible()
  })

  test('dispatching expedition to a POI starts it and shows countdown', async ({ page }) => {
    await seedProfile(page, {
      hatchedCreatures: [TEST_CREATURE],
      squads: SQUAD_WITH_CREATURE,
      visitHistory: [VISIT_RECORD],
    })
    await page.goto('/squads')
    await page.getByRole('button', { name: /send on expedition/i }).click()
    await page.getByText('Fort Canning').click()
    // After dispatch, the expedition countdown should appear
    await expect(page.getByText(/\d:\d\d/)).toBeVisible({ timeout: 5_000 })
  })
})

// ── Shrine system (map page) ──────────────────────────────────────────────────

test.describe('Shrine system', () => {
  test('map page renders without error when shrine nodes exist in profile', async ({ page }) => {
    const shrineNode = {
      id: 'shrine-1',
      poiId: 'poi-shrine',
      poiName: 'Dragon Temple',
      poiCategory: 'religious',
      lat: 1.2935,
      lon: 103.8445,
      difficulty: 15,
      spawnedAt: new Date().toISOString(),
      expedition: null,
      clearedUntil: null,
    }
    await seedProfile(page, { hatchedCreatures: [TEST_CREATURE], shrineNodes: [shrineNode] })
    await page.goto('/')
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 })
    // Nav still functional - no crash
    await expect(page.locator('nav')).toBeVisible()
  })
})
