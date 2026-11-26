import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// Seeds once per tab, so the reload after a deletion shows what the app itself left behind.
async function seedOffline(page: Page, overrides: Record<string, unknown>) {
  await page.addInitScript((p) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
  }, makeProfile(overrides))
}

async function countDeleteCalls(page: Page) {
  const calls = { n: 0 }
  await page.route('**/rest/v1/rpc/delete_account', (route) => { calls.n++; return route.abort() })
  return calls
}

test('an offline guest sees both buttons, and sign out explains why it is off', async ({ page }) => {
  await seedOffline(page, { id: 'guest_1', displayName: 'Offline Guest' })
  await page.goto('/settings')
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeDisabled()
  await expect(page.getByText('A guest has no login to sign out of.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeEnabled()
})

test('an offline guest can delete, and the device starts over without a server call', async ({ page }) => {
  await seedOffline(page, { id: 'guest_1', displayName: 'Offline Guest' })
  const calls = await countDeleteCalls(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete account' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete forever' }).click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('lorewalk_profile') ?? 'null')?.displayName === 'Explorer')
  expect(calls.n).toBe(0)
})

test('a server account without a session is not deleted from the device alone', async ({ page }) => {
  await seedOffline(page, { id: '00000000-0000-4000-8000-000000000001', displayName: 'Server Player' })
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete account' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByRole('button', { name: 'Delete forever' }).click()
  await expect(dialog.getByText('The account was not deleted.', { exact: false })).toBeVisible()
  const name = await page.evaluate(() => JSON.parse(localStorage.getItem('lorewalk_profile')!).displayName)
  expect(name).toBe('Server Player')
})
