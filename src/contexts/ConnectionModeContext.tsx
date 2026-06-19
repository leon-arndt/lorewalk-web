import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type ConnectionMode = 'online' | 'offline'

interface ConnectionModeContextValue {
  mode: ConnectionMode
  setMode: (mode: ConnectionMode) => void
}

const ConnectionModeContext = createContext<ConnectionModeContextValue | null>(null)

export function ConnectionModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ConnectionMode>('offline')

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
