import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { SINGAPORE_POIS } from '@/data/singapore-pois'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { haversineDistance } from '@/lib/mapUtils'
import type { Poi, PlayerPosition } from '@/types'

const POI_RADIUS_M = 1_000
const REFETCH_MOVE_M = 50

export function usePois(position: PlayerPosition | null) {
  const { mode } = useConnectionMode()
  const [pois, setPois] = useState<Poi[]>([])
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    // Offline: show all POIs immediately - no GPS needed, no proximity filter.
    // When online and in Singapore, switch to Supabase for live proximity queries.
    if (mode === 'offline') {
      setPois(SINGAPORE_POIS)
      return
    }

    if (!position) return

    // Re-fetch on true displacement, not on quantized grid cells: skip the RPC
    // until the player has actually moved REFETCH_MOVE_M since the last fetch.
    const last = lastFetchRef.current
    if (last && haversineDistance(last.lat, last.lon, position.latitude, position.longitude) < REFETCH_MOVE_M) {
      return
    }

    let cancelled = false

    async function fetchPois() {
      const { data, error } = await supabase.rpc('get_pois_near', {
        p_lat: position!.latitude,
        p_lon: position!.longitude,
        p_radius_m: POI_RADIUS_M,
      })

      if (cancelled) return
      if (error) { setError(error.message); return }

      lastFetchRef.current = { lat: position!.latitude, lon: position!.longitude }
      // Supabase RPC returns `latitude`/`longitude`; normalise to `lat`/`lon`.
      const pois = ((data as any[]) ?? []).map((row) => ({
        ...row,
        lat: row.lat ?? row.latitude,
        lon: row.lon ?? row.longitude,
      })) as Poi[]
      setPois(pois)
    }

    fetchPois()
    return () => { cancelled = true }
  }, [mode, position])

  return { pois, error }
}
