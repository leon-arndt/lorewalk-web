import { useState } from 'react'

const STORAGE_KEY = 'lorewalk_visited_pois'

function loadVisited(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function useVisitedPois() {
  const [visited, setVisited] = useState<Set<string>>(loadVisited)

  function markVisited(poiId: string) {
    setVisited((prev) => {
      const next = new Set(prev)
      next.add(poiId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  return { visited, markVisited }
}
