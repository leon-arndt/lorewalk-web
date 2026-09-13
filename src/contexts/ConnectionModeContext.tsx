import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type ConnectionMode = 'online' | 'offline'

const STORAGE_KEY = 'lorewalk.connectionMode'

interface ConnectionModeContextValue {
  mode: ConnectionMode
  setMode: (mode: ConnectionMode) => void
}

const ConnectionModeContext = createContext<ConnectionModeContextValue | null>(null)

function loadMode(): ConnectionMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'online' ? 'online' : 'offline'
  } catch {
    return 'offline'
  }
}

export function ConnectionModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ConnectionMode>(loadMode)

  // The toggle lives in Settings now, off the main screen, so the choice has to
  // survive a reload instead of silently falling back to offline.
  function setMode(next: ConnectionMode) {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private-mode failures
    }
  }

  return (
    <ConnectionModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ConnectionModeContext.Provider>
  )
}

export function useConnectionMode(): ConnectionModeContextValue {
  const ctx = useContext(ConnectionModeContext)
  if (!ctx) throw new Error('useConnectionMode must be used within ConnectionModeProvider')
  return ctx
}
