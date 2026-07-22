import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { creatureCap, creatureName, isEggReady, xpForCreatureLevel } from '@/lib/profile'
import { getFoodDef } from '@/data/foods'
import { EggPreview } from '@/components/UI/EggPreview'
import { HatchRewardScreen } from '@/components/UI/HatchRewardScreen'
import { CreatureDetailView, CreatureSceneCard } from '@/components/UI/CreatureDetailView'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import type { Egg, HatchedCreature } from '@/types'
import { accent, accentSoft } from '@/lib/theme'
import { pageBackground } from '@/lib/glass'

const RARE_CATEGORIES = new Set(['religious', 'museum', 'nature'])

function EggSlotCard({ egg, onHatch }: { egg: Egg | null; onHatch: (eggId: string) => void }) {
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
  const ready = isEggReady(egg)
  const pct = Math.min((egg.stepsProgress / egg.stepsRequired) * 100, 100)
  const remaining = egg.stepsRequired - egg.stepsProgress

  return (
    <div
      onClick={ready ? () => onHatch(egg.id) : undefined}
      style={{
        position: 'relative',
        background: 'white', borderRadius: 16, padding: '14px 10px',
        boxShadow: ready ? '0 0 0 3px rgba(99,102,241,0.25), 0 1px 4px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.08)',
        border: `2px solid ${ready ? '#818cf8' : isEpic ? '#fca5a5' : isRare ? '#fde68a' : '#c7d2fe'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 7, minHeight: 144,
        cursor: ready ? 'pointer' : 'default',
      }}
    >
      {ready && (
        <span style={{
          position: 'absolute', top: -5, right: -5, width: 14, height: 14,
          borderRadius: '50%', background: '#ef4444', border: '2px solid white',
        }} />
      )}

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

      {ready ? (
        <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>
          Tap to hatch!
        </span>
      ) : (
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
      )}
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

function CreatureCard({ creature, onTap }: { creature: HatchedCreature; onTap: () => void }) {
  const { t } = useLocale()
  const isRare = RARE_CATEGORIES.has(creature.poiCategory)
  const xpNeeded = xpForCreatureLevel(creature.level)
  const xpPct = Math.min(1, creature.xp / xpNeeded) * 100
  const atCap = creature.level >= 20
  const accentColor = creature.isShiny ? '#d97706' : isRare ? '#d97706' : accent
  const accentBg = creature.isShiny ? '#fef3c7' : isRare ? '#fde68a' : accentSoft

  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative',
        background: creature.isShiny
          ? 'linear-gradient(160deg, #fffbeb, #fef3c7)'
          : 'white',
        borderRadius: 16, padding: '16px 12px 12px',
        boxShadow: creature.isShiny
          ? '0 0 0 2px #f59e0b, 0 2px 8px rgba(245,158,11,0.20)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        border: `2px solid ${creature.isShiny ? '#f59e0b' : isRare ? '#fde68a' : '#e0e7ff'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Level badge */}
      <div style={{
        position: 'absolute', top: 6, left: 8,
        background: accentBg, color: accentColor,
        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
        letterSpacing: '0.03em',
      }}>
        {t('level_badge', { level: creature.level })}
      </div>

      {/* Animated creature scene */}
      <div style={{ marginTop: 12 }}>
        <CreatureSceneCard creature={creature} />
      </div>

      {/* XP bar */}
      {!atCap && (
        <div style={{ width: '100%' }}>
          <div style={{ height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${xpPct}%`,
              background: accentColor, borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}
      {atCap && (
        <div style={{ fontSize: 8, color: accentColor, fontWeight: 700 }}>MAX</div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
          {creatureName(creature)}
        </div>
      </div>
    </div>
  )
}

function PantrySection() {
  const { profile } = useProfile()
  const { foodInventory } = profile

  if (foodInventory.length === 0) return null

  return (
    <section style={{ padding: '0 16px 24px' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
        Pantry <span style={{ color: '#6366f1' }}>{foodInventory.length}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {foodInventory.map((item) => {
          const def = getFoodDef(item.foodId)
          if (!def) return null
          return (
            <div key={item.id} style={{
              background: 'white', borderRadius: 14, padding: '12px 8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              border: '2px solid #e0e7ff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              <EmojiSprite id={`food_${item.foodId}`} emoji={def.emoji} size={32} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', textAlign: 'center', lineHeight: 1.2 }}>{def.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 20, padding: '1px 7px' }}>+{def.xp} XP</span>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8' }}>
        Tap a creature to feed it.
      </p>
    </section>
  )
}

export function CreaturesPage() {
  const { profile, releaseCreature, feedCreature, hatchReadyEgg, renameCreature } = useProfile()
  const { t } = useLocale()
  const { eggs, hatchedCreatures, maxEggSlots } = profile
  const cap = creatureCap(profile.level, profile.bonusCreatureSlots)
  const full = hatchedCreatures.length >= cap
  const [rewardCreature, setRewardCreature] = useState<HatchedCreature | null>(null)
  const [selectedCreature, setSelectedCreature] = useState<HatchedCreature | null>(null)

  function handleRelease(creature: HatchedCreature) {
    if (window.confirm(t('creatures_release_confirm', { name: creatureName(creature) }))) {
      releaseCreature(creature.id)
      setSelectedCreature(null)
    }
  }

  function handleHatch(eggId: string) {
    const creature = hatchReadyEgg(eggId)
    if (creature) setRewardCreature(creature)
  }

  const emptySlots = Math.max(0, maxEggSlots - eggs.length)
  const slots: (Egg | null)[] = [...eggs, ...Array<null>(emptySlots).fill(null)]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: pageBackground, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 20px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: accent }}>
          {t('creatures_title')}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          {t('creatures_subtitle')}
        </p>
      </div>

      {/* Egg slots */}
      <section style={{ padding: '0 16px 24px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
          {t('creatures_hatching', { n: eggs.length, max: maxEggSlots })}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {slots.map((egg, i) => (
            <EggSlotCard key={egg?.id ?? `empty-${i}`} egg={egg} onHatch={handleHatch} />
          ))}
        </div>

        {eggs.length === 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#eef2ff', borderRadius: 12 }}>
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
              {label} - {tier.charAt(0).toUpperCase() + tier.slice(1)} ({steps.toLocaleString()} steps)
            </span>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section style={{ padding: '0 16px 32px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
          {t('creatures_collection')} <span style={{ color: full ? '#e11d48' : '#1e293b' }}>{hatchedCreatures.length} / {cap}</span>
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
            <CreatureCard
              key={creature.id}
              creature={creature}
              onTap={() => setSelectedCreature(creature)}
            />
          ))}
          {Array.from({ length: Math.max(0, cap - hatchedCreatures.length) }).map((_, i) => (
            <EmptyCreatureSlot key={`empty-${i}`} />
          ))}
        </div>

        {hatchedCreatures.length === 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#eef2ff', borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6366f1' }}>
              {t('creatures_hatch_hint')}
            </p>
          </div>
        )}
      </section>

      <PantrySection />

      {selectedCreature && (
        <CreatureDetailView
          creature={selectedCreature}
          foodInventory={profile.foodInventory}
          onFeed={(creatureId, foodItemId) => feedCreature(creatureId, foodItemId)}
          onRelease={() => handleRelease(selectedCreature)}
          onClose={() => setSelectedCreature(null)}
        />
      )}

      {rewardCreature && (
        <HatchRewardScreen
          creature={rewardCreature}
          onRename={(nickname) => {
            renameCreature(rewardCreature.id, nickname)
            setRewardCreature({ ...rewardCreature, nickname: nickname || undefined })
          }}
          onDismiss={() => setRewardCreature(null)}
        />
      )}
    </div>
  )
}
