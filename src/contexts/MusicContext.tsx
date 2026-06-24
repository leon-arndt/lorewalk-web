import { createContext, useContext } from 'react'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

interface MusicContextValue {
  muted: boolean
  toggle: () => void
}

const MusicContext = createContext<MusicContextValue>({ muted: false, toggle: () => {} })

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { muted, toggle } = useBackgroundMusic('/music/town-theme.mp3')
  return <MusicContext.Provider value={{ muted, toggle }}>{children}</MusicContext.Provider>
}

export const useMusic = () => useContext(MusicContext)
