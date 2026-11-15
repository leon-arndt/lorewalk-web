import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { SINGAPORE_POIS } from '@/data/singapore-pois'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { haversineDistance } from '@/lib/mapUtils'
import type { Poi, PlayerPosition } from '@/types'

const POI_RADIUS_M = 1_000
const REFETCH_MOVE_M = 50

interface PoiRow extends Partial<Poi> {
  latitude?: number
  longitude?: number
  learn_more_url?: string
}

export function usePois(position: PlayerPosition | null) {
  const { mode } = useConnectionMode()
  const [livePois, setLivePois] = useState<Poi[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<{ lat: number; lon: number } | null>(null)
  const requestRef = useRef(0)

  useEffect(() => {
    if (mode !== 'online' || !position) return

    // Re-fetch on true displacement, not on quantized grid cells: skip the RPC
    // until the player has actually moved REFETCH_MOVE_M since the last fetch.
    const last = lastFetchRef.current
    if (last && haversineDistance(last.lat, last.lon, position.latitude, position.longitude) < REFETCH_MOVE_M) {
      return
    }

    // Claimed before the request resolves and never cancelled on a new GPS fix.
    // A fix arrives about once per second, so a cancel-on-change cleanup would
    // drop every response slower than that and the POIs would never load.
    const origin = { lat: position.latitude, lon: position.longitude }
    lastFetchRef.current = origin
    const request = ++requestRef.current

    void (async () => {
      let rows: PoiRow[] = []
      let message: string | null = null
      try {
        const { data, error } = await supabase.rpc('get_pois_near', {
          p_lat: origin.lat,
          p_lon: origin.lon,
          p_radius_m: POI_RADIUS_M,
        })
        if (error) message = error.message
        else rows = (data as PoiRow[] | null) ?? []
      } catch (err) {
        message = err instanceof Error ? err.message : String(err)
      }

      if (request !== requestRef.current) return
      setError(message)
      if (message) {
        // Let the next GPS fix retry instead of waiting for a 50 m move.
        lastFetchRef.current = null
        return
      }
      if (rows.length === 0) {
        setLivePois(null)
        return
      }
      // Supabase RPC returns `latitude`/`longitude`; normalise to `lat`/`lon`.
      setLivePois(rows.map((row) => ({
        ...row,
        lat: row.lat ?? row.latitude,
        lon: row.lon ?? row.longitude,
        learnMoreUrl: row.learnMoreUrl ?? row.learn_more_url,
      })) as Poi[])
    })()
  }, [mode, position])

  // The bundled list shows until a live fetch returns POIs, so the map is never
  // empty while GPS has no fix, the request is slow, or Supabase is unreachable.
  const online = mode === 'online'
  return { pois: online && livePois ? livePois : SINGAPORE_POIS, error: online ? error : null }
}
