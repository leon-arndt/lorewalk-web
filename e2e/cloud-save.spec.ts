import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { makeProfile } from './profile-seed'

// The cloud save needs a signed-in Google account and a Supabase project. A
// test has neither, so it seeds a session into localStorage and answers every
// Supabase request itself. No request reaches the real project.

const USER_ID = '11111111-2222-4333-8444-555555555555'

function supabaseHost(): string {
  try {
    const url = readFileSync('.env.local', 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
    if (url) return new URL(url).hostname
  } catch {
    // no .env.local: the client falls back to its placeholder URL
  }
  return 'placeholder.supabase.co'
}

const HOST = supabaseHost()

interface CloudRow {
  profile: Record<string, unknown>
  revision: number
  updated_at: string
}

interface PushBody {
  p_profile: Record<string, unknown>
  p_base_revision: number
}

interface Setup {
  local: Record<string, unknown>
  meta?: { userId: string; revision: number; dirty: boolean; syncedAt: string | null }
  cloud: CloudRow | null
}

// Seeds the device, then stands in for the player_saves table and the
// save_profile RPC with the same revision rule as the migration.
async function setup(page: Page, { local, meta, cloud }: Setup) {
  const server = { row: cloud, pushes: [] as PushBody[] }
  const cors = { 'access-control-allow-origin': '*' }

  await page.route((url) => url.hostname === HOST, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/rest/v1/player_saves') {
      return route.fulfill({ json: server.row ? [server.row] : [], headers: cors })
    }
    if (path === '/rest/v1/rpc/save_profile') {
      const body = route.request().postDataJSON() as PushBody
      server.pushes.push(body)
      if (server.row && server.row.revision !== body.p_base_revision) {
        return route.fulfill({ json: [{ status: 'conflict', revision: server.row.revision }], headers: cors })
      }
      const revision = (server.row?.revision ?? 0) + 1
      server.row = { profile: body.p_profile, revision, updated_at: new Date().toISOString() }
      return route.fulfill({ json: [{ status: 'saved', revision }], headers: cors })
    }
    return route.fulfill({ json: path.startsWith('/auth/') ? {} : [], headers: cors })
  })

  const jwtPart = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const expiresAt = Math.floor(Date.now() / 1000) + 86_400
  const session = {
    access_token: `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: USER_ID, exp: expiresAt, role: 'authenticated', is_anonymous: false })}.sig`,
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: 'test-refresh-token',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'player@example.com',
      is_anonymous: false,
      app_metadata: { provider: 'google' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }

  await page.addInitScript(({ profile, cloudMeta, sessionKey, sessionValue }) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(profile))
    localStorage.setItem('lorewalk.connectionMode', 'online')
    localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
    if (cloudMeta) localStorage.setItem('lorewalk.cloudSave', JSON.stringify(cloudMeta))
  }, { profile: local, cloudMeta: meta, sessionKey: `sb-${HOST.split('.')[0]}-auth-token`, sessionValue: session })

  return server
}

const cloudRow = (overrides: Record<string, unknown>, revision: number): CloudRow => ({
  profile: makeProfile({ id: USER_ID, ...overrides }),
  revision,
  updated_at: '2026-11-20T08:00:00.000Z',
})

test.describe('Cloud save', () => {
  test('a new device takes the cloud save without a question', async ({ page }) => {
    await setup(page, {
      local: makeProfile({ displayName: 'New Phone', level: 1, xp: 0, totalXp: 0 }),
      cloud: cloudRow({ displayName: 'Cloud Player', level: 7 }, 4),
    })
    await page.goto('/profile')
    await expect(page.getByText('Cloud Player')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Adoption pins this device's step count, so its later steps add to the cloud total.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk.stepsApplied') ?? 'null'))).toMatchObject({ steps: 0 })
    const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk.cloudSave') ?? 'null'))
    expect(meta).toMatchObject({ userId: USER_ID, revision: 4, dirty: false })
  })

  test('a newer cloud save replaces a device with no changes of its own', async ({ page }) => {
    await setup(page, {
      local: makeProfile({ id: USER_ID, displayName: 'Old Copy' }),
      meta: { userId: USER_ID, revision: 2, dirty: false, syncedAt: null },
      cloud: cloudRow({ displayName: 'Played Elsewhere' }, 5),
    })
    await page.goto('/profile')
    await expect(page.getByText('Played Elsewhere')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the first sign-in uploads the local profile', async ({ page }) => {
    const server = await setup(page, {
      local: makeProfile({ displayName: 'First Device' }),
      cloud: null,
    })
    await page.goto('/profile')
    await expect.poll(() => server.pushes.length).toBeGreaterThan(0)
    expect(server.pushes[0].p_base_revision).toBe(0)
    // The upload carries the account id, not the old local one.
    expect(server.pushes[0].p_profile).toMatchObject({ id: USER_ID, displayName: 'First Device' })
  })

  test('a local change uploads on top of the revision the device knows', async ({ page }) => {
    const server = await setup(page, {
      local: makeProfile({ id: USER_ID, coins: 0 }),
      meta: { userId: USER_ID, revision: 3, dirty: false, syncedAt: null },
      cloud: cloudRow({ coins: 0 }, 3),
    })
    await page.goto('/profile')
    await page.getByRole('button', { name: /\+100.*🪙/i }).click()
    await expect.poll(() => server.pushes.some((p) => p.p_profile.coins === 100), { timeout: 15_000 }).toBe(true)
    expect(server.pushes[0].p_base_revision).toBe(3)
  })

  test('two unrelated saves ask the player, and "cloud" replaces the device', async ({ page }) => {
    const server = await setup(page, {
      local: makeProfile({ displayName: 'Device Player' }),
      cloud: cloudRow({ displayName: 'Cloud Player', level: 7 }, 4),
    })
    await page.goto('/profile')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Two saves found')).toBeVisible()
    await expect(dialog.getByText(/Level 7/)).toBeVisible()
    await expect(dialog.getByText(/Level 3/)).toBeVisible()

    await dialog.getByRole('button', { name: /Cloud save/ }).click()
    await dialog.getByRole('button', { name: 'Keep this save' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Cloud Player')).toBeVisible()
    // Nothing uploads while the question is open, and the cloud copy stays as it was.
    expect(server.pushes.every((p) => p.p_profile.displayName === 'Cloud Player')).toBe(true)
  })

  test('"this device" overwrites the cloud save', async ({ page }) => {
    const server = await setup(page, {
      local: makeProfile({ displayName: 'Device Player' }),
      cloud: cloudRow({ displayName: 'Cloud Player', level: 7 }, 4),
    })
    await page.goto('/profile')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /This device/ }).click()
    await dialog.getByRole('button', { name: 'Keep this save' }).click()
    await expect(dialog).toHaveCount(0)
    await expect.poll(() => server.row?.profile.displayName).toBe('Device Player')
    expect(server.pushes[0].p_base_revision).toBe(4)
    expect(server.row?.revision).toBe(5)
  })

  test('"decide later" closes the dialog, and Settings opens it again', async ({ page }) => {
    await setup(page, {
      local: makeProfile({ displayName: 'Device Player' }),
      cloud: cloudRow({ displayName: 'Cloud Player' }, 4),
    })
    await page.goto('/settings')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Decide later' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Signed in as player@example.com')).toBeVisible()
    await page.getByRole('button', { name: 'Choose' }).click()
    await expect(dialog.getByText('Two saves found')).toBeVisible()
  })

  test('steps from this device add to steps another device walked today', async ({ page }) => {
    const today = await page.evaluate(() => {
      const d = new Date()
      const p = (n: number) => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    })
    const egg = {
      id: 'egg-1', poiId: 'poi-test', poiName: 'Test Shrine', poiCategory: 'heritage', tier: 'common',
      stepsRequired: 100, stepsProgress: 0, acquiredAt: new Date().toISOString(),
    }
    // The state right after a sync brought in 3000 steps from another device:
    // this device has counted none of them.
    await page.addInitScript(({ profile, day }) => {
      localStorage.setItem('lorewalk_profile', JSON.stringify(profile))
      localStorage.setItem('lorewalk.stepsApplied', JSON.stringify({ date: day, steps: 0 }))
    }, { profile: makeProfile({ eggs: [egg], dailySteps: { [today]: 3000 } }), day: today })
    await page.goto('/profile')
    await page.getByRole('button', { name: /\+100.*steps/i }).first().click()
    await page.waitForFunction((day) => {
      const saved = JSON.parse(localStorage.getItem('lorewalk_profile') ?? '{}')
      return saved.eggs?.[0]?.stepsProgress >= 100 && saved.dailySteps?.[day] === 3100
    }, today)
  })
})
