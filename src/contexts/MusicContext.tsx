import { createContext, useContext } from 'react'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

interface MusicContextValue {
  volume: number
  setVolume: (v: number) => void
  sfxEnabled: boolean
  setSfxEnabled: (enabled: boolean) => void
}

const MusicContext = createContext<MusicContextValue>({
  volume: 0.35, setVolume: () => {}, sfxEnabled: true, setSfxEnabled: () => {},
})

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { volume, setVolume, sfxEnabled, setSfxEnabled } = useBackgroundMusic('/music/town-theme.mp3')
  return <MusicContext.Provider value={{ volume, setVolume, sfxEnabled, setSfxEnabled }}>{children}</MusicContext.Provider>
}

export const useMusic = () => useContext(MusicContext)
