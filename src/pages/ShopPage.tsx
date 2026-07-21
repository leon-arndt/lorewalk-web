import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  creatureCap, creatureSlotsCost, eggSlotCost,
  CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
  STREAK_FREEZE_MAX, STREAK_FREEZE_COST,
} from '@/lib/profile'
import { accent, rewardGradient } from '@/lib/theme'
import { PremiumModal } from '@/components/UI/PremiumModal'

// Real money runs through Google Play Billing (Digital Goods API in a TWA). Until
// that's wired, the buy buttons credit coins directly - clearly labelled as test.
// Priced in SGD - Singapore is the first launch market (see CLAUDE.md).
const COIN_PACKS = [
  { coins: 100, price: 'S$0.79', tagKey: null as null | 'shop_popular' | 'shop_best_value' },
  { coins: 600, price: 'S$3.49', tagKey: 'shop_popular' as const },
  { coins: 1000, price: 'S$5.00', tagKey: null as null | 'shop_popular' | 'shop_best_value' },
  { coins: 2500, price: 'S$6.99', tagKey: 'shop_best_value' as const },
]

export function ShopPage() {
  const { profile, buyCreatureSlots, buyEggSlot, buyStreakFreeze, addCoins } = useProfile()
  const { mode } = useConnectionMode()
  const { t } = useLocale()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const coinsRef = useRef<HTMLDivElement>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const scrollToCoins = () => coinsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Deep-link: /shop#coins (e.g. tapping a coin chip elsewhere) jumps to Coins.
  useEffect(() => {
    if (location.hash === '#coins') coinsRef.current?.scrollIntoView({ block: 'start' })
  }, [location.hash])

  const creatureCost = creatureSlotsCost(profile.bonusCreatureSlots)
  const eggCost = eggSlotCost(profile.maxEggSlots)
  const eggMaxed = profile.maxEggSlots >= MAX_EGG_SLOTS_CAP
  const streakFreezeMaxed = profile.streakFreezes >= STREAK_FREEZE_MAX
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)

  const upgrades = [
    {
      key: 'creatures', icon: '🧬',
      title: `+${CREATURE_SLOT_CHUNK} creature slots`,
      sub: `Storage cap ${cap} → ${cap + CREATURE_SLOT_CHUNK}`,
      cost: creatureCost, disabled: profile.coins < creatureCost, buy: buyCreatureSlots,
    },
    {
      key: 'egg', icon: '🥚',
      title: '+1 egg slot',
      sub: eggMaxed ? `Maxed (${MAX_EGG_SLOTS_CAP})` : `Incubate ${profile.maxEggSlots + 1} eggs at once`,
      cost: eggCost, disabled: eggMaxed || profile.coins < eggCost, buy: buyEggSlot,
    },
    {
      key: 'streakFreeze', icon: '🧊',
      title: 'Streak freeze',
      sub: streakFreezeMaxed
        ? `Maxed (${STREAK_FREEZE_MAX} held)`
        : `Covers a missed day - ${profile.streakFreezes}/${STREAK_FREEZE_MAX} held`,
      cost: STREAK_FREEZE_COST, disabled: streakFreezeMaxed || profile.coins < STREAK_FREEZE_COST, buy: buyStreakFreeze,
    },
  ]

  function buyPack(pack: typeof COIN_PACKS[number]) {
    // Offline = sandbox: simulate a successful purchase and grant coins instantly.
    // Online will route through Google Play Billing (Digital Goods API in a TWA).
    if (mode === 'offline') {
      addCoins(pack.coins)
      setFlash(t('shop_test_purchase', { coins: pack.coins }))
    } else {
      setFlash(t('shop_online_note'))
    }
    setTimeout(() => setFlash(null), 2800)
  }

  return (
    <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc',
        padding: '20px 16px 14px', borderBottom: '1px solid #eef2f7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: accent }}>{t('shop_title')}</h1>
        <button
          onClick={scrollToCoins}
          title="Get more coins"
          style={{
            flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#b45309', cursor: 'pointer',
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '6px 14px',
          }}
        >
          🪙 {profile.coins} +
        </button>
      </div>

      <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 14, color: '#94a3b8' }}>
        {t('shop_subtitle')}
      </p>

      {!profile.isPremium && (
        <div style={{ padding: '14px 16px 0' }}>
          <button
            onClick={() => setShowPremiumModal(true)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(160deg, #fffbeb 0%, #fff7ed 100%)',
              border: '2px solid #fde68a', borderRadius: 16, padding: 14,
            }}
          >
            <span style={{ fontSize: 26 }}>👑</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#78350f' }}>Go Premium</div>
              <div style={{ fontSize: 12, color: '#92400e' }}>Every landmark unlocked & a monthly physical medal</div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>›</span>
          </button>
        </div>
      )}

      {/* Upgrades */}
      <section style={{ padding: '8px 16px 8px' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>{t('shop_upgrades')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upgrades.map((it) => (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'white', borderRadius: 16, padding: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: 30 }}>{it.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{it.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{it.sub}</div>
              </div>
              <button
                onClick={it.buy}
                disabled={it.disabled}
                style={{
                  flexShrink: 0, fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 20,
                  border: 'none', cursor: it.disabled ? 'default' : 'pointer',
                  background: it.disabled ? '#f1f5f9' : '#fffbeb',
                  color: it.disabled ? '#cbd5e1' : '#b45309',
                }}
              >
                {it.cost} 🪙
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Coins (real-money top-up) */}
      <section ref={coinsRef} id="coins" style={{ padding: '16px 16px 32px', scrollMarginTop: 8 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: accent }}>{t('shop_coins_title')}</h2>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: mode === 'offline' ? '#16a34a' : '#94a3b8' }}>
          {mode === 'offline' ? t('shop_coins_offline') : t('shop_coins_online')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {COIN_PACKS.map((pack) => (
            <div key={pack.coins} style={{
              position: 'relative',
              background: 'white', borderRadius: 16, padding: '18px 12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: `2px solid ${pack.tagKey === 'shop_best_value' ? '#fde68a' : '#f1f5f9'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              {pack.tagKey && (
                <span style={{
                  position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: pack.tagKey === 'shop_best_value' ? '#f59e0b' : '#6366f1', color: 'white',
                  padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {t(pack.tagKey)}
                </span>
              )}
              <span style={{ fontSize: 28 }}>🪙</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{pack.coins.toLocaleString()}</span>
              <button
                onClick={() => buyPack(pack)}
                style={{
                  width: '100%', fontSize: 13, fontWeight: 700, padding: '9px', borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  background: rewardGradient, color: 'white',
                }}
              >
                {pack.price}
              </button>
            </div>
          ))}
        </div>
        {flash && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#16a34a', textAlign: 'center' }}>{flash}</div>
        )}
      </section>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </div>
  )
}
