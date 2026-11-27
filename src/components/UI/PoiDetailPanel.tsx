import { useRef, useState } from 'react'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useWikipediaExtract } from '@/hooks/useWikipediaExtract'
import { useProfile } from '@/contexts/ProfileContext'
import { paperCardStyle, paperSheet, paperTag } from '@/lib/paper'
import { haversineDistance } from '@/lib/mapUtils'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { PremiumModal } from '@/components/UI/PremiumModal'
import { deterministicAppearance } from '@/data/cosmetics'
import type { Poi, PlayerPosition } from '@/types'
import type { Translations } from '@/i18n/types'
import { categoryCss, forest, ink, inkSoft, line, ochre, paperShade, ochreInk } from '@/lib/theme'
import { InkButton, Mono, Stamp } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { panelMotion } from '@/lib/motion'

const MOCK_FRIENDS = [
  { id: 'mock-1', name: 'Aisha' },
  { id: 'mock-2', name: 'Rajan' },
  { id: 'mock-3', name: 'Wei Ling' },
]

const CHECKIN_RADIUS_M = 50

// Same category set as the map pins (mapPoiPins.ts) and creature companions (mapCharacters.ts).
function categoryMeta(t: (key: keyof Translations, vars?: Record<string, string | number>) => string): Record<string, { icon: string; label: string }> {
  return {
    heritage:  { icon: '🏛', label: t('category_heritage') },
    landmark:  { icon: '📍', label: t('poi_landmark') },
    arts:      { icon: '🎭', label: t('category_arts') },
    religious: { icon: '🕌', label: t('category_religious') },
    museum:    { icon: '🎨', label: t('category_museum') },
    nature:    { icon: '🌿', label: t('category_nature') },
  }
}


const typed = { fontSize: 12, lineHeight: '16px', color: inkSoft } as const

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
  const wikiExtract = useWikipediaExtract(poi.learnMoreUrl)
  const CATEGORY_META = categoryMeta(t)
  const { sendPostcard } = useProfile()
  const [pickingFriend, setPickingFriend] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
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

  const wash = categoryCss(poi.category ?? '')

  return (
    <motion.div {...panelMotion(isClosing)} style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      ...paperSheet,
      boxShadow: '0 -3px 0 rgba(51,40,30,0.12)',
      borderRadius: '10px 10px 0 0',
      padding: '10px 20px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
      zIndex: 10,
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: ink, margin: '0 auto 6px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px 10px', flexWrap: 'wrap', minHeight: 44, minWidth: 0 }}>
          {poi.category && CATEGORY_META[poi.category] && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', background: wash, border: `1.5px solid ${ink}`, flexShrink: 0 }} />
              <Mono style={{ ...typed, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink }}>
                {CATEGORY_META[poi.category].icon} {CATEGORY_META[poi.category].label}
              </Mono>
            </span>
          )}
          <Mono style={{ ...typed, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isPermanent ? t('poi_landmark') : t('poi_event')}
          </Mono>
          {poi.points !== undefined && (
            <Mono style={{ ...typed, fontWeight: 500, color: forest }}>
              {t('poi_pts', { pts: poi.points })}
            </Mono>
          )}
          {distanceM !== null && mode === 'online' && (
            <Mono style={typed}>
              {distanceM < 1000 ? `${distanceM}m away` : `${(distanceM / 1000).toFixed(1)}km away`}
            </Mono>
          )}
        </div>
        <button
          onClick={onClose}
          data-sfx="close"
          style={{
            flexShrink: 0, width: 44, height: 44, marginRight: -8, padding: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          }}
          aria-label={t('common_close')}
        >
          <span style={{
            ...paperTag, width: 30, height: 30, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: 1,
          }}>
            ×
          </span>
        </button>
      </div>

      <h2 style={{ margin: '2px 0 8px', fontSize: 24, fontWeight: 600, color: ink, lineHeight: '30px', letterSpacing: '-0.01em' }}>
        {poi.name}
      </h2>
      {isLocked && (
        <div style={{ margin: '0 0 10px' }}>
          <Stamp color={ochreInk} tilt={-2}>{t('poi_premium_locked')}</Stamp>
        </div>
      )}
      <p style={{
        margin: 0, padding: '0 0 0 10px', fontSize: 14, color: inkSoft, lineHeight: 1.55,
        borderLeft: `3px solid ${wash}`,
      }}>
        {wikiExtract ?? poi.description}
      </p>
      {wikiExtract && (
        <Mono style={{ display: 'block', margin: '6px 0 0 13px' }}>
          {t('poi_from_wikipedia')}
        </Mono>
      )}

      <div style={{ marginTop: 18 }}>
        {isVisited ? (
          <div>
            <div style={{
              ...paperCardStyle,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '8px 8px 8px 12px',
              marginBottom: pickingFriend || sent ? 10 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 20 }}>😊</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: forest }}>{t('poi_visited')}</span>
              </div>
              {!sent && (
                <InkButton
                  variant={pickingFriend ? 'paper' : 'ink'}
                  onClick={() => setPickingFriend((v) => !v)}
                  style={{ flexShrink: 0, padding: '0 12px', fontSize: 13 }}
                >
                  {pickingFriend ? 'Cancel' : '📮 Send postcard'}
                </InkButton>
              )}
            </div>

            {sent && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, textAlign: 'center',
                border: `1.5px dashed ${line}`,
              }}>
                <Mono style={{ fontSize: 12, lineHeight: '18px', color: ink }}>
                  Postcard to {sent} - arrives in {import.meta.env.DEV ? '30s' : '48h'} ✉️
                </Mono>
              </div>
            )}

            {pickingFriend && !sent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Mono style={{ display: 'block', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Send to:
                </Mono>
                {MOCK_FRIENDS.map((f) => (
                  <button
                    key={f.id}
                    onClick={(e) => handleSend(f.id, f.name, e)}
                    style={{
                      ...paperCardStyle,
                      display: 'flex', alignItems: 'center', gap: 10, minHeight: 48,
                      padding: '6px 12px', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      position: 'relative', width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: paperShade, border: `1.5px solid ${ink}`, overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PlayerFaceIcon appearance={deterministicAppearance(f.id)} size={24} />
                      </div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: ink }}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isLocked ? (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: inkSoft, fontWeight: 500, textAlign: 'center' }}>
              {t('poi_premium_locked_desc')}
            </p>
            <InkButton
              onClick={() => setShowPremiumModal(true)}
              style={{ width: '100%', background: ochre, color: ink }}
            >
              🛡️ Unlock with Premium
            </InkButton>
          </div>
        ) : mode === 'online' ? (
          <div style={{
            padding: '12px 14px', borderRadius: 4, textAlign: 'center',
            border: '1.5px dashed #8C7A5C',
          }}>
            <Mono style={{ fontSize: 12, lineHeight: '18px', color: inkSoft }}>
              {t('poi_get_closer', { radius: CHECKIN_RADIUS_M })}
              {distanceM !== null && ' ' + t('poi_currently_away', { dist: distanceM })}
            </Mono>
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

      {showPremiumModal && (
        <PremiumModal
          context={`Unlock ${poi.name} and every other Premium landmark`}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </motion.div>
  )
}
