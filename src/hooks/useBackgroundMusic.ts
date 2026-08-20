import { useEffect, useRef, useState } from 'react'
import { resolveEvent } from '@/lib/sfx'

const STORAGE_KEY = 'music-volume'
const DEFAULT_VOLUME = 0.18
const SFX_STORAGE_KEY = 'sfx-volume'

function readStoredVolume(): number {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved !== null ? Number(saved) : DEFAULT_VOLUME
}

function readStoredSfxVolume(): number {
  const saved = localStorage.getItem(SFX_STORAGE_KEY)
  return saved !== null ? Number(saved) : 1
}

export function useBackgroundMusic(eventId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)
  const gainRef = useRef(1)
  const [volume, setVolumeState] = useState(readStoredVolume)
  const [sfxVolume, setSfxVolumeState] = useState(readStoredSfxVolume)

  useEffect(() => {
    let audio: HTMLAudioElement | null = null
    let cancelled = false
    let tryPlay = () => {}

    // The track and its level come from the soundbank, so the soundbank editor
    // can swap the music the same way it swaps a UI sound.
    resolveEvent(eventId).then((resolved) => {
      if (cancelled || !resolved) return
      gainRef.current = resolved.event.gain ?? 1
      audio = new Audio(resolved.url)
      audio.loop = resolved.event.loop ?? true

      const initialVolume = readStoredVolume()
      audio.volume = Math.min(1, initialVolume * gainRef.current)
      audioRef.current = audio

      if (initialVolume <= 0) return
      const element = audio
      tryPlay = () => {
        if (startedRef.current) return
        element.play().then(() => { startedRef.current = true }).catch(() => {})
      }
      element.play()
        .then(() => { startedRef.current = true })
        .catch(() => {
          // Autoplay blocked - wait for first touch/click then start
          document.addEventListener('pointerdown', tryPlay, { once: true })
        })
    })

    return () => {
      cancelled = true
      document.removeEventListener('pointerdown', tryPlay)
      if (audio) {
        audio.pause()
        audio.src = ''
      }
      audioRef.current = null
    }
  }, [eventId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.min(1, volume * gainRef.current)
    if (volume > 0 && !startedRef.current) {
      audio.play().then(() => { startedRef.current = true }).catch(() => {})
    }
  }, [volume])

  const setVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }

  const setSfxVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setSfxVolumeState(clamped)
    localStorage.setItem(SFX_STORAGE_KEY, String(clamped))
  }

  return { volume, setVolume, sfxVolume, setSfxVolume }
}
