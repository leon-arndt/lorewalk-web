import { useState, useEffect, useRef, useCallback } from 'react'
import { haversineDistance } from '@/lib/mapUtils'
import { localDateKey } from '@/lib/profile'
import type { PlayerPosition } from '@/types'

// Browsers expose no pedometer, so we estimate steps from GPS displacement.
// Average walking stride ≈ 0.762 m (the value Apple Health / Fitbit default to).
export const STRIDE_M = 0.762

// GPS jitters by several metres even while standing still. A leg therefore
// runs from an anchor fix to the first fix that clears both reported accuracies
// and a hard floor, so drift can't inflate the count. The anchor stays in place
// until then: phones report about one fix each second, and a walker moves only
// 1.4 m in that time, so a leg between two neighbour fixes never clears the floor.
// We also reject bad fixes and teleport-sized jumps (mode switches, tunnels)
// that would otherwise add hundreds of phantom steps.
const MIN_MOVE_M = 5
const MAX_ACCURACY_M = 35
const MAX_JUMP_M = 250

// Without a speed from the phone, the speed comes from the fixes of the last
// seconds. A longer window reads the jitter of a player who stands as less speed.
const SPEED_WINDOW_MS = 20_000
const SPEED_MIN_SPAN_MS = 4_000

// Above 15 km/h the player rides a bike, a bus, a train, or a car. A jog stays
// below it. Pokemon GO stops counting at about 10.5 km/h, which also cuts out
// a fast jog. GPS speed is noisy, so this keeps some room above a walk.
export const MAX_WALK_SPEED_MS = 15 / 3.6

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

// Today's step count of this device, for code outside the hook.
export function loadDeviceSteps(day: string): number {
  return load(day).steps
}

function save(state: StepState, day: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, date: day } satisfies StoredState))
  } catch {
    // ignore quota / private-mode failures
  }
}

function metres(a: PlayerPosition, b: PlayerPosition): number {
  return haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude)
}

export function useStepCounter(position: PlayerPosition | null): StepState & { addSteps: (n: number) => void } {
  const [state, setState] = useState<StepState>(() => load(localDateKey(new Date())))
  // Where the current leg starts, and the fixes of the last seconds.
  const anchorRef = useRef<PlayerPosition | null>(null)
  const recentRef = useRef<PlayerPosition[]>([])

  useEffect(() => {
    if (!position) return

    // Roll the count over at midnight.
    const day = localDateKey(new Date(position.timestamp))
    let base = state
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const stored = raw ? (JSON.parse(raw) as StoredState) : null
      if (stored && stored.date !== day) {
        // New day: zero the visible count and forget the anchor so the first
        // post-midnight move measures from here, not across the day boundary.
        base = { steps: 0, distanceM: 0 }
        setState(base)
        anchorRef.current = null
        recentRef.current = []
      }
    } catch {
      // ignore
    }

    if (position.accuracy > MAX_ACCURACY_M) return

    const recent = recentRef.current.filter((p) => position.timestamp - p.timestamp <= SPEED_WINDOW_MS)
    const previous = recent[recent.length - 1]
    recent.push(position)
    recentRef.current = recent

    const anchor = anchorRef.current
    if (!anchor) { anchorRef.current = position; return }

    // A fix in a vehicle starts the leg again and counts nothing. The phone's
    // own speed is the better reading. Without one, use the fixes of the last
    // seconds, or the last two fixes when the phone reports them far apart.
    const oldest = recent[0]
    const from = position.timestamp - oldest.timestamp >= SPEED_MIN_SPAN_MS ? oldest : previous
    const dt = from ? (position.timestamp - from.timestamp) / 1000 : 0
    const speed = position.speed ?? (from ? (dt > 0 ? metres(from, position) / dt : Infinity) : 0)
    if (speed > MAX_WALK_SPEED_MS) {
      // The ride ends here for the speed too, so the first walk after it counts.
      anchorRef.current = position
      recentRef.current = [position]
      return
    }

    // Both fixes carry error; a leg is real only if it clears the combined
    // jitter of the two, not just the newer fix's accuracy.
    const driftFloor = Math.max(MIN_MOVE_M, anchor.accuracy + position.accuracy)
    const d = metres(anchor, position)
    if (d < driftFloor) return
    anchorRef.current = position
    if (d > MAX_JUMP_M) return

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
