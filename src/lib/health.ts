import { Capacitor } from '@capacitor/core'

export type StepRecord = {
  count: number
  startTime: Date
  endTime: Date
}

export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const { HealthConnect } = await import('@devmaxime/capacitor-health-connect')
  const { availability } = await HealthConnect.checkAvailability()
  return availability === 'Available'
}

export async function requestStepsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  const { HealthConnect } = await import('@devmaxime/capacitor-health-connect')
  const { read } = await HealthConnect.requestPermissions({ read: ['Steps'], write: [] })
  return read.includes('Steps')
}

// Returns total steps for today. Returns a deterministic stub in the browser.
export async function getTodaySteps(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 4217

  const { HealthConnect } = await import('@devmaxime/capacitor-health-connect')
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { aggregates } = await HealthConnect.aggregateRecords({
    start: startOfDay.toISOString(),
    end: new Date().toISOString(),
    type: 'Steps',
  })

  return aggregates.reduce((sum, a) => sum + a.value, 0)
}

// Returns daily step totals for the past N days.
export async function getStepsForDays(days: number): Promise<StepRecord[]> {
  if (!Capacitor.isNativePlatform()) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const end = new Date(d)
      end.setHours(23, 59, 59, 999)
      return { count: Math.floor(Math.random() * 8000) + 2000, startTime: d, endTime: end }
    })
  }

  const { HealthConnect } = await import('@devmaxime/capacitor-health-connect')
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const { aggregates } = await HealthConnect.aggregateRecords({
    start: start.toISOString(),
    end: new Date().toISOString(),
    type: 'Steps',
    groupBy: 'day',
  })

  return aggregates.map(a => ({
    count: a.value,
    startTime: new Date(a.startTime),
    endTime: new Date(a.endTime),
  }))
}
