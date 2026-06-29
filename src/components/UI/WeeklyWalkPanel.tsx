import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import {
  WEEKLY_WALK_TARGET_KM, TICKET_COST_COINS,
  mockMemberProgressKm, playerProgressKm, partyTotalKm, isWalkComplete, isWalkExpired,
} from '@/lib/profile'
import { glassPanel, glassChrome } from '@/lib/glass'

interface Props {
  currentDistanceM: number
  onClose: () => void
  isClosing?: boolean
}

const ACCENT = '#6366f1'
const ACCENT_SOFT = 'rgba(99,102,241,0.1)'

const panelStyle = (isClosing: boolean) => ({
  position: 'absolute' as const, bottom: 0, left: 0, right: 0,
  ...glassPanel, border: 'none',
  borderRadius: '24px 24px 0 0',
  padding: '20px 20px',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
  zIndex: 10,
  animation: isClosing
    ? 'panelSlideDown 0.28s cubic-bezier(0.36,0,0.66,0) forwards'
    : 'panelSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
})

function ProgressBar({ value, max, color = ACCENT }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 4, background: color,
        width: `${pct}%`, transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

function formatKm(km: number) {
  return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`
}

export function WeeklyWalkPanel({ currentDistanceM, onClose, isClosing = false }: Props) {
  const { profile, buyTicket, joinWeeklyWalk, claimWeeklyWalkReward, expireWeeklyWalkIfStale } = useProfile()
  const { showReward } = useReward()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    expireWeeklyWalkIfStale()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(t)
  }, [])

  const walk = profile.weeklyWalk
  const isExpired = walk && isWalkExpired(walk, now)

  const header = (
    <>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          ...glassChrome, cursor: 'pointer',
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#64748b', WebkitTapHighlightColor: 'transparent',
        }}
      >x</button>
    </>
  )

  // ── Expired walk ─────────────────────────────────────────────────────────────
  if (walk && isExpired) {
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Walk ended</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>
            Last week's party walk has ended. A new one starts every Monday.
          </p>
          <button
            onClick={() => { expireWeeklyWalkIfStale(); onClose() }}
            style={{
              padding: '12px 28px', borderRadius: 14, border: 'none',
              background: ACCENT, color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  // ── Active walk ───────────────────────────────────────────────────────────────
  if (walk && !walk.rewardClaimed) {
    const totalKm = partyTotalKm(walk, currentDistanceM, now)
    const complete = isWalkComplete(walk, currentDistanceM, now)

    function handleClaim() {
      const result = claimWeeklyWalkReward(currentDistanceM)
      if (!result) return
      showReward({
        emoji: '🎉',
        title: 'Party Walk Complete!',
        subtitle: `Your party walked ${WEEKLY_WALK_TARGET_KM} km together this week.`,
        items: [
          { type: 'xp', amount: 75 },
          { type: 'coins', amount: result.coins },
          { type: 'egg' },
          { type: 'badge', label: 'Weekly Walker' },
        ],
      })
      onClose()
    }

    return (
      <div style={panelStyle(isClosing)}>
        {header}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🚶</div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Weekly Party Walk</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Combined goal: {WEEKLY_WALK_TARGET_KM} km</p>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, background: ACCENT_SOFT }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>Party progress</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
              {formatKm(Math.min(totalKm, WEEKLY_WALK_TARGET_KM))} / {WEEKLY_WALK_TARGET_KM} km
            </span>
          </div>
          <ProgressBar value={totalKm} max={WEEKLY_WALK_TARGET_KM} />
        </div>

        {/* Per-member list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {walk.partyMembers.map((m) => {
            const contributed = m.isPlayer
              ? playerProgressKm(walk, currentDistanceM)
              : mockMemberProgressKm(walk.joinedAt, m.targetKm, now)
            const done = contributed >= m.targetKm
            return (
              <div key={m.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: done ? 'linear-gradient(135deg,#818cf8,#c084fc)' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {m.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: m.isPlayer ? '#1e293b' : '#475569' }}>
                        {m.name} {m.isPlayer ? '(you)' : ''}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#16a34a' : '#94a3b8' }}>
                        {formatKm(Math.min(contributed, m.targetKm))} / {formatKm(m.targetKm)}
                      </span>
                    </div>
                  </div>
                </div>
                <ProgressBar
                  value={contributed}
                  max={m.targetKm}
                  color={done ? '#16a34a' : m.isPlayer ? ACCENT : '#94a3b8'}
                />
              </div>
            )
          })}
        </div>

        {complete ? (
          <button
            onClick={handleClaim}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              color: 'white', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 4px 16px rgba(129,140,248,0.4)',
              animation: 'rewardPop 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            🎉 Claim reward!
          </button>
        ) : (
          <div style={{
            padding: '12px 16px', borderRadius: 14, background: '#f8fafc', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Keep walking! Your steps are being tracked automatically.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Reward already claimed (walk still in state but done) ────────────────────
  if (walk?.rewardClaimed) {
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏅</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Reward claimed!</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>New party walk starts next Monday.</p>
        </div>
      </div>
    )
  }

  // ── Not joined ────────────────────────────────────────────────────────────────
  const canBuyTicket = profile.coins >= TICKET_COST_COINS
  const hasTicket = profile.tickets > 0

  function handleBuyTicket() {
    buyTicket()
  }

  function handleJoin() {
    joinWeeklyWalk(currentDistanceM)
  }

  return (
    <div style={panelStyle(isClosing)}>
      {header}

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🚶</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Weekly Party Walk</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          Walk {WEEKLY_WALK_TARGET_KM} km combined with your party this week.
          Resets every Monday.
        </p>
      </div>

      {/* Reward preview */}
      <div style={{
        background: '#f8fafc', borderRadius: 16, padding: '12px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Completion rewards
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { icon: '⭐', text: '+75 XP' },
            { icon: '🪙', text: '80-120 coins' },
            { icon: '🥚', text: 'Rare egg' },
            { icon: '🏅', text: 'Weekly Walker badge' },
          ].map((r) => (
            <div key={r.text} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20, background: 'white',
              fontSize: 12, fontWeight: 600, color: '#475569',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {r.icon} {r.text}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket status + join */}
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: hasTicket ? ACCENT_SOFT : 'rgba(248,250,252,0.9)',
        marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎟️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              {profile.tickets} ticket{profile.tickets !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>1 ticket per walk entry</div>
          </div>
        </div>
        {!hasTicket && (
          <button
            onClick={handleBuyTicket}
            disabled={!canBuyTicket}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: canBuyTicket ? '#f59e0b' : '#e2e8f0',
              color: canBuyTicket ? 'white' : '#94a3b8',
              fontSize: 12, fontWeight: 700, cursor: canBuyTicket ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >
            Buy - 🪙 {TICKET_COST_COINS}
          </button>
        )}
      </div>

      <button
        onClick={handleJoin}
        disabled={!hasTicket}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
          background: hasTicket
            ? `linear-gradient(135deg, ${ACCENT}, #a855f7)`
            : '#e2e8f0',
          color: hasTicket ? 'white' : '#94a3b8',
          fontSize: 16, fontWeight: 800,
          cursor: hasTicket ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: hasTicket ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
        }}
      >
        {hasTicket ? 'Join party walk - 🎟️ 1 ticket' : 'Need a ticket to join'}
      </button>
    </div>
  )
}
