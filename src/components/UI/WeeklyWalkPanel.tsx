import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  WEEKLY_WALK_TARGET_STEPS, TICKET_COST_COINS,
  mockMemberProgressSteps, playerProgressSteps, partyTotalSteps, isWalkComplete, isWalkExpired,
} from '@/lib/profile'
import { paperCardStyle, paperSheet, paperTag } from '@/lib/paper'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { deterministicAppearance } from '@/data/cosmetics'
import { forest, ink, inkSoft, paperLight, paperShade, stamp } from '@/lib/theme'
import { InkButton, Mono, NoteCard } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { panelMotion } from '@/lib/motion'

interface Props {
  currentSteps: number
  onClose: () => void
  isClosing?: boolean
}

const panelStyle = {
  position: 'absolute' as const, bottom: 0, left: 0, right: 0,
  ...paperSheet,
  boxShadow: '0 -3px 0 rgba(51,40,30,0.12)',
  borderRadius: '10px 10px 0 0',
  padding: '10px 20px',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
  zIndex: 10,
}

const titleStyle = { margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.01em', color: ink } as const
const kicker = { display: 'block', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: inkSoft } as const
const typed = { display: 'block', fontSize: 12, lineHeight: '18px', color: inkSoft } as const

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 8, background: 'rgba(51,40,30,0.12)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', background: forest,
        width: `${pct}%`, transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

function formatSteps(steps: number) {
  return steps.toLocaleString() + ' steps'
}

export function WeeklyWalkPanel({ currentSteps, onClose, isClosing = false }: Props) {
  const { profile, buyTicket, joinWeeklyWalk, claimWeeklyWalkReward, expireWeeklyWalkIfStale } = useProfile()
  const { showReward } = useReward()
  const { t } = useLocale()
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
      <div style={{ width: 36, height: 4, borderRadius: 2, background: ink, margin: '0 auto 16px' }} />
      <button
        onClick={onClose}
        data-sfx="close"
        style={{
          position: 'absolute', top: 8, right: 10,
          width: 44, height: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          ...paperTag, width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, lineHeight: 1,
        }}>x</span>
      </button>
    </>
  )

  // ── Expired walk ─────────────────────────────────────────────────────────────
  if (walk && isExpired) {
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
          <h2 style={{ ...titleStyle, margin: '0 0 6px' }}>{t('weekly_walk_ended')}</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: 1.5, color: inkSoft }}>
            Last week's party walk has ended. A new one starts every Monday.
          </p>
          <InkButton
            onClick={() => { expireWeeklyWalkIfStale(); onClose() }}
            data-sfx="close"
            style={{ minHeight: 48, padding: '0 28px', fontSize: 15 }}
          >
            Got it
          </InkButton>
        </div>
      </motion.div>
    )
  }

  // ── Active walk ───────────────────────────────────────────────────────────────
  if (walk && !walk.rewardClaimed) {
    const totalSteps = partyTotalSteps(walk, currentSteps, now)
    const complete = isWalkComplete(walk, currentSteps, now)

    function handleClaim() {
      const result = claimWeeklyWalkReward(currentSteps)
      if (!result) return
      showReward({
        emoji: '🎉',
        title: t('weekly_walk_complete_title'),
        subtitle: `Your party walked ${WEEKLY_WALK_TARGET_STEPS.toLocaleString()} steps together this week.`,
        items: [
          { type: 'xp', amount: 75 },
          { type: 'coins', amount: result.coins },
          { type: 'egg' },
          { type: 'badge', label: t('weekly_walker_label') },
        ],
      })
      onClose()
    }

    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 40 }}>
          <EmojiSprite id="item_sneaker" emoji="🚶" size={40} />
          <div style={{ minWidth: 0 }}>
            <h2 style={titleStyle}>{t('weekly_party_walk_title')}</h2>
            <Mono style={typed}>Combined goal: {WEEKLY_WALK_TARGET_STEPS.toLocaleString()} steps</Mono>
          </div>
        </div>

        {/* Overall progress */}
        <NoteCard style={{ marginBottom: 16, padding: '10px 12px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0 10px', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: ink }}>{t('weekly_party_progress')}</span>
            <Mono style={{ fontSize: 12, lineHeight: '18px', fontWeight: 500, color: ink }}>
              {formatSteps(Math.min(totalSteps, WEEKLY_WALK_TARGET_STEPS))} / {WEEKLY_WALK_TARGET_STEPS.toLocaleString()} steps
            </Mono>
          </div>
          <ProgressBar value={totalSteps} max={WEEKLY_WALK_TARGET_STEPS} />
        </NoteCard>

        {/* Per-member list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {walk.partyMembers.map((m) => {
            const contributed = m.isPlayer
              ? playerProgressSteps(walk, currentSteps)
              : mockMemberProgressSteps(walk.joinedAt, m.targetSteps, now)
            const done = contributed >= m.targetSteps
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: paperShade, border: `1.5px solid ${done ? forest : ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15,
                }}>
                  <PlayerFaceIcon appearance={m.isPlayer ? profile.appearance : deterministicAppearance(m.name)} size={30} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: m.isPlayer ? ink : inkSoft, whiteSpace: 'nowrap' }}>
                      {m.name} {m.isPlayer ? '(you)' : ''}
                    </span>
                    <Mono style={{ fontWeight: done ? 500 : 400, color: done ? forest : inkSoft, textAlign: 'right' }}>
                      {formatSteps(Math.min(Math.round(contributed), m.targetSteps))} / {formatSteps(m.targetSteps)}
                    </Mono>
                  </div>
                  <ProgressBar value={contributed} max={m.targetSteps} />
                </div>
              </div>
            )
          })}
        </div>

        {complete ? (
          <InkButton
            onClick={handleClaim}
            style={{
              width: '100%', minHeight: 52, fontSize: 15, fontWeight: 600,
              background: stamp, color: paperLight,
              animation: 'rewardPop 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            🎉 Claim reward!
          </InkButton>
        ) : (
          <div style={{
            padding: '10px 14px', borderRadius: 6, border: '1.5px dashed #8C7A5C', textAlign: 'center',
          }}>
            <Mono style={typed}>
              Keep walking! Your steps are being tracked automatically.
            </Mono>
          </div>
        )}
      </motion.div>
    )
  }

  // ── Reward already claimed (walk still in state but done) ────────────────────
  if (walk?.rewardClaimed) {
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ marginBottom: 10 }}><EmojiSprite id="item_badge" emoji="🏅" size={56} /></div>
          <h2 style={{ ...titleStyle, margin: '0 0 6px' }}>{t('weekly_reward_claimed')}</h2>
          <Mono style={typed}>{t('weekly_next_starts_monday')}</Mono>
        </div>
      </motion.div>
    )
  }

  // ── Not joined ────────────────────────────────────────────────────────────────
  const canBuyTicket = profile.coins >= TICKET_COST_COINS
  const hasTicket = profile.tickets > 0

  function handleBuyTicket() {
    buyTicket()
  }

  function handleJoin() {
    joinWeeklyWalk(currentSteps)
  }

  return (
    <motion.div {...panelMotion(isClosing)} style={panelStyle}>
      {header}

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingRight: 40 }}>
        <EmojiSprite id="item_sneaker" emoji="🚶" size={44} />
        <h2 style={titleStyle}>{t('weekly_party_walk_title')}</h2>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: inkSoft, lineHeight: 1.5 }}>
        Walk {WEEKLY_WALK_TARGET_STEPS.toLocaleString()} steps combined with your party this week.
        Your own steps count toward the whole goal, so you can finish it solo if the rest of the party falls behind.
        Resets every Monday.
      </p>

      {/* Reward preview */}
      <div style={{ ...paperCardStyle, padding: '10px 12px 12px', marginBottom: 14 }}>
        <Mono style={{ ...kicker, marginBottom: 8 }}>
          Completion rewards
        </Mono>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {[
            { icon: '⭐', sprite: 'item_xp', text: '+75 XP' },
            { icon: '🪙', sprite: 'item_coins', text: '80-120 coins' },
            { icon: '🥚', sprite: 'item_egg', text: t('weekly_rare_egg') },
            { icon: '🏅', sprite: 'item_badge', text: t('weekly_walker_badge') },
          ].map((r) => (
            <div key={r.text} style={{
              display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
              fontSize: 13, fontWeight: 500, color: ink,
            }}>
              <EmojiSprite id={r.sprite} emoji={r.icon} size={22} /> {r.text}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket status + join */}
      <NoteCard style={{
        padding: '8px 8px 8px 12px', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, minHeight: 44 }}>
          <span style={{ fontSize: 24 }}>🎟️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>
              {profile.tickets} ticket{profile.tickets !== 1 ? 's' : ''}
            </div>
            <Mono style={{ display: 'block' }}>1 ticket per walk entry</Mono>
          </div>
        </div>
        {!hasTicket && (
          <InkButton
            variant="paper"
            onClick={handleBuyTicket}
            disabled={!canBuyTicket}
            style={{ flexShrink: 0, padding: '0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            Buy - <EmojiSprite id="item_coins" emoji="🪙" size={18} /> {TICKET_COST_COINS}
          </InkButton>
        )}
      </NoteCard>

      <InkButton
        onClick={handleJoin}
        disabled={!hasTicket}
        style={{ width: '100%', minHeight: 48, fontSize: 15 }}
      >
        {hasTicket ? 'Join party walk - 🎟️ 1 ticket' : 'Need a ticket to join'}
      </InkButton>
    </motion.div>
  )
}
