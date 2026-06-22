import { useProfile } from '@/contexts/ProfileContext'
import {
  creatureCap, creatureSlotsCost, eggSlotCost,
  CREATURE_SLOT_CHUNK, MAX_EGG_SLOTS_CAP,
} from '@/lib/profile'

export function ShopPage() {
  const { profile, buyCreatureSlots, buyEggSlot } = useProfile()
  const creatureCost = creatureSlotsCost(profile.bonusCreatureSlots)
  const eggCost = eggSlotCost(profile.maxEggSlots)
  const eggMaxed = profile.maxEggSlots >= MAX_EGG_SLOTS_CAP
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)

  const items = [
    {
      key: 'creatures',
      icon: '🧬',
      title: `+${CREATURE_SLOT_CHUNK} creature slots`,
      sub: `Storage cap ${cap} → ${cap + CREATURE_SLOT_CHUNK}`,
      cost: creatureCost,
      disabled: profile.coins < creatureCost,
      buy: buyCreatureSlots,
    },
    {
      key: 'egg',
      icon: '🥚',
      title: '+1 egg slot',
      sub: eggMaxed ? `Maxed (${MAX_EGG_SLOTS_CAP})` : `Incubate ${profile.maxEggSlots + 1} eggs at once`,
      cost: eggCost,
      disabled: eggMaxed || profile.coins < eggCost,
      buy: buyEggSlot,
    },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{ padding: '24px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Shop</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
            Spend coins earned from expeditions and held landmarks.
          </p>
        </div>
        <span style={{
          flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#b45309',
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '6px 14px',
        }}>
          🪙 {profile.coins}
        </span>
      </div>

      <div style={{ padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it) => (
          <div key={it.key} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'white', borderRadius: 16, padding: '16px',
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

        <p style={{ margin: '4px 4px 0', fontSize: 12, color: '#cbd5e1' }}>
          More items coming soon — cosmetics and extra squads.
        </p>
      </div>
    </div>
  )
}
