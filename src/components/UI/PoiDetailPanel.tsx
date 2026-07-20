import { useRef, useState } from 'react'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { glassChrome, glassPanel } from '@/lib/glass'
import { haversineDistance } from '@/lib/mapUtils'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { deterministicAppearance } from '@/data/cosmetics'
import type { Poi, PlayerPosition } from '@/types'
import { accent, rewardGradient } from '@/lib/theme'

const MOCK_FRIENDS = [
  { id: 'mock-1', name: 'Aisha' },
  { id: 'mock-2', name: 'Rajan' },
  { id: 'mock-3', name: 'Wei Ling' },
]

const CHECKIN_RADIUS_M = 50

interface PoiDetailPanelProps {
  poi: Poi
  isVisited: boolean
  isLocked?: boolean
  position: PlayerPosition | null
  onClose: () => void
  isClosing?: boolean
}

export function PoiDetailPanel({ poi, isVisited, isLocked = false, position, onClose, isClosing = false }: PoiDetailPanelProps) {
  const { mode } = useConnectionMode()
  const { t } = useLocale()
  const { sendPostcard } = useProfile()
  const [pickingFriend, setPickingFriend] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [plane, setPlane] = useState<{ x: number; y: number; key: number } | null>(null)
  const planeKeyRef = useRef(0)

  function handleSend(friendId: string, friendName: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    planeKeyRef.current += 1
    setPlane({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: planeKeyRef.current })
    sendPostcard(friendId, friendName, { id: poi.id, name: poi.name, category: poi.category ?? 'landmark' })
    setSent(friendName)
    setPickingFriend(false)
  }
  const isPermanent = poi.kind === 'permanent'

  const distanceM = position
    ? Math.round(haversineDistance(position.latitude, position.longitude, poi.lat, poi.lon))
    : null

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      ...glassPanel,
      border: 'none',
      borderRadius: '24px 24px 0 0',
      padding: '20px 20px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
      zIndex: 10,
      animation: isClosing
        ? 'panelSlideDown 0.28s cubic-bezier(0.36,0,0.66,0) forwards'
        : 'panelSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
            background: isPermanent ? 'rgba(255,237,213,0.80)' : 'rgba(250,245,255,0.80)',
            color: isPermanent ? '#ea580c' : '#9333ea',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            {isPermanent ? t('poi_landmark') : t('poi_event')}
          </span>
          {isLocked && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(254,249,195,0.80)',
              color: '#a16207',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>
              {t('poi_premium_locked')}
            </span>
          )}
          {poi.points !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(240,253,244,0.80)',
              color: '#16a34a',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
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
          data-sfx="close"
          style={{
            ...glassChrome,
            cursor: 'pointer',
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#64748b',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.3 }}>
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
            color: accent, textDecoration: 'none',
          }}
        >
          {t('poi_learn_more')}
        </a>
      )}

      <div style={{ marginTop: 20 }}>
        {isVisited ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 16,
              background: 'rgba(240,253,244,0.80)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              marginBottom: pickingFriend || sent ? 10 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>😊</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{t('poi_visited')}</span>
              </div>
              {!sent && (
                <button
                  onClick={() => setPickingFriend((v) => !v)}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    background: pickingFriend ? '#f1f5f9' : accent,
                    color: pickingFriend ? '#64748b' : 'white',
                  }}
                >
                  {pickingFriend ? 'Cancel' : '📮 Send postcard'}
                </button>
              )}
            </div>

            {sent && (
              <div style={{
                padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#fef3c7', color: '#b45309', textAlign: 'center',
              }}>
                Postcard to {sent} - arrives in {import.meta.env.DEV ? '30s' : '48h'} ✉️
              </div>
            )}

            {pickingFriend && !sent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>
                  Send to:
                </div>
                {MOCK_FRIENDS.map((f) => (
                  <button
                    key={f.id}
                    onClick={(e) => handleSend(f.id, f.name, e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
                      background: 'white', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      position: 'relative', width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: rewardGradient,
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PlayerFaceIcon appearance={deterministicAppearance(f.id)} size={24} />
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isLocked ? (
          <div style={{
            padding: '12px 16px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(254,249,195,0.70)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#a16207', fontWeight: 500 }}>
              {t('poi_premium_locked_desc')}
            </p>
          </div>
        ) : mode === 'online' ? (
          <div style={{
            padding: '12px 16px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(248,250,252,0.70)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              {t('poi_get_closer', { radius: CHECKIN_RADIUS_M })}
              {distanceM !== null && ' ' + t('poi_currently_away', { dist: distanceM })}
            </p>
          </div>
        ) : null}
      </div>

      {plane && (
        <span
          key={plane.key}
          onAnimationEnd={() => setPlane(null)}
          style={{
            position: 'fixed',
            left: plane.x, top: plane.y,
            fontSize: 22, zIndex: 1000, pointerEvents: 'none',
            animation: 'postcardPlaneOut 0.85s cubic-bezier(0.3,0,0.4,1) forwards',
          }}
        >
          ✈️
        </span>
      )}
    </div>
  )
}
