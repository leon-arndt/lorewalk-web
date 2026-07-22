import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'
import { Confetti } from '@/components/UI/Confetti'
import { StepRing } from '@/components/UI/StepRing'
import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'

interface StepCounterProps {
  steps: number
  distanceM: number
}

// Fires once per app load (resets on full page reload, not on tab navigation).
let hasAnimatedThisSession = false
const COUNT_UP_MS = 900

const RING_SIZE = 36
const RING_STROKE = 3
const RING_CELEBRATED_KEY = 'lorewalk.stepRingCelebratedDate'

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const { t } = useLocale()
  const distance = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

  const [animatedSteps, setAnimatedSteps] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [ringCelebrate, setRingCelebrate] = useState(false)

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

  // Celebrate the first time the ring closes today - keyed off the actual date
  // (not a "was it open before" ref) so it still fires correctly if the app is
  // left open across midnight, and only once even across remounts/reloads.
  useEffect(() => {
    if (steps < DAILY_STEP_GOAL) return
    const today = localDateKey(new Date())
    if (localStorage.getItem(RING_CELEBRATED_KEY) === today) return
    localStorage.setItem(RING_CELEBRATED_KEY, today)
    setRingCelebrate(true)
  }, [steps])

  const iconSize = RING_SIZE - RING_STROKE * 2 - 4

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 12px 4px 4px', borderRadius: 999,
        ...glassChrome,
        pointerEvents: 'none', userSelect: 'none',
        animation: ringCelebrate ? 'stepRingPulse 0.6s ease' : undefined,
      }}
    >
      <StepRing progress={steps / DAILY_STEP_GOAL} size={RING_SIZE} stroke={RING_STROKE}>
        <div
          style={{
            width: iconSize, height: iconSize, borderRadius: '50%', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
          }}
        >
          👟
        </div>
      </StepRing>
      <div style={{ lineHeight: 1.1, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          {(animatedSteps ?? steps).toLocaleString()} {t('steps_unit')}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{t('steps_today', { distance })}</div>
      </div>
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
      {ringCelebrate && <Confetti onDone={() => setRingCelebrate(false)} />}
      <style>{`
        @keyframes stepRingPulse {
          0% { transform: scale(1); }
          45% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
