import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SINGAPORE_POIS } from '@/data/singapore-pois'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import type { Poi, PlayerPosition } from '@/types'

const POI_RADIUS_M = 1_000

export function usePois(position: PlayerPosition | null) {
  const { mode } = useConnectionMode()
  const [pois, setPois] = useState<Poi[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Offline: show all POIs immediately — no GPS needed, no proximity filter.
    // When online and in Singapore, switch to Supabase for live proximity queries.
    if (mode === 'offline') {
      setPois(SINGAPORE_POIS)
      return
    }

    if (!position) return

    let cancelled = false

    async function fetchPois() {
      const { data, error } = await supabase.rpc('get_pois_near', {
        p_lat: position!.latitude,
        p_lon: position!.longitude,
        p_radius_m: POI_RADIUS_M,
      })

      if (cancelled) return
      if (error) { setError(error.message); return }

      setPois((data as Poi[]) ?? [])
    }

    fetchPois()
    return () => { cancelled = true }
  }, [
    mode,
    position ? Math.round(position.latitude * 1000) : null,
    position ? Math.round(position.longitude * 1000) : null,
  ])

  return { pois, error }
}
