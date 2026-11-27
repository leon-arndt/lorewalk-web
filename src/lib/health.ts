import { Capacitor } from '@capacitor/core'
import { localDateKey } from '@/lib/profile'

// Android only: the steps that the phone records in Health Connect. The phone
// counts them with its own sensor, also while Lorewalk is closed, so the app
// reads them when it opens. A browser has no such source and counts from GPS.

export interface DaySteps {
  date: string   // local date, the same key profile.dailySteps uses
  steps: number
}

// Health Connect gives a day back only when the app asks for it, so a player
// who did not open the app for a few days still gets those days.
const HISTORY_DAYS = 7

const ENABLED_KEY = 'lorewalk.healthSteps'

// The player turns this on in Settings. The permission prompt shows only then.
export function isHealthStepsEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function setHealthStepsEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, '1')
    else localStorage.removeItem(ENABLED_KEY)
  } catch {
    // ignore quota / private-mode failures
  }
}

// Take the plugin out of the module at each call. A Capacitor plugin answers
// every property, `then` included, so a promise that resolves to the plugin
// itself never settles.
const loadPlugin = () => import('@devmaxime/capacitor-health-connect')

export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { HealthConnect } = await loadPlugin()
    const { availability } = await HealthConnect.checkAvailability()
    return availability === 'Available'
  } catch {
    return false
  }
}

export async function requestStepsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { HealthConnect } = await loadPlugin()
    const { read } = await HealthConnect.requestPermissions({ read: ['Steps'], write: [] })
    return read.includes('Steps')
  } catch {
    return false
  }
}

// The step total of each of the last days, oldest first, today last. Empty
// when the app has no permission or Health Connect does not answer.
export async function readRecentSteps(): Promise<DaySteps[]> {
  if (!Capacitor.isNativePlatform()) return []
  try {
    const { HealthConnect } = await loadPlugin()
    const { read } = await HealthConnect.getGrantedPermissions()
    if (!read.includes('Steps')) return []

    // The plugin cuts the range into 24 hour blocks from the start, so a start
    // at local midnight gives one block for each local day.
    const start = new Date()
    start.setDate(start.getDate() - (HISTORY_DAYS - 1))
    start.setHours(0, 0, 0, 0)
    const { aggregates } = await HealthConnect.aggregateRecords({
      start: start.toISOString(),
      end: new Date().toISOString(),
      type: 'Steps',
      groupBy: 'day',
    })
    return aggregates.map((a) => ({ date: localDateKey(new Date(a.startTime)), steps: Math.round(a.value) }))
  } catch {
    return []
  }
}
