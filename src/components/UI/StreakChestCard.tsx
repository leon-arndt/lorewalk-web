import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import { STREAK_CHEST_INTERVAL } from '@/lib/profile'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { Mono } from '@/components/UI/Journal'
import { ink, paperCard, stamp } from '@/lib/theme'
import type { RewardItem } from '@/types'

// Duolingo-style: the chest sits tappable until opened, rather than popping up
// on its own - the wiggle-then-reveal is the whole point of the interaction.
const SHAKE_MS = 420

export function StreakChestCard() {
  const { profile, openStreakChest } = useProfile()
  const { showReward } = useReward()
  const { t } = useLocale()
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
      if (rewards.food) items.push({ type: 'food', label: rewards.food.name, emoji: rewards.food.emoji, spriteId: `food_${rewards.food.id}` })
      if (rewards.egg) items.push({ type: 'egg' })
      showReward({
        emoji: '🎁',
        title: t('streak_chest_title'),
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
          width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          background: paperCard, border: `1.5px solid ${stamp}`,
          boxShadow: `inset 0 0 0 3px ${paperCard}, inset 0 0 0 4px ${stamp}`,
          transform: 'rotate(0.6deg)',
          WebkitTapHighlightColor: 'transparent', textAlign: 'left',
        }}
      >
        <span style={{
          lineHeight: 1, flexShrink: 0,
          display: 'inline-block',
          animation: shaking ? `chestShake ${SHAKE_MS}ms ease` : undefined,
        }}>
          <EmojiSprite id="item_chest" emoji="🎁" size={48} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 600, lineHeight: '22px', color: ink }}>{t('streak_chest_card_title')}</span>
          <Mono style={{ color: stamp, fontWeight: 500 }}>{t('streak_chest_card_sub')}</Mono>
        </span>
      </button>
    </section>
  )
}
