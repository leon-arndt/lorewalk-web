import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { ShopPage } from '@/pages/ShopPage'

export function CoinCapsule() {
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(8px)',
          border: '1.5px solid #fde68a', borderRadius: 999,
          padding: '7px 14px',
          fontSize: 14, fontWeight: 700, color: '#b45309',
          boxShadow: '0 2px 10px rgba(180,83,9,0.15)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        🪙 {profile.coins.toLocaleString()}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
              maxHeight: '88dvh',
              background: '#f8fafc', borderRadius: '20px 20px 0 0',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{
              flexShrink: 0, display: 'flex', justifyContent: 'center',
              padding: '10px 0 4px', position: 'relative',
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: 'absolute', right: 16, top: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 22, color: '#94a3b8', lineHeight: 1, padding: 4,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <ShopPage />
            </div>
          </div>
        </>
      )}
    </>
  )
}
