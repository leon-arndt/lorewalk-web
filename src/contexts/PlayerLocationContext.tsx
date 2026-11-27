import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { STRIDE_M, useStepCounter } from '@/hooks/useStepCounter'
import { useProfile } from '@/contexts/ProfileContext'
import { localDateKey } from '@/lib/profile'
import {
  isHealthAvailable, isHealthStepsEnabled, readRecentSteps, requestStepsPermission, setHealthStepsEnabled,
  type DaySteps,
} from '@/lib/health'
import type { PlayerPosition } from '@/types'

// How often the app reads Health Connect while it is open.
const HEALTH_READ_MS = 60_000

interface PlayerLocationContextValue {
  position: PlayerPosition | null
  gpsError: string | null
  gpsLoading: boolean
  steps: number
  distanceM: number
  addDevSteps: (n: number) => void
  // Android only: the steps that the phone records, also while the app is closed.
  healthSteps: {
    available: boolean
    enabled: boolean
    // Turning it on asks for the permission. False when the player refuses.
    setEnabled: (on: boolean) => Promise<boolean>
  }
}

const PlayerLocationContext = createContext<PlayerLocationContextValue | null>(null)

// One GPS watch and one step counter for the whole app. Steps hatch eggs and
// count toward the monthly medal, so they must keep counting on every tab, not
// only while the map is mounted.
export function PlayerLocationProvider({ children }: { children: ReactNode }) {
  const { position, error, loading } = useGeolocation()
  const { steps: gpsSteps, distanceM: gpsDistanceM, addSteps } = useStepCounter(position)
  const { applyTodaySteps } = useProfile()
  const [healthAvailable, setHealthAvailable] = useState(false)
  const [healthEnabled, setHealthEnabledState] = useState(isHealthStepsEnabled)
  const [healthDays, setHealthDays] = useState<DaySteps[]>([])

  useEffect(() => {
    let cancelled = false
    isHealthAvailable().then((ok) => { if (!cancelled) setHealthAvailable(ok) })
    return () => { cancelled = true }
  }, [])

  // Read when the app opens, when it comes back to the foreground, and now and
  // then while it is open. The phone counts in between, so nothing runs in the background.
  const healthOn = healthAvailable && healthEnabled
  useEffect(() => {
    if (!healthOn) return
    let cancelled = false
    const read = () => {
      if (document.visibilityState !== 'visible') return
      readRecentSteps().then((days) => { if (!cancelled) setHealthDays(days) })
    }
    read()
    const timer = setInterval(read, HEALTH_READ_MS)
    document.addEventListener('visibilitychange', read)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', read)
    }
  }, [healthOn])

  const setEnabled = useCallback(async (on: boolean) => {
    if (on && !(await requestStepsPermission())) return false
    setHealthStepsEnabled(on)
    setHealthEnabledState(on)
    return true
  }, [])

  // The phone's count holds every step of the day, and the GPS estimate holds
  // only the walks with the app open. The higher one wins, so no step counts twice.
  const today = localDateKey(new Date())
  const healthToday = healthOn ? (healthDays.find((d) => d.date === today)?.steps ?? 0) : 0
  const steps = Math.max(gpsSteps, healthToday)
  const distanceM = Math.max(gpsDistanceM, steps * STRIDE_M)

  useEffect(() => {
    const pastDays = healthOn ? healthDays.filter((d) => d.date !== today) : []
    if (steps > 0 || pastDays.length > 0) applyTodaySteps(today, steps, pastDays)
  }, [steps, healthDays, healthOn]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PlayerLocationContext.Provider value={{
      position, gpsError: error, gpsLoading: loading, steps, distanceM, addDevSteps: addSteps,
      healthSteps: { available: healthAvailable, enabled: healthEnabled, setEnabled },
    }}>
      {children}
    </PlayerLocationContext.Provider>
  )
}

export function usePlayerLocation(): PlayerLocationContextValue {
  const ctx = useContext(PlayerLocationContext)
  if (!ctx) throw new Error('usePlayerLocation must be used within PlayerLocationProvider')
  return ctx
}
