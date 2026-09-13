import { useState, useEffect, useRef, useCallback } from 'react'
import { haversineDistance } from '@/lib/mapUtils'
import { localDateKey } from '@/lib/profile'
import type { PlayerPosition } from '@/types'

// Browsers expose no pedometer, so we estimate steps from GPS displacement.
// Average walking stride ≈ 0.762 m (the value Apple Health / Fitbit default to).
const STRIDE_M = 0.762

// GPS jitters by several metres even while standing still. We only count a leg
// once it clears both the reported accuracy and a hard floor, so drift can't
// inflate the count. We also reject obviously bad fixes and teleport-sized jumps
// (mode switches, tunnels) that would otherwise add hundreds of phantom steps.
const MIN_MOVE_M = 5
const MAX_ACCURACY_M = 35
const MAX_JUMP_M = 250

const STORAGE_KEY = 'lorewalk.steps'

interface StepState {
  steps: number
  distanceM: number
}

interface StoredState extends StepState {
  // Local date, the same key profile.dailySteps uses. A UTC key would roll the
  // count over at 08:00 in Singapore and credit yesterday's steps to today.
  date: string
}

function load(day: string): StepState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as StoredState
      if (stored.date === day) {
        return { steps: stored.steps, distanceM: stored.distanceM }
      }
    }
  } catch {
    // ignore malformed storage
  }
  return { steps: 0, distanceM: 0 }
}

function save(state: StepState, day: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, date: day } satisfies StoredState))
  } catch {
    // ignore quota / private-mode failures
  }
}

export function useStepCounter(position: PlayerPosition | null): StepState & { addSteps: (n: number) => void } {
  const [state, setState] = useState<StepState>(() => load(localDateKey(new Date())))
  const lastRef = useRef<PlayerPosition | null>(null)

  useEffect(() => {
    if (!position) return

    // Roll the count over at midnight.
    const day = localDateKey(new Date(position.timestamp))
    let base = state
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const stored = raw ? (JSON.parse(raw) as StoredState) : null
      if (stored && stored.date !== day) {
        // New day: zero the visible count and forget the prior fix so the first
        // post-midnight move measures from here, not across the day boundary.
        base = { steps: 0, distanceM: 0 }
        setState(base)
        lastRef.current = null
      }
    } catch {
      // ignore
    }

    const last = lastRef.current
    lastRef.current = position

    if (!last) return
    if (position.accuracy > MAX_ACCURACY_M) return

    // Both fixes carry error; a leg is real only if it clears the combined
    // jitter of the two, not just the newer fix's accuracy.
    const driftFloor = Math.max(MIN_MOVE_M, last.accuracy + position.accuracy)
    const d = haversineDistance(last.latitude, last.longitude, position.latitude, position.longitude)
    if (d < driftFloor || d > MAX_JUMP_M) return

    const distanceM = base.distanceM + d
    const next = { steps: Math.round(distanceM / STRIDE_M), distanceM }
    setState(next)
    save(next, day)
  }, [position]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dev cheat: adds steps through the same state the GPS path feeds, so eggs,
  // the journal, and the medal all pick them up the same way as real walking.
  const addSteps = useCallback((n: number) => {
    setState((prev) => {
      const next = { steps: prev.steps + n, distanceM: prev.distanceM + n * STRIDE_M }
      save(next, localDateKey(new Date()))
      return next
    })
  }, [])

  return { ...state, addSteps }
}
