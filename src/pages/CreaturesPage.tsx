import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { creatureCap, creatureName, isEggReady } from '@/lib/profile'
import { getFoodDef } from '@/data/foods'
import { EggPreview } from '@/components/UI/EggPreview'
import { HatchRewardScreen } from '@/components/UI/HatchRewardScreen'
import { CreatureDetailView } from '@/components/UI/CreatureDetailView'
import { CreatureTile, EmptyPad } from '@/components/UI/CreatureTile'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import type { Egg, HatchedCreature } from '@/types'
import type { Translations } from '@/i18n/types'
import { accent, categoryCss } from '@/lib/theme'
import { glassPage } from '@/lib/glass'

function EggSlotCard({ egg, onHatch }: { egg: Egg | null; onHatch: (eggId: string) => void }) {
  const { t } = useLocale()

  if (!egg) {
    return (
      <div style={{
        border: '2px dashed rgba(100,116,139,0.22)', borderRadius: 16, padding: '20px 10px',
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
        background: 'rgba(255,255,255,0.58)', borderRadius: 16, padding: '14px 10px',
        boxShadow: ready ? '0 0 0 3px rgba(99,102,241,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.9)',
        border: `2px solid ${ready ? '#818cf8' : 'transparent'}`,
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
            {t('creatures_steps_left', { n: remaining })}
          </span>
        </div>
      )}
    </div>
  )
}

const TYPE_ORDER = ['heritage', 'landmark', 'arts', 'religious', 'nature', 'museum']
const TYPE_LABEL: Record<string, keyof Translations> = {
  heritage: 'category_heritage',
  landmark: 'poi_landmark',
  arts: 'category_arts',
  religious: 'category_religious',
  nature: 'category_nature',
  museum: 'category_museum',
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
              background: 'rgba(255,255,255,0.58)', borderRadius: 14, padding: '12px 8px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
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
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const ownedTypes = TYPE_ORDER.filter((type) => hatchedCreatures.some((c) => c.poiCategory === type))
  // A released creature can take the last of its type with it; fall back to all.
  const activeType = typeFilter && ownedTypes.includes(typeFilter) ? typeFilter : null
  const shownCreatures = [...hatchedCreatures].reverse().filter((c) => !activeType || c.poiCategory === activeType)

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
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', ...glassPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
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
            { label: `${t('category_heritage')} 🗿`, tier: 'common', steps: 100 },
            { label: `${t('poi_landmark')} 🧭`, tier: 'common', steps: 100 },
            { label: `${t('category_arts')} 🎨`,     tier: 'common', steps: 100 },
            { label: `${t('category_religious')} 🌟`, tier: 'rare',  steps: 1000 },
            { label: `${t('category_nature')} 🌿`,   tier: 'rare',   steps: 1000 },
            { label: `${t('category_museum')} 📜`,   tier: 'epic',   steps: 5000 },
          ].map(({ label, tier, steps }) => (
            <span key={label} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 20,
              background: 'rgba(255,255,255,0.5)',
              color: tier === 'epic' ? '#b91c1c' : tier === 'rare' ? '#a16207' : '#64748b',
              fontWeight: 500,
            }}>
              {label} - {tier.charAt(0).toUpperCase() + tier.slice(1)} ({steps.toLocaleString()} steps)
            </span>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section style={{ padding: '0 16px 32px' }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: accent }}>
            {t('creatures_collection')}
          </h2>
          <span className="text-[13px] font-semibold tabular-nums text-slate-400">
            <span className={full ? 'text-rose-600' : 'text-slate-800'}>{hatchedCreatures.length}</span> / {cap}
          </span>
        </div>
        {full && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff1f2', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#e11d48' }}>
              {t('creatures_storage_full')}
            </p>
          </div>
        )}

        {ownedTypes.length > 1 && (
          <div className="mb-2 flex items-center gap-2.5">
            {ownedTypes.map((type) => {
              const on = activeType === type
              const color = categoryCss(type)
              return (
                <button
                  key={type}
                  type="button"
                  aria-label={t(TYPE_LABEL[type])}
                  aria-pressed={on}
                  onClick={() => setTypeFilter(on ? null : type)}
                  className="size-7 shrink-0 rounded-full transition-all"
                  style={{
                    background: color,
                    boxShadow: on ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'inset 0 -2px 0 rgba(0,0,0,0.12)',
                    opacity: activeType && !on ? 0.4 : 1,
                  }}
                />
              )
            })}
            {activeType && (
              <span className="ml-1 text-[12px] font-semibold text-slate-600">{t(TYPE_LABEL[activeType])}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-1">
          {shownCreatures.map((creature) => (
            <CreatureTile
              key={creature.id}
              creature={creature}
              onTap={() => setSelectedCreature(creature)}
            />
          ))}
          {!activeType && Array.from({ length: Math.max(0, cap - hatchedCreatures.length) }).map((_, i) => (
            <EmptyPad key={`empty-${i}`} />
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
