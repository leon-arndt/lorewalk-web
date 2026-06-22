interface StepCounterProps {
  steps: number
  distanceM: number
}

export function StepCounter({ steps, distanceM }: StepCounterProps) {
  const distanceLabel =
    distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
        padding: '6px 12px', borderRadius: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        pointerEvents: 'none', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 16 }}>👟</span>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {steps.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{distanceLabel} today</div>
      </div>
    </div>
  )
}
