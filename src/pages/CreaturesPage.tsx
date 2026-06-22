import { useProfile } from '@/contexts/ProfileContext'
import { creatureCap } from '@/lib/profile'
import type { Egg, HatchedCreature } from '@/types'

const RARE_CATEGORIES = new Set(['religious', 'museum', 'nature'])

function EggSlotCard({ egg }: { egg: Egg | null }) {
  if (!egg) {
    return (
      <div style={{
        border: '2px dashed #e2e8f0', borderRadius: 16, padding: '20px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, minHeight: 144, justifyContent: 'center',
      }}>
        <span style={{ fontSize: 30, opacity: 0.25 }}>🥚</span>
        <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500, textAlign: 'center' }}>
          Visit a landmark
        </span>
      </div>
    )
  }

  const isRare = egg.tier === 'rare'
  const pct = Math.min((egg.visitsProgress / egg.visitsRequired) * 100, 100)
  const remaining = egg.visitsRequired - egg.visitsProgress

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '14px 10px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      border: `2px solid ${isRare ? '#fde68a' : '#c7d2fe'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 7, minHeight: 144,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: isRare ? '#fffbeb' : '#eef2ff',
        border: `2px solid ${isRare ? '#fbbf24' : '#a5b4fc'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        🥚
      </div>

      <span style={{
        fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
        background: isRare ? '#fef3c7' : '#ede9fe',
        color: isRare ? '#b45309' : '#7c3aed',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {egg.tier}
      </span>

      <span style={{
        fontSize: 10, fontWeight: 600, color: '#374151', textAlign: 'center',
        lineHeight: 1.3, maxWidth: '100%',
        display: '-webkit-box', overflow: 'hidden',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {egg.poiName}
      </span>

      <div style={{ width: '100%' }}>
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width 0.4s ease',
            background: isRare
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #818cf8, #a78bfa)',
            width: `${pct}%`,
          }} />
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'block', textAlign: 'center' }}>
          {remaining} visit{remaining !== 1 ? 's' : ''} left
        </span>
      </div>
    </div>
  )
}

function EmptyCreatureSlot() {
  return (
    <div style={{
      border: '2px dashed #e2e8f0', borderRadius: 16, minHeight: 132,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 22, opacity: 0.3 }}>🐾</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#cbd5e1' }}>Empty slot</span>
    </div>
  )
}

function CreatureCard({ creature, onRelease }: { creature: HatchedCreature; onRelease: () => void }) {
  const isRare = RARE_CATEGORIES.has(creature.poiCategory)

  return (
    <div style={{
      position: 'relative',
      background: 'white', borderRadius: 16, padding: '16px 12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: `2px solid ${isRare ? '#fde68a' : '#e0e7ff'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <button
        onClick={onRelease}
        title="Release this creature"
        style={{
          position: 'absolute', top: 6, right: 6, width: 20, height: 20,
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#f1f5f9', color: '#94a3b8', fontSize: 12, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: isRare ? '#fffbeb' : '#f5f3ff',
        border: `2px solid ${isRare ? '#fbbf24' : '#c4b5fd'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>
        {creature.emoji}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {creature.species}
        </div>
        <div style={{
          fontSize: 10, color: '#6366f1', fontWeight: 600, marginTop: 3,
          background: '#eef2ff', padding: '1px 8px', borderRadius: 20, display: 'inline-block',
        }}>
          Bond Lv {creature.bondLevel}
        </div>
      </div>

      <div style={{
        fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3,
        display: '-webkit-box', overflow: 'hidden',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        From: {creature.poiOriginName}
      </div>
    </div>
  )
}

export function CreaturesPage() {
  const { profile, releaseCreature } = useProfile()
  const { eggs, hatchedCreatures, maxEggSlots } = profile
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)
  const full = hatchedCreatures.length >= cap

  function handleRelease(creature: HatchedCreature) {
    if (window.confirm(`Release ${creature.species}? This frees a slot but the creature is gone for good.`)) {
      releaseCreature(creature.id)
    }
  }

  const emptySlots = Math.max(0, maxEggSlots - eggs.length)
  const slots: (Egg | null)[] = [...eggs, ...Array<null>(emptySlots).fill(null)]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{ padding: '24px 16px 20px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          Creatures
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          Visit landmarks to collect eggs. Visit more to hatch them.
        </p>
      </div>

      {/* Egg slots */}
      <section style={{ padding: '0 16px 24px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          Hatching · {eggs.length}/{maxEggSlots}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {slots.map((egg, i) => (
            <EggSlotCard key={egg?.id ?? `empty-${i}`} egg={egg} />
          ))}
        </div>

        {eggs.length === 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: '#eef2ff', borderRadius: 12,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6366f1' }}>
              💡 Check in at a landmark on the map to get your first egg!
            </p>
          </div>
        )}

        {/* Category hint */}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Heritage 🗿', rare: false },
            { label: 'Landmark 🧭', rare: false },
            { label: 'Arts 🎨', rare: false },
            { label: 'Nature 🌿', rare: true },
            { label: 'Religious 🌟', rare: true },
            { label: 'Museum 📜', rare: true },
          ].map(({ label, rare }) => (
            <span key={label} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 20,
              background: rare ? '#fef3c7' : '#ede9fe',
              color: rare ? '#b45309' : '#7c3aed',
              fontWeight: 600,
            }}>
              {label} · {rare ? 'Rare (8 visits)' : 'Common (5 visits)'}
            </span>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section style={{ padding: '0 16px 32px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          Your Collection · <span style={{ color: full ? '#e11d48' : '#1e293b' }}>{hatchedCreatures.length} / {cap}</span>
        </h2>
        {full && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff1f2', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#e11d48' }}>
              Storage full — release a creature or raise the cap (level up / shop) to hatch more.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[...hatchedCreatures].reverse().map((creature) => (
            <CreatureCard key={creature.id} creature={creature} onRelease={() => handleRelease(creature)} />
          ))}
          {Array.from({ length: Math.max(0, cap - hatchedCreatures.length) }).map((_, i) => (
            <EmptyCreatureSlot key={`empty-${i}`} />
          ))}
        </div>

        {hatchedCreatures.length === 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px', background: '#eef2ff', borderRadius: 12,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6366f1' }}>
              🌱 Hatch an egg to fill your first slot.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
