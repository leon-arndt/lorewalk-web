import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'music-volume'
const DEFAULT_VOLUME = 0.35
const SFX_STORAGE_KEY = 'sfx-enabled'

function readStoredVolume(): number {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved !== null ? Number(saved) : DEFAULT_VOLUME
}

function readStoredSfxEnabled(): boolean {
  const saved = localStorage.getItem(SFX_STORAGE_KEY)
  return saved !== null ? saved === 'true' : true
}

export function useBackgroundMusic(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)
  const [volume, setVolumeState] = useState(readStoredVolume)
  const [sfxEnabled, setSfxEnabledState] = useState(readStoredSfxEnabled)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true

    const initialVolume = readStoredVolume()
    audio.volume = initialVolume
    audioRef.current = audio

    if (initialVolume > 0) {
      const tryPlay = () => {
        if (startedRef.current) return
        audio.play().then(() => { startedRef.current = true }).catch(() => {})
      }
      audio.play()
        .then(() => { startedRef.current = true })
        .catch(() => {
          // Autoplay blocked - wait for first touch/click then start
          document.addEventListener('pointerdown', tryPlay, { once: true })
        })
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    if (volume > 0 && !startedRef.current) {
      audio.play().then(() => { startedRef.current = true }).catch(() => {})
    }
  }, [volume])

  const setVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }

  const setSfxEnabled = (enabled: boolean) => {
    setSfxEnabledState(enabled)
    localStorage.setItem(SFX_STORAGE_KEY, String(enabled))
  }

  return { volume, setVolume, sfxEnabled, setSfxEnabled }
}
