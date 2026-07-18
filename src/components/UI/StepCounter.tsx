import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'
import { Confetti } from '@/components/UI/Confetti'

interface StepCounterProps {
  steps: number
  distanceM: number
}

// Fires once per app load (resets on full page reload, not on tab navigation).
let hasAnimatedThisSession = false
const COUNT_UP_MS = 900

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const { t } = useLocale()
  const distance = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

  const [animatedSteps, setAnimatedSteps] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (hasAnimatedThisSession || steps <= 0) return
    const target = steps
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      setAnimatedSteps(Math.round(target * progress))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        // Claimed on completion, not on start - StrictMode's dev-only double-invoke
        // mounts and immediately cleans up a throwaway run; claiming early would let
        // that throwaway run eat the "once per session" flag before the real one starts.
        hasAnimatedThisSession = true
        setAnimatedSteps(null)
        setCelebrate(true)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 999,
      ...glassChrome,
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <span style={{ fontSize: 16 }}>👟</span>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {(animatedSteps ?? steps).toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{t('steps_today', { distance })}</div>
      </div>
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
    </div>
  )
}
