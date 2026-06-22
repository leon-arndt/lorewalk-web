import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import {
  creatureCap, creatureSlotsCost, eggSlotCost,
  CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
} from '@/lib/profile'

// Real money runs through Google Play Billing (Digital Goods API in a TWA). Until
// that's wired, the buy buttons credit coins directly — clearly labelled as test.
const COIN_PACKS = [
  { coins: 100, price: '€0.99', tag: null },
  { coins: 600, price: '€4.99', tag: 'Popular' },
  { coins: 1000, price: '€6.99', tag: null },
  { coins: 2500, price: '€9.99', tag: 'Best value' },
]

export function ShopPage() {
  const { profile, buyCreatureSlots, buyEggSlot, addCoins } = useProfile()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const coinsRef = useRef<HTMLDivElement>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const scrollToCoins = () => coinsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Deep-link: /shop#coins (e.g. tapping a coin chip elsewhere) jumps to Coins.
  useEffect(() => {
    if (location.hash === '#coins') coinsRef.current?.scrollIntoView({ block: 'start' })
  }, [location.hash])

  const creatureCost = creatureSlotsCost(profile.bonusCreatureSlots)
  const eggCost = eggSlotCost(profile.maxEggSlots)
  const eggMaxed = profile.maxEggSlots >= MAX_EGG_SLOTS_CAP
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
  ]

  function buyPack(pack: typeof COIN_PACKS[number]) {
    // TODO: Google Play Billing via Digital Goods API once wrapped as a TWA.
    addCoins(pack.coins)
    setFlash(`+${pack.coins} 🪙 (test)`)
    setTimeout(() => setFlash(null), 2500)
  }

  return (
    <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{ padding: '24px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Shop</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
            Spend coins on upgrades, or top up your balance.
          </p>
        </div>
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

      {/* Upgrades */}
      <section style={{ padding: '8px 16px 8px' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Upgrades</h2>
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
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Coins</h2>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8' }}>
          Top up your coin balance. Buttons are a test stub until Google Play Billing is connected.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {COIN_PACKS.map((pack) => (
            <div key={pack.coins} style={{
              position: 'relative',
              background: 'white', borderRadius: 16, padding: '18px 12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: `2px solid ${pack.tag === 'Best value' ? '#fde68a' : '#f1f5f9'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              {pack.tag && (
                <span style={{
                  position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: pack.tag === 'Best value' ? '#f59e0b' : '#6366f1', color: 'white',
                  padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {pack.tag}
                </span>
              )}
              <span style={{ fontSize: 28 }}>🪙</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{pack.coins.toLocaleString()}</span>
              <button
                onClick={() => buyPack(pack)}
                style={{
                  width: '100%', fontSize: 13, fontWeight: 700, padding: '9px', borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #818cf8, #c084fc)', color: 'white',
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
    </div>
  )
}
