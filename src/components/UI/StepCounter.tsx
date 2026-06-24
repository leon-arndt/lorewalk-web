import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'

interface StepCounterProps {
  steps: number
  distanceM: number
}

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const { t } = useLocale()
  const distance = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

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
          {steps.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{t('steps_today', { distance })}</div>
      </div>
    </div>
  )
}
