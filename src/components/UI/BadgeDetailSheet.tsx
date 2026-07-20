import type { ReactNode } from 'react'
import { pageBackground } from '@/lib/glass'

interface Props {
  icon: ReactNode
  name: string
  description: string
  status: string
  statusColor: string
  onClose: () => void
}

export function BadgeDetailSheet({ icon, name, description, status, statusColor, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '80vh',
          background: pageBackground,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 24px calc(28px + env(safe-area-inset-bottom))', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 8px' }}>
            {icon}
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{name}</div>

          <p style={{ margin: '10px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            {description}
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
            fontSize: 12, fontWeight: 700, color: statusColor,
            background: `${statusColor}18`, padding: '6px 14px', borderRadius: 999,
          }}>
            {status}
          </div>

          <button onClick={onClose} data-sfx="close" style={{
            width: '100%', marginTop: 24, padding: '12px 0', borderRadius: 14, border: 'none',
            background: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
