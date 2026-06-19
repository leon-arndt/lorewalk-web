import type { Poi } from '@/types'

interface PoiDetailPanelProps {
  poi: Poi
  onClose: () => void
}

export function PoiDetailPanel({ poi, onClose }: PoiDetailPanelProps) {
  const isPermanent = poi.kind === 'permanent'

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      background: '#ffffff',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 32px',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
      zIndex: 10,
    }}>
      {/* Handle bar */}
      <div style={{
        width: 36, height: 4, borderRadius: 2,
        background: '#e2e8f0', margin: '0 auto 16px',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: isPermanent ? '#fff7ed' : '#faf5ff',
            color: isPermanent ? '#ea580c' : '#9333ea',
          }}>
            {isPermanent ? 'Landmark' : 'Event'}
          </span>
          {poi.activeUntil && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Until {new Date(poi.activeUntil).toLocaleDateString()}
            </span>
          )}
          {poi.points !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: '#f0fdf4', color: '#16a34a',
            }}>
              +{poi.points} pts
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f1f5f9', border: 'none', cursor: 'pointer',
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#64748b', lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
        {poi.name}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
        {poi.description}
      </p>

      {poi.learnMoreUrl && (
        <a
          href={poi.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 14, fontSize: 13, fontWeight: 500,
            color: '#6366f1', textDecoration: 'none',
          }}
        >
          Learn more →
        </a>
      )}

      {poi.creatureRewardId && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 12,
          background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#15803d' }}>
            Visit this landmark to unlock a creature
          </span>
        </div>
      )}
    </div>
  )
}
