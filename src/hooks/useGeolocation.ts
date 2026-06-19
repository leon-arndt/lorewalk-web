import { useState, useEffect, useRef } from 'react'
import type { PlayerPosition } from '@/types'

interface GeolocationState {
  position: PlayerPosition | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  })
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: 'Geolocation not supported', loading: false })
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 10_000,
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          },
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState((prev) => ({ ...prev, error: err.message, loading: false }))
      },
      options,
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return state
}
