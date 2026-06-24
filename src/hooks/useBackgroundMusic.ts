import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'music-muted'

export function useBackgroundMusic(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)
  const [muted, setMuted] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.35

    const initialMuted = localStorage.getItem(STORAGE_KEY) === 'true'
    audio.muted = initialMuted
    audioRef.current = audio

    if (!initialMuted) {
      const tryPlay = () => {
        if (startedRef.current) return
        audio.play().then(() => { startedRef.current = true }).catch(() => {})
      }
      audio.play()
        .then(() => { startedRef.current = true })
        .catch(() => {
          // Autoplay blocked — wait for first touch/click then start
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
    audio.muted = muted
    if (!muted && !startedRef.current) {
      audio.play().then(() => { startedRef.current = true }).catch(() => {})
    }
  }, [muted])

  const toggle = () => {
    setMuted((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return { muted, toggle }
}
