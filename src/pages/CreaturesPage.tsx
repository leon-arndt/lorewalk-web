import { useEffect, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { creatureCap, creatureName, isEggReady } from '@/lib/profile'
import { getFoodDef } from '@/data/foods'
import { EggPreview } from '@/components/UI/EggPreview'
import { HatchRewardScreen } from '@/components/UI/HatchRewardScreen'
import { CreatureDetailView } from '@/components/UI/CreatureDetailView'
import { CreatureSceneCard } from '@/components/UI/CreatureDetailView'
import { InkButton, Mono, NoteCard, PageHeader, Postmark, SectionTitle } from '@/components/UI/Journal'
import { CREATURES } from '@/data/creatures'
import { getCreaturePreviewURL } from '@/lib/creaturePreview'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { ConfirmDialog } from '@/components/UI/ConfirmDialog'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { Egg, HatchedCreature } from '@/types'
import type { Translations } from '@/i18n/types'
import { categoryCss, forest, ink, inkHint, inkSoft, line, ochreInk, paperCard, pencil, stamp, paperLight, edge } from '@/lib/theme'
import { paperPage, tape, TAPES } from '@/lib/paper'

const TIER_KEY = { common: 'egg_tier_common', rare: 'egg_tier_rare', epic: 'egg_tier_epic' } as const
const TIER_INK = { common: inkHint, rare: ochreInk, epic: stamp } as const

// One egg in the nest. The columns share one taped card, split by dashed lines.
function EggSlotCard({ egg, last, onHatch }: { egg: Egg | null; last: boolean; onHatch: (eggId: string) => void }) {
  const { t } = useLocale()
  const column = {
    minHeight: 150, padding: '0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderRight: last ? 'none' : '1px solid rgba(51,40,30,0.14)',
  } as const

  if (!egg) {
    return (
      <div style={{ ...column, justifyContent: 'center', gap: 10 }}>
        <div aria-hidden style={{ width: 40, height: 52, border: `2px dashed ${pencil}`, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
        <Mono style={{ textAlign: 'center' }}>{t('creatures_visit_landmark')}</Mono>
      </div>
    )
  }

  const ready = isEggReady(egg)
  const pct = Math.min((egg.stepsProgress / egg.stepsRequired) * 100, 100)
  const remaining = egg.stepsRequired - egg.stepsProgress

  return (
    <div style={{ ...column, justifyContent: 'space-between', gap: 5 }}>
      <span style={{ display: 'block', transform: ready ? 'rotate(-8deg)' : undefined }}>
        <EggPreview tier={egg.tier} size={52} />
      </span>
      <Mono style={{ fontWeight: 500, textTransform: 'uppercase', color: TIER_INK[egg.tier] }}>{t(TIER_KEY[egg.tier])}</Mono>
      <span style={{
        fontSize: 11, fontWeight: 500, color: ink, textAlign: 'center', lineHeight: 1.25, maxWidth: '100%',
        display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {egg.poiName}
      </span>
      {ready ? (
        <InkButton onClick={() => onHatch(egg.id)} style={{ width: '100%', padding: '0 4px', fontSize: 13 }}>
          {t('creatures_tap_to_hatch')}
        </InkButton>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ height: 6, background: 'rgba(51,40,30,0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: forest, borderRadius: 3, width: `${pct}%`, transition: 'width 0.4s ease' }} />
          </div>
          <Mono style={{ marginTop: 4, display: 'block', textAlign: 'center' }}>
            {t('creatures_steps_left', { n: remaining })}
          </Mono>
        </div>
      )}
    </div>
  )
}

// A specimen card: the creature on a wash of its type colour, then its name and
// its number in the field guide. The level is a red sticker on the edge, and
// every other card has a strip of tape.
function SpecimenCard({ creature, index, tilt, onTap }: { creature: HatchedCreature; index: number; tilt: number; onTap: () => void }) {
  const { t } = useLocale()
  const no = CREATURES.findIndex((c) => c.species === creature.species) + 1
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        position: 'relative',
        minWidth: 0, background: paperCard, border: `1px solid ${line}`, borderRadius: 6,
        boxShadow: '1px 2px 0 rgba(51,40,30,0.14)', padding: '6px 6px 7px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, textAlign: 'left',
        cursor: 'pointer', transform: `rotate(${tilt}deg)`, color: ink, fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {index % 2 === 0 && (
        <span aria-hidden style={{
          ...tape, width: 44, height: 14, top: -8, left: '50%', marginLeft: -22,
          backgroundImage: TAPES[(index / 2) % TAPES.length], transform: `rotate(${index % 4 === 0 ? 4 : -4}deg)`,
        }} />
      )}
      <span
        aria-label={t('level_badge', { level: creature.level })}
        style={{
          position: 'absolute', right: -7, top: 60, zIndex: 1, minWidth: 28, height: 28, padding: '0 4px',
          background: stamp, color: paperLight, border: '2px solid #fff', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, transform: `rotate(${index % 2 ? -9 : 9}deg)`,
        }}
      >
        {creature.level}
      </span>
      <span style={{
        height: 74, background: `${categoryCss(creature.poiCategory)}33`, borderRadius: 4, overflow: 'hidden',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <CreatureSceneCard creature={creature} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {creatureName(creature)}
      </span>
      <Mono>{t('creatures_specimen_no', { n: String(no).padStart(2, '0') })}</Mono>
    </button>
  )
}

// A species the player has not hatched yet: a pencil outline in the field guide.
function UnseenCard({ species, no, tilt }: { species: string; no: number; tilt: number }) {
  const { t } = useLocale()
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(species).catch(() => null).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [species])
  return (
    <div style={{
      minWidth: 0, border: `1.5px dashed ${pencil}`, borderRadius: 6, padding: 6,
      display: 'flex', flexDirection: 'column', gap: 3, transform: `rotate(${tilt}deg)`,
    }}>
      <span style={{ height: 74, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src && <img src={src} width={62} height={62} alt="" style={{ display: 'block', filter: 'brightness(0)', opacity: 0.16 }} />}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: '16px', color: inkSoft }}>{t('creatures_not_seen')}</span>
      <Mono>{t('creatures_specimen_no', { n: String(no).padStart(2, '0') })}</Mono>
    </div>
  )
}

// Cards sit a little crooked, like photos glued into a notebook.
const TILTS = [-1.2, 0.8, -0.4, 1, -0.8, 0.6]

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
      <h2 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>
        Pantry <span style={{ color: inkHint }}>{foodInventory.length}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {foodInventory.map((item) => {
          const def = getFoodDef(item.foodId)
          if (!def) return null
          return (
            <div key={item.id} style={{
              background: paperCard, border: `1px solid ${line}`, borderRadius: 6, padding: '12px 8px',
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              <EmojiSprite id={`food_${item.foodId}`} emoji={def.emoji} size={32} />
              <span style={{ fontSize: 12, fontWeight: 500, color: ink, textAlign: 'center', lineHeight: 1.2 }}>{def.name}</span>
              <Mono style={{ color: forest }}>+{def.xp} XP</Mono>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: inkHint }}>
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
  const [releaseTarget, setReleaseTarget] = useState<HatchedCreature | null>(null)
  const ownedTypes = TYPE_ORDER.filter((type) => hatchedCreatures.some((c) => c.poiCategory === type))
  // A released creature can take the last of its type with it; fall back to all.
  const activeType = typeFilter && ownedTypes.includes(typeFilter) ? typeFilter : null
  const shownCreatures = [...hatchedCreatures].reverse().filter((c) => !activeType || c.poiCategory === activeType)

  function confirmRelease() {
    if (!releaseTarget) return
    releaseCreature(releaseTarget.id)
    setReleaseTarget(null)
    setSelectedCreature(null)
  }

  function handleHatch(eggId: string) {
    const creature = hatchReadyEgg(eggId)
    if (creature) setRewardCreature(creature)
  }

  const emptySlots = Math.max(0, maxEggSlots - eggs.length)
  const slots: (Egg | null)[] = [...eggs, ...Array<null>(emptySlots).fill(null)]
  const seen = new Set(hatchedCreatures.map((c) => c.species))
  const unseen = CREATURES.map((c, i) => ({ species: c.species, no: i + 1 })).filter((c) => !seen.has(c.species))
  const recorded = CREATURES.length - unseen.length

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <PageHeader
        title={t('creatures_title')}
        right={<Postmark figure={`${recorded}/${CREATURES.length}`} word={t('creatures_recorded_word')} />}
      />

      {/* The nest: egg slots */}
      <section style={{ padding: '18px 16px 22px' }}>
        <NoteCard taped tilt={-0.6}>
          <SectionTitle>{t('creatures_hatching', { n: eggs.length, max: maxEggSlots })}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slots.length, 3)}, minmax(0, 1fr))`, rowGap: 14 }}>
            {slots.map((egg, i) => (
              <EggSlotCard key={egg?.id ?? `empty-${i}`} egg={egg} last={i % 3 === 2 || i === slots.length - 1} onHatch={handleHatch} />
            ))}
          </div>
        </NoteCard>

        {eggs.length === 0 && (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: inkSoft }}>{t('creatures_egg_hint')}</p>
        )}

        {/* Which landmark type gives which egg */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {([
            { tier: 'common', steps: 100, types: [t('category_heritage'), t('poi_landmark'), t('category_arts')] },
            { tier: 'rare', steps: 1000, types: [t('category_religious'), t('category_nature')] },
            { tier: 'epic', steps: 5000, types: [t('category_museum')] },
          ] as const).map(({ tier, steps, types }) => (
            <Mono key={tier}>
              <span style={{ fontWeight: 500, textTransform: 'uppercase', color: TIER_INK[tier] }}>{t(TIER_KEY[tier])}</span>
              {' · '}{steps.toLocaleString()} {t('steps_unit')}{' · '}{types.join(', ')}
            </Mono>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section style={{ padding: '0 16px 26px' }}>
        <SectionTitle note={<span style={{ color: full ? stamp : undefined }}>{hatchedCreatures.length} / {cap}</span>}>
          {t('creatures_collection')}
        </SectionTitle>
        {full && (
          <p style={{ margin: '0 0 12px', padding: '8px 10px', border: `1.5px solid ${stamp}`, borderRadius: 6, fontSize: 12, color: stamp }}>
            {t('creatures_storage_full')}
          </p>
        )}

        {ownedTypes.length > 1 && (
          <div className="mb-3 flex items-center gap-2.5">
            {ownedTypes.map((type) => {
              const on = activeType === type
              return (
                <button
                  key={type}
                  type="button"
                  aria-label={t(TYPE_LABEL[type])}
                  aria-pressed={on}
                  onClick={() => setTypeFilter(on ? null : type)}
                  className="size-7 shrink-0 rounded-full transition-all"
                  style={{
                    background: categoryCss(type),
                    border: `1px solid ${edge}`,
                    boxShadow: on ? `0 0 0 2px ${paperCard}, 0 0 0 4px ${ink}` : undefined,
                    opacity: activeType && !on ? 0.4 : 1,
                  }}
                />
              )
            })}
            {activeType && <Mono style={{ marginLeft: 4 }}>{t(TYPE_LABEL[activeType])}</Mono>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {shownCreatures.map((creature, i) => (
            <SpecimenCard
              key={creature.id}
              creature={creature}
              index={i}
              tilt={TILTS[i % TILTS.length]}
              onTap={() => setSelectedCreature(creature)}
            />
          ))}
        </div>

        {hatchedCreatures.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>{t('creatures_hatch_hint')}</p>
        )}
      </section>

      <PantrySection />

      {/* Field guide: every species not hatched yet */}
      {unseen.length > 0 && (
        <section style={{ padding: '0 16px 32px' }}>
          <SectionTitle note={t('creatures_recorded', { n: recorded, total: CREATURES.length })}>
            {t('creatures_field_guide')}
          </SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {unseen.map(({ species, no }, i) => (
              <UnseenCard key={species} species={species} no={no} tilt={TILTS[(i + 3) % TILTS.length]} />
            ))}
          </div>
        </section>
      )}

      {selectedCreature && (
        <CreatureDetailView
          creature={selectedCreature}
          foodInventory={profile.foodInventory}
          onFeed={(creatureId, foodItemId) => feedCreature(creatureId, foodItemId)}
          onRelease={() => setReleaseTarget(selectedCreature)}
          onClose={() => setSelectedCreature(null)}
        />
      )}

      <ConfirmDialog
        open={releaseTarget !== null}
        danger
        icon={releaseTarget && (
          <CreaturePreview species={releaseTarget.species} emoji={releaseTarget.emoji} creatureType={releaseTarget.creatureType} isShiny={releaseTarget.isShiny} size={88} />
        )}
        title={releaseTarget ? t('creatures_release_title', { name: creatureName(releaseTarget) }) : ''}
        body={releaseTarget ? t('creatures_release_body', { name: creatureName(releaseTarget) }) : ''}
        confirmLabel={t('creatures_release_yes')}
        cancelLabel={releaseTarget ? t('creatures_release_keep', { name: creatureName(releaseTarget) }) : ''}
        onConfirm={confirmRelease}
        onCancel={() => setReleaseTarget(null)}
      />

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
