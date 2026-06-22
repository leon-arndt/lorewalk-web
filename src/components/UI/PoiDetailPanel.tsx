import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { haversineDistance } from '@/lib/mapUtils'
import type { Poi, PlayerPosition } from '@/types'

const CHECKIN_RADIUS_M = 50

interface PoiDetailPanelProps {
  poi: Poi
  isVisited: boolean
  position: PlayerPosition | null
  onCheckIn: () => void
  onClose: () => void
}

export function PoiDetailPanel({ poi, isVisited, position, onCheckIn, onClose }: PoiDetailPanelProps) {
  const { mode } = useConnectionMode()
  const { t } = useLocale()
  const isPermanent = poi.kind === 'permanent'

  const distanceM = position
    ? Math.round(haversineDistance(position.latitude, position.longitude, poi.lat, poi.lon))
    : null

  const canCheckIn = mode === 'offline' || (distanceM !== null && distanceM <= CHECKIN_RADIUS_M)

  return (
    <div style={{
      position: 'absolute',
      bottom: 60, left: 0, right: 0,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRadius: '20px 20px 0 0',
      borderTop: '1px solid rgba(255,255,255,0.6)',
      padding: '20px 20px 36px',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
      zIndex: 10,
    }}>
      {/* Handle bar */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 16px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: isPermanent ? '#fff7ed' : '#faf5ff',
            color: isPermanent ? '#ea580c' : '#9333ea',
          }}>
            {isPermanent ? t('poi_landmark') : t('poi_event')}
          </span>
          {poi.points !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: '#f0fdf4', color: '#16a34a',
            }}>
              {t('poi_pts', { pts: poi.points })}
            </span>
          )}
          {distanceM !== null && mode === 'online' && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {distanceM < 1000 ? `${distanceM}m away` : `${(distanceM / 1000).toFixed(1)}km away`}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.5)',
            cursor: 'pointer',
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#64748b',
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
            marginTop: 12, fontSize: 13, fontWeight: 500,
            color: '#6366f1', textDecoration: 'none',
          }}
        >
          {t('poi_learn_more')}
        </a>
      )}

      {/* Check-in button */}
      <div style={{ marginTop: 20 }}>
        {isVisited ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, background: '#f0fdf4',
          }}>
            <span style={{ fontSize: 20 }}>😊</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{t('poi_visited')}</span>
          </div>
        ) : canCheckIn ? (
          <button
            onClick={onCheckIn}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: '#6366f1', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}
          >
            {mode === 'offline' ? t('poi_checkin_offline') : t('poi_checkin')}
          </button>
        ) : (
          <div style={{
            padding: '12px 16px', borderRadius: 12, background: '#f8fafc',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              {t('poi_get_closer', { radius: CHECKIN_RADIUS_M })}
              {distanceM !== null && ' ' + t('poi_currently_away', { dist: distanceM })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
