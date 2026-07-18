import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { STREAK_CHEST_INTERVAL } from '@/lib/profile'
import type { RewardItem } from '@/types'

// Duolingo-style: the chest sits tappable until opened, rather than popping up
// on its own - the wiggle-then-reveal is the whole point of the interaction.
const SHAKE_MS = 420

export function StreakChestCard() {
  const { profile, openStreakChest } = useProfile()
  const { showReward } = useReward()
  const [shaking, setShaking] = useState(false)

  if (!profile.pendingStreakChest) return null

  function handleTap() {
    if (shaking) return
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      const rewards = openStreakChest()
      if (!rewards) return
      const items: RewardItem[] = [
        { type: 'coins', amount: rewards.coins },
        { type: 'xp', amount: rewards.xp },
      ]
      if (rewards.food) items.push({ type: 'food', label: rewards.food.name, emoji: rewards.food.emoji })
      if (rewards.egg) items.push({ type: 'egg' })
      showReward({
        emoji: '🎁',
        title: 'Perfect Week!',
        subtitle: `${STREAK_CHEST_INTERVAL}-day streak chest`,
        items,
      })
    }, SHAKE_MS)
  }

  return (
    <section>
      <button
        onClick={handleTap}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', borderRadius: 18, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
          boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
          WebkitTapHighlightColor: 'transparent', textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 40, lineHeight: 1, flexShrink: 0,
          display: 'inline-block',
          animation: shaking ? `chestShake ${SHAKE_MS}ms ease` : undefined,
        }}>
          🎁
        </span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#78350f' }}>Perfect week streak!</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Tap to open your reward chest</div>
        </div>
      </button>
    </section>
  )
}
