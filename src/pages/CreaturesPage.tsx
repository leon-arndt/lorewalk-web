import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { creatureCap, xpForCreatureLevel } from '@/lib/profile'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import { EggPreview } from '@/components/UI/EggPreview'
import type { Egg, HatchedCreature } from '@/types'

const RARE_CATEGORIES = new Set(['religious', 'museum', 'nature'])

function EggSlotCard({ egg }: { egg: Egg | null }) {
  const { t } = useLocale()

  if (!egg) {
    return (
      <div style={{
        border: '2px dashed #e2e8f0', borderRadius: 16, padding: '20px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, minHeight: 144, justifyContent: 'center',
      }}>
        <span style={{ fontSize: 30, opacity: 0.25 }}>🥚</span>
        <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500, textAlign: 'center' }}>
          {t('creatures_visit_landmark')}
        </span>
      </div>
    )
  }

  const isRare = egg.tier === 'rare'
  const isEpic = egg.tier === 'epic'
  const pct = Math.min((egg.stepsProgress / egg.stepsRequired) * 100, 100)
  const remaining = egg.stepsRequired - egg.stepsProgress

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '14px 10px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      border: `2px solid ${isEpic ? '#fca5a5' : isRare ? '#fde68a' : '#c7d2fe'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 7, minHeight: 144,
    }}>
      <EggPreview tier={egg.tier} size={52} />

      <span style={{
        fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
        background: isEpic ? '#fee2e2' : isRare ? '#fef3c7' : '#ede9fe',
        color: isEpic ? '#dc2626' : isRare ? '#b45309' : '#7c3aed',
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
            background: isEpic
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : isRare
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #818cf8, #a78bfa)',
            width: `${pct}%`,
          }} />
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'block', textAlign: 'center' }}>
          {t('creatures_visits_left', { n: remaining })}
        </span>
      </div>
    </div>
  )
}

function EmptyCreatureSlot() {
  const { t } = useLocale()
  return (
    <div style={{
      border: '2px dashed #e2e8f0', borderRadius: 16, minHeight: 132,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 22, opacity: 0.3 }}>🐾</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#cbd5e1' }}>{t('creatures_empty_slot')}</span>
    </div>
  )
}

function CreatureCard({ creature, onRelease }: { creature: HatchedCreature; onRelease: () => void }) {
  const { t } = useLocale()
  const isRare = RARE_CATEGORIES.has(creature.poiCategory)
  const xpNeeded = xpForCreatureLevel(creature.level)
  const xpPct = Math.min(1, creature.xp / xpNeeded) * 100
  const atCap = creature.level >= 20
  const accentColor = isRare ? '#d97706' : '#6366f1'
  const accentBg = isRare ? '#fde68a' : '#e0e7ff'

  return (
    <div style={{
      position: 'relative',
      background: 'white', borderRadius: 16, padding: '16px 12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: `2px solid ${isRare ? '#fde68a' : '#e0e7ff'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      {/* Release button */}
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

      {/* Level badge */}
      <div style={{
        position: 'absolute', top: 6, left: 8,
        background: accentBg, color: accentColor,
        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
        letterSpacing: '0.03em',
      }}>
        Lv.{creature.level}
      </div>

      {/* Creature image */}
      <div style={{
        width: 72, height: 72, borderRadius: 12, overflow: 'hidden',
        background: isRare ? '#fffbeb' : '#f5f3ff',
        border: `2px solid ${isRare ? '#fbbf24' : '#c4b5fd'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
      }}>
        <CreaturePreview category={creature.poiCategory} />
      </div>

      {/* XP bar */}
      {!atCap && (
        <div style={{ width: '100%' }}>
          <div style={{
            height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${xpPct}%`,
              background: accentColor, borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>
            {creature.xp} / {xpNeeded} XP
          </div>
        </div>
      )}
      {atCap && (
        <div style={{ fontSize: 8, color: accentColor, fontWeight: 700 }}>MAX</div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {creature.species}
        </div>
      </div>

      <div style={{
        fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3,
        display: '-webkit-box', overflow: 'hidden',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {t('creatures_from', { name: creature.poiOriginName })}
      </div>
    </div>
  )
}

export function CreaturesPage() {
  const { profile, releaseCreature } = useProfile()
  const { t } = useLocale()
  const { eggs, hatchedCreatures, maxEggSlots } = profile
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)
  const full = hatchedCreatures.length >= cap

  function handleRelease(creature: HatchedCreature) {
    if (window.confirm(t('creatures_release_confirm', { name: creature.species }))) {
      releaseCreature(creature.id)
    }
  }

  const emptySlots = Math.max(0, maxEggSlots - eggs.length)
  const slots: (Egg | null)[] = [...eggs, ...Array<null>(emptySlots).fill(null)]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'linear-gradient(160deg, #f8faff 0%, #f2efff 55%, #fdf6ff 100%)', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 20px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          {t('creatures_title')}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          {t('creatures_subtitle')}
        </p>
      </div>

      {/* Egg slots */}
      <section style={{ padding: '0 16px 24px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          {t('creatures_hatching', { n: eggs.length, max: maxEggSlots })}
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
              {t('creatures_egg_hint')}
            </p>
          </div>
        )}

        {/* Category hint */}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Heritage 🗿', tier: 'common', steps: 100 },
            { label: 'Landmark 🧭', tier: 'common', steps: 100 },
            { label: 'Arts 🎨',     tier: 'common', steps: 100 },
            { label: 'Religious 🌟', tier: 'rare',  steps: 1000 },
            { label: 'Nature 🌿',   tier: 'rare',   steps: 1000 },
            { label: 'Museum 📜',   tier: 'epic',   steps: 5000 },
          ].map(({ label, tier, steps }) => (
            <span key={label} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 20,
              background: tier === 'epic' ? '#fee2e2' : tier === 'rare' ? '#fef3c7' : '#ede9fe',
              color: tier === 'epic' ? '#dc2626' : tier === 'rare' ? '#b45309' : '#7c3aed',
              fontWeight: 600,
            }}>
              {label} · {tier.charAt(0).toUpperCase() + tier.slice(1)} ({steps.toLocaleString()} steps)
            </span>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section style={{ padding: '0 16px 32px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          {t('creatures_collection')} · <span style={{ color: full ? '#e11d48' : '#1e293b' }}>{hatchedCreatures.length} / {cap}</span>
        </h2>
        {full && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff1f2', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#e11d48' }}>
              {t('creatures_storage_full')}
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
              {t('creatures_hatch_hint')}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
