import { useLocale } from '@/contexts/LocaleContext'

interface StepCounterProps {
  steps: number
  distanceM: number
}

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const { t } = useLocale()
  const distance = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.50)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.55)',
        padding: '6px 12px', borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        pointerEvents: 'none', userSelect: 'none',
      }}
    >
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
