import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStepCounter } from '@/hooks/useStepCounter'
import { useProfile } from '@/contexts/ProfileContext'
import { localDateKey } from '@/lib/profile'
import type { PlayerPosition } from '@/types'

interface PlayerLocationContextValue {
  position: PlayerPosition | null
  gpsError: string | null
  gpsLoading: boolean
  steps: number
  distanceM: number
  addDevSteps: (n: number) => void
}

const PlayerLocationContext = createContext<PlayerLocationContextValue | null>(null)

// One GPS watch and one step counter for the whole app. Steps hatch eggs and
// count toward the monthly medal, so they must keep counting on every tab, not
// only while the map is mounted.
export function PlayerLocationProvider({ children }: { children: ReactNode }) {
  const { position, error, loading } = useGeolocation()
  const { steps, distanceM, addSteps } = useStepCounter(position)
  const { applyTodaySteps } = useProfile()

  useEffect(() => {
    if (steps > 0) applyTodaySteps(localDateKey(new Date()), steps)
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PlayerLocationContext.Provider value={{
      position, gpsError: error, gpsLoading: loading, steps, distanceM, addDevSteps: addSteps,
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
