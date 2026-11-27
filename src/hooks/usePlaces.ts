import { useEffect, useState } from 'react'
import { loadPlaces, type PlacesData } from '@/lib/places'

const RETRY_MS = 30_000

// The imported places, or null until the file is here. The game runs without
// them: the map then shows the curated landmarks only.
export function usePlaces(): PlacesData | null {
  const [data, setData] = useState<PlacesData | null>(null)

  useEffect(() => {
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const load = () => {
      void loadPlaces().then((places) => {
        if (cancelled) return
        if (places) setData(places)
        else retry = setTimeout(load, RETRY_MS)
      })
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [])

  return data
}
