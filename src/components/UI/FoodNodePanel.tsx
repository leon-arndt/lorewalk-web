import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { getFoodDef } from '@/data/foods'
import { expeditionDurationMs } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import { glassPanel, glassChrome } from '@/lib/glass'
import type { FoodNode, PlayerPosition } from '@/types'

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  node: FoodNode
  position: PlayerPosition | null
  onSend: (squadId: string, durationMs: number) => void
  onClose: () => void
  isClosing?: boolean
}

export function FoodNodePanel({ node, position, onSend, onClose, isClosing = false }: Props) {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const def = getFoodDef(node.foodId)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!def) return null

  const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
  const distM = position
    ? Math.round(haversineDistance(position.latitude, position.longitude, node.lat, node.lon))
    : null
  const durationMs = expeditionDurationMs(distM ?? 0)

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      ...glassPanel, border: 'none',
      borderRadius: '24px 24px 0 0',
      padding: '20px 20px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
      zIndex: 10,
      animation: isClosing
        ? 'panelSlideDown 0.28s cubic-bezier(0.36,0,0.66,0) forwards'
        : 'panelSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />

      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          ...glassChrome, cursor: 'pointer',
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#64748b',
        }}
      >×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{def.emoji}</div>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{def.name}</h2>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8' }}>Near {node.poiName}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: '#fef3c7', color: '#b45309',
            }}>
              +{def.xp} creature XP
            </span>
            {distM !== null && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(248,250,252,0.8)', color: '#64748b',
              }}>
                🧭 {distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`} · ⏱ {formatDuration(durationMs)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profile.squads.map((squad) => {
          const members = squad.slots
            .filter((id): id is string => !!id)
            .map((id) => byId.get(id))
            .filter(Boolean)
          const onExp = squad.expedition !== null
          const expReady = onExp && now >= new Date(squad.expedition!.returnsAt).getTime()
          const isEmpty = members.length === 0

          return (
            <div
              key={squad.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', borderRadius: 14,
                background: onExp || isEmpty ? 'rgba(248,250,252,0.6)' : 'rgba(255,247,237,0.8)',
                border: `1px solid ${onExp || isEmpty ? 'rgba(226,232,240,0.6)' : 'rgba(253,186,116,0.5)'}`,
                opacity: onExp || isEmpty ? 0.65 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                  {squad.name}
                </div>
                <div style={{ fontSize: 16, lineHeight: 1 }}>
                  {members.length > 0
                    ? members.map((m) => m!.emoji).join(' ')
                    : <span style={{ fontSize: 11, color: '#94a3b8' }}>No creatures assigned</span>
                  }
                </div>
              </div>

              {!onExp && !isEmpty && (
                <button
                  onClick={() => onSend(squad.id, durationMs)}
                  style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Send
                </button>
              )}

              {onExp && (
                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: expReady ? '#16a34a' : '#94a3b8' }}>
                  {expReady ? '✓ Ready' : formatDuration(new Date(squad.expedition!.returnsAt).getTime() - now)}
                </span>
              )}
            </div>
          )
        })}

        {profile.squads.every((s) => s.slots.every((id) => !id)) && (
          <button
            onClick={() => { onClose(); navigate('/squads') }}
            style={{
              marginTop: 4, padding: '12px 16px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              textAlign: 'center', WebkitTapHighlightColor: 'transparent',
            }}
          >
            Assign creatures to a squad to send expeditions
          </button>
        )}
      </div>
    </div>
  )
}
