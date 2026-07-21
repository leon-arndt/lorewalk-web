import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { pageBackground } from '@/lib/glass'

const FEATURE_ROWS: { icon: string; label: string; basic: boolean; premium: string }[] = [
  { icon: '🗺️', label: 'Standard landmarks', basic: true, premium: 'All landmarks' },
  { icon: '🔓', label: 'Premium-only landmarks', basic: false, premium: 'Unlocked' },
  { icon: '🏅', label: 'Monthly medal challenge', basic: false, premium: 'Real physical medal' },
]

interface PremiumModalProps {
  onClose: () => void
  context?: string
}

export function PremiumModal({ onClose, context }: PremiumModalProps) {
  const { subscribePremium } = useProfile()
  const { mode } = useConnectionMode()
  const [flash, setFlash] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe() {
    if (mode === 'offline') {
      subscribePremium()
      setSubscribed(true)
      setFlash('✅ Test purchase complete - Premium unlocked!')
      setTimeout(onClose, 1400)
    } else {
      setFlash('Real payments coming soon - switch to offline mode to test Premium.')
      setTimeout(() => setFlash(null), 2800)
    }
  }

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '92vh',
          background: pageBackground,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>

        <button
          onClick={onClose}
          data-sfx="close"
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 14, border: 'none', background: 'transparent',
            fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>

        <div style={{ overflowY: 'auto', padding: '4px 20px calc(24px + env(safe-area-inset-bottom))' }}>
          <div style={{ textAlign: 'center', padding: '14px 8px 4px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            }}>
              <span style={{ fontSize: 28 }}>👑</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#1e293b' }}>Go Premium</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {context ?? 'Unlock everything Lorewalk has to offer'}
            </div>
          </div>

          <div style={{
            marginTop: 14, borderRadius: 18, overflow: 'hidden',
            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 52px 52px',
              alignItems: 'center', padding: '10px 14px',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <span />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>Basic</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textAlign: 'center' }}>Premium</span>
            </div>

            {FEATURE_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 52px 52px',
                  alignItems: 'center', padding: '10px 14px',
                  borderBottom: i === FEATURE_ROWS.length - 1 ? 'none' : '1px solid #f8fafc',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                  <span style={{ fontSize: 15 }}>{row.icon}</span> {row.label}
                </span>
                <span style={{ textAlign: 'center', color: row.basic ? '#16a34a' : '#e2e8f0', fontSize: 16 }}>
                  {row.basic ? '✓' : '—'}
                </span>
                <span style={{ textAlign: 'center', color: '#f59e0b', fontSize: 16 }}>✓</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center', margin: '8px 6px 0' }}>
            Physical medals are earned monthly and picked up at the Singapore community event.
          </div>

          <button
            onClick={handleSubscribe}
            disabled={subscribed}
            style={{
              width: '100%', marginTop: 18, padding: '14px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              color: '#78350f', fontSize: 15, fontWeight: 800, cursor: subscribed ? 'default' : 'pointer',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)', opacity: subscribed ? 0.7 : 1,
            }}
          >
            {subscribed ? 'You\'re Premium!' : 'Subscribe - SGD 6.99/mo'}
          </button>
          <div style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>
            Cancel anytime.
          </div>

          {flash && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#16a34a', textAlign: 'center' }}>
              {flash}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
