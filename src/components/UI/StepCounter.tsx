import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'
import { Confetti } from '@/components/UI/Confetti'
import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'

interface StepCounterProps {
  steps: number
  distanceM: number
}

// Fires once per app load (resets on full page reload, not on tab navigation).
let hasAnimatedThisSession = false
const COUNT_UP_MS = 900

const RING_STROKE = 3
const RING_GAP = 5
const RING_CELEBRATED_KEY = 'lorewalk.stepRingCelebratedDate'

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const { t } = useLocale()
  const distance = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

  const [animatedSteps, setAnimatedSteps] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [ringCelebrate, setRingCelebrate] = useState(false)

  const pillRef = useRef<HTMLDivElement>(null)
  const [pillSize, setPillSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = pillRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setPillSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  const progress = Math.min(1, steps / DAILY_STEP_GOAL)
  const showRing = pillSize.width > 0 && pillSize.height > 0
  const pathW = pillSize.width + RING_GAP * 2
  const pathH = pillSize.height + RING_GAP * 2
  const ringRadius = pathH / 2
  const perimeter = 2 * pathW + pathH * (Math.PI - 2)

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {showRing && (
        <svg
          width={pathW + RING_STROKE} height={pathH + RING_STROKE}
          style={{
            position: 'absolute',
            top: -(RING_GAP + RING_STROKE / 2), left: -(RING_GAP + RING_STROKE / 2),
            pointerEvents: 'none',
          }}
        >
          <rect
            x={RING_STROKE / 2} y={RING_STROKE / 2} width={pathW} height={pathH}
            rx={ringRadius} ry={ringRadius} fill="none"
            stroke="rgba(148,163,184,0.28)" strokeWidth={RING_STROKE}
          />
          <rect
            x={RING_STROKE / 2} y={RING_STROKE / 2} width={pathW} height={pathH}
            rx={ringRadius} ry={ringRadius} fill="none"
            stroke={progress >= 1 ? '#22c55e' : '#34d399'} strokeWidth={RING_STROKE} strokeLinecap="round"
            strokeDasharray={perimeter} strokeDashoffset={perimeter * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
      )}
      <div
        ref={pillRef}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          ...glassChrome,
          pointerEvents: 'none', userSelect: 'none',
          animation: ringCelebrate ? 'stepRingPulse 0.6s ease' : undefined,
        }}
      >
        <span style={{ fontSize: 16 }}>👟</span>
        <div style={{ lineHeight: 1.1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            {(animatedSteps ?? steps).toLocaleString()} {t('steps_unit')}
          </div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{t('steps_today', { distance })}</div>
        </div>
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
