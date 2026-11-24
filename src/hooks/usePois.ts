import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SINGAPORE_POIS } from '@/data/singapore-pois'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import type { Poi } from '@/types'

// The whole Singapore POI set is a few dozen KB, so one island-wide fetch is
// cheaper in egress than re-querying a 1 km radius every time the player moves.
// The radius from the centre covers the island and its offshore POIs.
const SG_CENTRE = { lat: 1.3521, lon: 103.8198 }
const ISLAND_RADIUS_M = 50_000
// Temporary POIs open and close on a schedule, so refresh now and then.
const REFRESH_MS = 15 * 60_000

interface PoiRow extends Partial<Poi> {
  latitude?: number
  longitude?: number
  learn_more_url?: string
}

export function usePois() {
  const { mode } = useConnectionMode()
  const [livePois, setLivePois] = useState<Poi[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'online') return
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined

    async function load() {
      let rows: PoiRow[] = []
      let message: string | null = null
      try {
        const { data, error } = await supabase.rpc('get_pois_near', {
          p_lat: SG_CENTRE.lat,
          p_lon: SG_CENTRE.lon,
          p_radius_m: ISLAND_RADIUS_M,
        })
        if (error) message = error.message
        else rows = (data as PoiRow[] | null) ?? []
      } catch (err) {
        message = err instanceof Error ? err.message : String(err)
      }

      if (cancelled) return
      setError(message)
      if (message) {
        retry = setTimeout(load, 30_000)
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
    }

    void load()
    const refresh = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(refresh)
      clearTimeout(retry)
    }
  }, [mode])

  // The bundled list shows until a live fetch returns POIs, so the map is never
  // empty while the request is slow or Supabase is unreachable.
  const online = mode === 'online'
  return { pois: online && livePois ? livePois : SINGAPORE_POIS, error: online ? error : null }
}
