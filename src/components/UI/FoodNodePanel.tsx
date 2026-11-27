import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { getFoodDef, foodPowerRequirement } from '@/data/foods'
import { creaturePower, creatureName, foodExpeditionDurationMs, MAX_FOOD_CREATURES } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import { paperCardStyle, paperSheet, paperTag } from '@/lib/paper'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import type { FoodNode, HatchedCreature, PlayerPosition } from '@/types'
import { categoryCss, forest, ink, inkHint, inkSoft, paperLight, edge } from '@/lib/theme'
import { InkButton, Mono } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { panelMotion } from '@/lib/motion'

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type SortKey = 'power' | 'name' | 'recent'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'power', label: 'Power' },
  { key: 'name', label: 'Name' },
  { key: 'recent', label: 'Newest' },
]

interface Props {
  node: FoodNode
  position: PlayerPosition | null
  onStart: (creatureIds: string[], durationMs: number) => void
  onCollect: () => void
  onClose: () => void
  isClosing?: boolean
}

const panelStyle = {
  position: 'absolute' as const, bottom: 0, left: 0, right: 0,
  ...paperSheet,
  boxShadow: '0 -3px 0 rgba(51,40,30,0.12)',
  borderRadius: '10px 10px 0 0',
  padding: '10px 20px',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
  zIndex: 10,
}

const titleStyle = { margin: 0, fontSize: 22, fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.01em', color: ink } as const
const kicker = { display: 'block', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: inkSoft } as const
const typed = { display: 'block', fontSize: 12, lineHeight: '18px', color: inkSoft } as const

// An ink-outlined bar with a forest fill. `value` runs from 0 to 1.
function InkBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div style={{ height: 8, background: 'rgba(51,40,30,0.12)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', background: forest, width: `${pct}%`, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export function FoodNodePanel({ node, position, onStart, onCollect, onClose, isClosing = false }: Props) {
  const { t } = useLocale()
  const { profile, busyCreatureIds } = useProfile()
  const def = getFoodDef(node.foodId)
  const [now, setNow] = useState(Date.now())
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('power')

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const requirement = foodPowerRequirement(node.foodId)

  const distM = position
    ? Math.round(haversineDistance(position.latitude, position.longitude, node.lat, node.lon))
    : 0

  const byId = useMemo(
    () => new Map(profile.hatchedCreatures.map((c) => [c.id, c])),
    [profile.hatchedCreatures],
  )

  const available = useMemo(() => {
    const list = profile.hatchedCreatures.filter((c) => !busyCreatureIds.has(c.id))
    const sorted = [...list]
    if (sortKey === 'power') sorted.sort((a, b) => creaturePower(b) - creaturePower(a))
    else if (sortKey === 'name') sorted.sort((a, b) => a.species.localeCompare(b.species))
    else sorted.sort((a, b) => new Date(b.hatchedAt).getTime() - new Date(a.hatchedAt).getTime())
    return sorted
  }, [profile.hatchedCreatures, busyCreatureIds, sortKey])

  if (!def) return null

  const exp = node.expedition
  const expReady = exp && now >= new Date(exp.returnsAt).getTime()

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_FOOD_CREATURES) return prev
      return [...prev, id]
    })
  }

  const selectedPower = selected.reduce((sum, id) => {
    const c = byId.get(id)
    return sum + (c ? creaturePower(c) : 0)
  }, 0)
  const durationMs = foodExpeditionDurationMs(distM, selected.length || 1)
  const canSend = selected.length > 0 && selectedPower >= requirement

  // Header shared by every view
  const header = (
    <>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: ink, margin: '0 auto 16px' }} />
      <button
        onClick={onClose}
        data-sfx="close"
        style={{
          position: 'absolute', top: 8, right: 10,
          width: 44, height: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          ...paperTag, width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
        }}>×</span>
      </button>
    </>
  )

  // The food sprite on a wash of the landmark's category colour.
  const foodTile = (size: number) => (
    <div style={{
      flexShrink: 0, padding: 4, borderRadius: 6,
      background: `${categoryCss(node.poiCategory)}40`, border: `1px solid ${edge}`,
    }}>
      <EmojiSprite id={`food_${node.foodId}`} emoji={def.emoji} size={size} />
    </div>
  )

  // ── Expedition in progress / ready to collect ────────────────────────────────
  if (exp) {
    const members = exp.creatureIds.map((id) => byId.get(id)).filter(Boolean) as HatchedCreature[]
    const startedMs = new Date(exp.startedAt).getTime()
    const returnsMs = new Date(exp.returnsAt).getTime()
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingRight: 40 }}>
          {foodTile(44)}
          <div style={{ minWidth: 0 }}>
            <h2 style={titleStyle}>{def.name}</h2>
            <Mono style={typed}>Near {node.poiName}</Mono>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {members.map((m) => (
            <div key={m.id} style={{ ...paperCardStyle, padding: '4px 6px', textAlign: 'center' }}>
              <CreaturePreview species={m.species} emoji={m.emoji} creatureType={m.creatureType} isShiny={m.isShiny} size={48} />
              <Mono style={{ display: 'block', marginTop: 2 }}>{t('level_badge', { level: m.level })}</Mono>
            </div>
          ))}
        </div>

        {expReady ? (
          <InkButton
            onClick={onCollect}
            style={{ width: '100%', minHeight: 48, fontSize: 16 }}
          >
            Collect {def.name} 🎁
          </InkButton>
        ) : (
          <div>
            <InkBar value={(now - startedMs) / Math.max(1, returnsMs - startedMs)} />
            <Mono style={{ ...typed, marginTop: 8, textAlign: 'center' }}>
              Foraging. Back in {formatDuration(returnsMs - now)}
            </Mono>
          </div>
        )}
      </motion.div>
    )
  }

  // ── Creature selection ───────────────────────────────────────────────────────
  if (selecting) {
    const enough = selectedPower >= requirement
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {foodTile(36)}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ ...titleStyle, fontSize: 19, lineHeight: '24px' }}>{def.name}</h2>
              <Mono style={{ display: 'block' }}>Select up to {MAX_FOOD_CREATURES} creatures</Mono>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Mono style={kicker}>Power</Mono>
            <div style={{ fontSize: 22, fontWeight: 600, color: enough ? forest : ink, lineHeight: '24px' }}>
              {selectedPower} <Mono style={{ fontSize: 13 }}>/ {requirement}</Mono>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              style={{
                minHeight: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                ...paperTag, padding: '5px 12px', fontSize: 13, lineHeight: '18px', fontWeight: 500,
                background: sortKey === s.key ? ink : paperTag.background,
                color: sortKey === s.key ? paperLight : ink,
              }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {available.length === 0 ? (
          <p style={{ margin: '20px 0', fontSize: 14, color: inkHint, textAlign: 'center' }}>
            No creatures available. Hatch some eggs first.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            maxHeight: 200, overflowY: 'auto', marginBottom: 14, padding: '2px 3px 4px 2px',
          }}>
            {available.map((c) => {
              const isSel = selected.includes(c.id)
              const atMax = !isSel && selected.length >= MAX_FOOD_CREATURES
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  disabled={atMax}
                  style={{
                    ...paperCardStyle,
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    minWidth: 0, padding: '8px 4px 6px', cursor: atMax ? 'default' : 'pointer',
                    ...(isSel && {
                      background: `${categoryCss(c.poiCategory)}40`,
                      outline: `1.5px solid ${ink}`, outlineOffset: -1,
                    }),
                    opacity: atMax ? 0.4 : 1, fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isSel && (
                    <span style={{
                      position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%',
                      background: ink, color: paperLight, fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</span>
                  )}
                  <CreaturePreview species={c.species} emoji={c.emoji} creatureType={c.creatureType} isShiny={c.isShiny} size={40} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: ink, lineHeight: '14px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{creatureName(c)}</span>
                  <Mono style={{ color: inkSoft }}>⚡{creaturePower(c)}</Mono>
                </button>
              )
            })}
          </div>
        )}

        <InkButton
          onClick={() => { onStart(selected, durationMs); }}
          disabled={!canSend}
          style={{ width: '100%', minHeight: 48, fontSize: 16 }}
        >
          {selected.length === 0
            ? 'Select creatures'
            : selectedPower < requirement
              ? `Need ${requirement - selectedPower} more power`
              : `Send ${selected.length} · ⏱ ${formatDuration(durationMs)}`}
        </InkButton>
      </motion.div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  return (
    <motion.div {...panelMotion(isClosing)} style={panelStyle}>
      {header}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingRight: 40 }}>
        {foodTile(52)}
        <div style={{ minWidth: 0 }}>
          <h2 style={titleStyle}>{def.name}</h2>
          <Mono style={{ ...typed, marginBottom: 4 }}>Near {node.poiName}</Mono>
          <div style={{ display: 'flex', gap: '2px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Mono style={{ ...typed, fontWeight: 500, color: forest }}>
              +{def.xp} creature XP
            </Mono>
            <Mono style={{ ...typed, color: ink }}>
              ⚡ {requirement} power
            </Mono>
            {distM > 0 && (
              <Mono style={{ ...typed, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <EmojiSprite id="item_compass" emoji="🧭" size={16} /> {distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`}
              </Mono>
            )}
          </div>
        </div>
      </div>

      <InkButton
        onClick={() => setSelecting(true)}
        style={{ width: '100%', minHeight: 48, fontSize: 16 }}
      >
        Start expedition
      </InkButton>
    </motion.div>
  )
}
