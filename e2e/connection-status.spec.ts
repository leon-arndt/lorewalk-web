import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { seedProfile } from './profile-seed'

// Settings shows whether online mode has a server session. The test answers
// the Supabase auth endpoint itself: first with the error the server gives
// while anonymous sign-ins are off, then with a new anonymous user.

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
const USER_ID = 'aaaaaaaa-2222-4333-8444-555555555555'

test('Settings shows why the sign-in failed, and Retry connects', async ({ page }) => {
  let allow = false
  const cors = { 'access-control-allow-origin': '*' }
  await page.route((url) => url.hostname === HOST, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/v1/signup') {
      if (!allow) return route.fulfill({ status: 422, json: { code: 'anonymous_provider_disabled', msg: 'Anonymous sign-ins are disabled' }, headers: cors })
      const now = Math.floor(Date.now() / 1000)
      const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url')
      return route.fulfill({
        headers: cors,
        json: {
          access_token: `${part({ alg: 'HS256' })}.${part({ sub: USER_ID, exp: now + 3600, role: 'authenticated', is_anonymous: true })}.sig`,
          token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r',
          user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
        },
      })
    }
    return route.fulfill({ json: [], headers: cors })
  })
  await seedProfile(page, {})
  await page.addInitScript(() => localStorage.setItem('lorewalk.connectionMode', 'online'))
  await page.goto('/settings')

  const status = page.getByTestId('connection-status')
  // Without .env.local the build has no server address, and Settings says so
  // instead of the server's message. That case has no Retry button.
  await expect(status).toContainText(/Anonymous sign-ins are disabled|no server address/)

  allow = true
  const retry = status.getByRole('button', { name: 'Retry' })
  if (await retry.count()) await retry.click()
  await expect(status).toContainText('Connected with a guest account (aaaaaaaa)', { timeout: 20_000 })
})
