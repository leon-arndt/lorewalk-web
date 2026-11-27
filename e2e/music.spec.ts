import { test, expect, type Page } from '@playwright/test'
import { makeProfile } from './profile-seed'

// The background music stops while the app or the tab is in the background.
// The test serves a tiny map style, so it needs no tile server.
const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7dc' } }] }

interface TestWindow {
  _audios: HTMLAudioElement[]
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

const musicPaused = (page: Page) =>
  page.evaluate(() => (window as unknown as TestWindow)._audios.find((a) => a.loop)?.paused)

test('the music stops in the background and starts again in the foreground', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style }))
  await page.addInitScript((p) => {
    localStorage.setItem('lorewalk_profile', JSON.stringify(p))
    localStorage.setItem('lorewalk.connectionMode', 'offline')
    // The app makes the music element without a DOM node, so keep each one.
    const w = window as unknown as TestWindow
    w._audios = []
    const NativeAudio = window.Audio
    window.Audio = function (src?: string) {
      const audio = new NativeAudio(src)
      w._audios.push(audio)
      return audio
    } as unknown as typeof Audio
  }, makeProfile())
  await page.goto('/profile')

  // A browser can block the music until the first press.
  await page.locator('h1').first().click()
  await expect.poll(() => musicPaused(page)).toBe(false)

  await setHidden(page, true)
  await expect.poll(() => musicPaused(page)).toBe(true)

  await setHidden(page, false)
  await expect.poll(() => musicPaused(page)).toBe(false)
})
