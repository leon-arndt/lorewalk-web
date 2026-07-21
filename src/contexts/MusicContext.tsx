import { createContext, useContext } from 'react'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

interface MusicContextValue {
  volume: number
  setVolume: (v: number) => void
  sfxVolume: number
  setSfxVolume: (v: number) => void
}

const MusicContext = createContext<MusicContextValue>({
  volume: 0.35, setVolume: () => {}, sfxVolume: 1, setSfxVolume: () => {},
})

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { volume, setVolume, sfxVolume, setSfxVolume } = useBackgroundMusic('/music/town-theme.mp3')
  return <MusicContext.Provider value={{ volume, setVolume, sfxVolume, setSfxVolume }}>{children}</MusicContext.Provider>
}

export const useMusic = () => useContext(MusicContext)
