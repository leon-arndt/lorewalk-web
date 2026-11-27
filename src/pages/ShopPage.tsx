import { useEffect, useRef, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  creatureCap, creatureSlotsCost, eggSlotCost,
  CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
  STREAK_FREEZE_MAX, STREAK_FREEZE_COST,
} from '@/lib/profile'
import { forest, ink, inkSoft, ochre, paperCard, paperLight, edge } from '@/lib/theme'
import { MONO, paperCardStyle, paperTag } from '@/lib/paper'
import { InkButton, Mono, SectionTitle, Stamp } from '@/components/UI/Journal'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { PremiumModal } from '@/components/UI/PremiumModal'
import { UUID_RE } from '@/lib/supabase'
import { isBillingAvailable, fetchCoinPackages, purchaseCoinPack, type CoinPackages } from '@/lib/billing'

// The shop has one entry point: CoinCapsule opens this as a bottom sheet, from
// every screen that shows the coin balance. It has no route of its own.
// Real money runs through Google Play Billing via RevenueCat's Capacitor SDK
// (see src/lib/billing.ts). A coin pack is a Play in-app product. The device
// never credits a paid pack itself: the RevenueCat webhook records the
// purchase, and ProfileContext.syncCoinGrants adds the coins from that record.
// The webhook holds the coins per product (COIN_PRODUCTS), so keep the two
// lists in step. `price` shows until the store returns its own price string.
// Priced in SGD - Singapore is the first launch market (see CLAUDE.md).
const COIN_PACKS = [
  { productId: 'lorewalk_coins_100', coins: 100, price: 'S$0.79', tagKey: null as null | 'shop_popular' | 'shop_best_value' },
  { productId: 'lorewalk_coins_600', coins: 600, price: 'S$3.49', tagKey: 'shop_popular' as const },
  { productId: 'lorewalk_coins_1000', coins: 1000, price: 'S$5.00', tagKey: null as null | 'shop_popular' | 'shop_best_value' },
  { productId: 'lorewalk_coins_2500', coins: 2500, price: 'S$6.99', tagKey: 'shop_best_value' as const },
]

// The webhook runs after the purchase returns, so the grant row is not there
// yet. Look a few times. If it still is not there, the next app start or
// return to the foreground picks it up.
const GRANT_RETRY_MS = [2_000, 4_000, 8_000, 16_000]

// Cards sit a little crooked, like labels glued into a notebook.
const PACK_TILTS = [-0.8, 0.6, 0.5, -0.6]

// The window of a specimen card: a wash of ochre behind the item.
const specimenWindow: React.CSSProperties = {
  background: `${ochre}33`, borderRadius: 2,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export function ShopPage() {
  const { profile, buyCreatureSlots, buyEggSlot, buyStreakFreeze, addCoins, syncCoinGrants } = useProfile()
  const { mode } = useConnectionMode()
  const { showToast } = useReward()
  const { t } = useLocale()
  const coinsRef = useRef<HTMLDivElement>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [packages, setPackages] = useState<CoinPackages | null>(null)
  const [buying, setBuying] = useState<string | null>(null)
  const testMode = import.meta.env.DEV && mode === 'offline'

  useEffect(() => {
    if (mode !== 'online' || !isBillingAvailable() || !UUID_RE.test(profile.id)) return
    let cancelled = false
    fetchCoinPackages(profile.id)
      .then((p) => { if (!cancelled) setPackages(p) })
      .catch(() => { /* the store is unreachable: the buy button reports it */ })
    return () => { cancelled = true }
  }, [mode, profile.id])

  const scrollToCoins = () => coinsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const creatureCost = creatureSlotsCost(profile.bonusCreatureSlots)
  const eggCost = eggSlotCost(profile.maxEggSlots)
  const eggMaxed = profile.maxEggSlots >= MAX_EGG_SLOTS_CAP
  const streakFreezeMaxed = profile.streakFreezes >= STREAK_FREEZE_MAX
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)

  const upgrades = [
    {
      key: 'creatures', icon: '🧬', sprite: 'item_creature_slots',
      title: `+${CREATURE_SLOT_CHUNK} creature slots`,
      sub: `Storage cap ${cap} → ${cap + CREATURE_SLOT_CHUNK}`,
      cost: creatureCost, disabled: profile.coins < creatureCost, buy: buyCreatureSlots,
    },
    {
      key: 'egg', icon: '🥚', sprite: 'item_egg_slot',
      title: '+1 egg slot',
      sub: eggMaxed ? `Maxed (${MAX_EGG_SLOTS_CAP})` : `Incubate ${profile.maxEggSlots + 1} eggs at once`,
      cost: eggCost, disabled: eggMaxed || profile.coins < eggCost, buy: buyEggSlot,
    },
    {
      key: 'streakFreeze', icon: '🧊', sprite: null,
      title: t('shop_streak_freeze'),
      sub: streakFreezeMaxed
        ? `Maxed (${STREAK_FREEZE_MAX} held)`
        : `Covers a missed day - ${profile.streakFreezes}/${STREAK_FREEZE_MAX} held`,
      cost: STREAK_FREEZE_COST, disabled: streakFreezeMaxed || profile.coins < STREAK_FREEZE_COST, buy: buyStreakFreeze,
    },
  ]

  async function buyPack(pack: typeof COIN_PACKS[number]) {
    // Dev build, offline = sandbox: simulate a successful purchase and grant
    // coins instantly. A shipped build never grants free coins.
    if (testMode) {
      addCoins(pack.coins)
      showToast(t('shop_test_purchase', { coins: pack.coins }))
      return
    }
    if (mode !== 'online') {
      showToast(t('shop_needs_online'))
      return
    }
    if (!isBillingAvailable()) {
      showToast(t('shop_online_note'))
      return
    }
    // The purchase binds to the RevenueCat app user id. That must be the
    // signed-in auth uid, or the grant row never matches this player.
    const pkg = packages?.[pack.productId]
    if (!pkg || !UUID_RE.test(profile.id)) {
      showToast(t('premium_purchase_failed'))
      return
    }
    setBuying(pack.productId)
    const result = await purchaseCoinPack(profile.id, pkg)
    setBuying(null)
    if (!result.ok) {
      if (!result.cancelled) showToast(result.error ?? t('premium_purchase_failed'))
      return
    }
    showToast(t('shop_purchase_pending'))
    for (const delay of GRANT_RETRY_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (await syncCoinGrants() > 0) break
    }
  }

  return (
    <div style={{ background: paperLight, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: paperLight,
        padding: '10px 16px 10px', borderBottom: `1px solid ${edge}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '34px', letterSpacing: '-0.01em', color: ink }}>{t('shop_title')}</h1>
        <button
          onClick={scrollToCoins}
          title={t('shop_get_more_coins')}
          style={{
            ...paperTag, background: paperCard,
            flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: MONO, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '0 12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <EmojiSprite id="item_coins" emoji="🪙" size={18} /> {profile.coins} +
        </button>
      </div>

      <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 13, lineHeight: '18px', color: inkSoft }}>
        {t('shop_subtitle')}
      </p>

      {!profile.isPremium && (
        <div style={{ padding: '16px 16px 0' }}>
          <button
            onClick={() => setShowPremiumModal(true)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 64,
              background: paperCard, border: `1px solid ${edge}`, borderLeft: `8px solid ${ochre}`,
              borderRadius: 10, padding: '10px 12px', color: ink, transform: 'rotate(-0.5deg)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>👑</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>{t('premium_go_premium')}</div>
              <div style={{ fontSize: 12, lineHeight: '16px', color: inkSoft }}>{t('premium_shop_teaser')}</div>
            </div>
            <span aria-hidden style={{ fontSize: 24, fontWeight: 500, color: ink }}>›</span>
          </button>
        </div>
      )}

      {/* Upgrades */}
      <section style={{ padding: '22px 16px 8px' }}>
        <SectionTitle>{t('shop_upgrades')}</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upgrades.map((it) => (
            <div key={it.key} style={{
              ...paperCardStyle, borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 12, padding: 8,
            }}>
              <span style={{ ...specimenWindow, flexShrink: 0, width: 52, height: 52 }}>
                {it.sprite
                  ? <EmojiSprite id={it.sprite} emoji={it.icon} size={36} />
                  : <span style={{ fontSize: 28, lineHeight: 1 }}>{it.icon}</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink }}>{it.title}</div>
                <Mono style={{ display: 'block', marginTop: 2 }}>{it.sub}</Mono>
              </div>
              <InkButton
                variant="paper"
                onClick={it.buy}
                disabled={it.disabled}
                style={{
                  flexShrink: 0, minWidth: 72, padding: '0 10px', fontFamily: MONO, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {it.cost} <EmojiSprite id="item_coins" emoji="🪙" size={16} />
              </InkButton>
            </div>
          ))}
        </div>
      </section>

      {/* Coins (real-money top-up) */}
      <section ref={coinsRef} id="coins" style={{ padding: '18px 16px 32px', scrollMarginTop: 72 }}>
        <SectionTitle style={{ marginBottom: 2 }}>{t('shop_coins_title')}</SectionTitle>
        <Mono style={{ display: 'block', margin: '0 0 18px', color: testMode ? forest : undefined }}>
          {testMode ? t('shop_coins_offline') : t('shop_coins_online')}
        </Mono>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 12px' }}>
          {COIN_PACKS.map((pack, i) => (
            <div key={pack.coins} style={{
              ...paperCardStyle, borderRadius: 6,
              position: 'relative', padding: 6, transform: `rotate(${PACK_TILTS[i % PACK_TILTS.length]}deg)`,
              display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6,
            }}>
              {pack.tagKey && (
                <Stamp tilt={5} style={{ position: 'absolute', top: -10, right: -4, background: paperCard, whiteSpace: 'nowrap' }}>
                  {t(pack.tagKey)}
                </Stamp>
              )}
              <span style={{ ...specimenWindow, height: 68 }}>
                <EmojiSprite id="item_coins" emoji="🪙" size={44} />
              </span>
              <span style={{ fontSize: 19, fontWeight: 600, lineHeight: '24px', color: ink, textAlign: 'center' }}>{pack.coins.toLocaleString()}</span>
              <InkButton
                onClick={() => buyPack(pack)}
                disabled={buying !== null}
                style={{
                  width: '100%', padding: '0 4px', fontFamily: MONO, fontSize: 13,
                  cursor: buying ? 'default' : 'pointer',
                  opacity: buying && buying !== pack.productId ? 0.5 : 1,
                }}
              >
                {buying === pack.productId ? '…' : (packages?.[pack.productId]?.product.priceString ?? pack.price)}
              </InkButton>
            </div>
          ))}
        </div>
      </section>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </div>
  )
}
