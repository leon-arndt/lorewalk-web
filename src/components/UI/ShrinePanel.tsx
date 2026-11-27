import { useEffect, useMemo, useState } from 'react'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { creaturePower, creatureName, MAX_SHRINE_CREATURES, SHRINE_DURATION_MS } from '@/lib/profile'
import { paperCardStyle, paperSheet, paperTag } from '@/lib/paper'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { HatchedCreature, ShrineNode, PlayerPosition } from '@/types'
import { categoryCss, forest, ink, inkHint, inkSoft, paperLight, stamp, edge } from '@/lib/theme'
import { InkButton, Mono, Stamp } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { panelMotion } from '@/lib/motion'

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const DIFFICULTY_LABELS: Record<number, string> = {
  20: 'Easy',
  30: 'Medium',
  50: 'Hard',
}

type SortKey = 'power' | 'name' | 'recent'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'power', label: 'Power' },
  { key: 'name', label: 'Name' },
  { key: 'recent', label: 'Newest' },
]

interface Props {
  node: ShrineNode
  position: PlayerPosition | null
  onStart: (creatureIds: string[]) => void
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

export function ShrinePanel({ node, position: _position, onStart, onCollect, onClose, isClosing = false }: Props) {
  const { t } = useLocale()
  const { profile, busyCreatureIds } = useProfile()
  const [now, setNow] = useState(Date.now())
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('power')

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

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

  const isCleared = node.clearedUntil && Date.now() < new Date(node.clearedUntil).getTime()
  const exp = node.expedition
  const expReady = exp && now >= new Date(exp.returnsAt).getTime()
  const difficultyLabel = DIFFICULTY_LABELS[node.difficulty] ?? 'Unknown'

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_SHRINE_CREATURES) return prev
      return [...prev, id]
    })
  }

  const selectedPower = selected.reduce((sum, id) => {
    const c = byId.get(id)
    return sum + (c ? creaturePower(c) : 0)
  }, 0)
  const canSend = selected.length > 0

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
          fontSize: 16, lineHeight: 1,
        }}>x</span>
      </button>
    </>
  )

  // The shrine sprite on a wash of the landmark's category colour.
  const shrineTile = (size: number) => (
    <div style={{
      flexShrink: 0, padding: 4, borderRadius: 6,
      background: `${categoryCss(node.poiCategory)}40`, border: `1px solid ${edge}`,
    }}>
      <EmojiSprite id="item_shrine" emoji="⛩️" size={size} />
    </div>
  )

  // ── Cleared (held) ───────────────────────────────────────────────────────────
  if (isCleared) {
    const clearedMs = new Date(node.clearedUntil!).getTime() - now
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ marginBottom: 10 }}>{shrineTile(60)}</div>
          <Mono style={kicker}>{t('shrine_held')}</Mono>
          <h2 style={{ ...titleStyle, margin: '0 0 14px' }}>
            {node.poiName}
          </h2>
          <div style={{ ...paperTag, display: 'inline-block', padding: '8px 16px' }}>
            <Mono style={{ fontSize: 13, lineHeight: '18px', fontWeight: 500, color: ink }}>
              Replenishes in {formatDuration(clearedMs)}
            </Mono>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Expedition in progress / ready ──────────────────────────────────────────
  if (exp) {
    const members = exp.creatureIds.map((id) => byId.get(id)).filter(Boolean) as HatchedCreature[]
    const willWin = exp.power >= node.difficulty
    const startedMs = new Date(exp.startedAt).getTime()
    const returnsMs = new Date(exp.returnsAt).getTime()
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingRight: 40 }}>
          {shrineTile(48)}
          <div style={{ minWidth: 0 }}>
            <Mono style={kicker}>{t('shrine_guardian_shrine')}</Mono>
            <h2 style={titleStyle}>
              {node.poiName}
            </h2>
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
          <>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <Stamp color={willWin ? forest : stamp} tilt={-3} style={{ fontSize: 13, lineHeight: '18px', padding: '5px 12px' }}>
                {willWin ? '⚔️ Victory!' : '💀 Defeated - too weak'}
              </Stamp>
            </div>
            <InkButton
              variant={willWin ? 'ink' : 'paper'}
              onClick={onCollect}
              style={{ width: '100%', minHeight: 48, fontSize: 16 }}
            >
              {willWin ? 'Claim Shrine 🏆' : 'Return home'}
            </InkButton>
          </>
        ) : (
          <div>
            <InkBar value={(now - startedMs) / Math.max(1, returnsMs - startedMs)} />
            <Mono style={{ ...typed, marginTop: 8, textAlign: 'center' }}>
              Battle in progress. Back in {formatDuration(returnsMs - now)}
            </Mono>
          </div>
        )}
      </motion.div>
    )
  }

  // ── Creature selection ───────────────────────────────────────────────────────
  if (selecting) {
    const enough = selectedPower >= node.difficulty
    return (
      <motion.div {...panelMotion(isClosing)} style={panelStyle}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {shrineTile(40)}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ ...titleStyle, fontSize: 19, lineHeight: '24px' }}>{t('shrine_battle_squad')}</h2>
              <Mono style={{ display: 'block' }}>Up to {MAX_SHRINE_CREATURES} creatures</Mono>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Mono style={kicker}>Power</Mono>
            <div style={{ fontSize: 22, fontWeight: 600, color: enough ? forest : ink, lineHeight: '24px' }}>
              {selectedPower} <Mono style={{ fontSize: 13 }}>/ {node.difficulty}</Mono>
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
            No creatures available.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            maxHeight: 200, overflowY: 'auto', marginBottom: 14, padding: '2px 3px 4px 2px',
          }}>
            {available.map((c) => {
              const isSel = selected.includes(c.id)
              const atMax = !isSel && selected.length >= MAX_SHRINE_CREATURES
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
          variant={canSend && !enough ? 'paper' : 'ink'}
          onClick={() => canSend && onStart(selected)}
          disabled={!canSend}
          style={{ width: '100%', minHeight: 48, fontSize: 16 }}
        >
          {selected.length === 0
            ? 'Select creatures'
            : selectedPower < node.difficulty
              ? `Send anyway (may lose) - ${formatDuration(SHRINE_DURATION_MS)}`
              : `Challenge! - ${formatDuration(SHRINE_DURATION_MS)}`}
        </InkButton>
      </motion.div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  return (
    <motion.div {...panelMotion(isClosing)} style={panelStyle}>
      {header}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 40 }}>
        {shrineTile(56)}
        <div style={{ minWidth: 0 }}>
          <Mono style={kicker}>{t('shrine_guardian_shrine')}</Mono>
          <h2 style={{ ...titleStyle, margin: '0 0 4px' }}>
            {node.poiName}
          </h2>
          <Mono style={{ ...typed, color: ink }}>
            {difficultyLabel} - {node.difficulty} power
          </Mono>
          <Mono style={typed}>
            Win: coins + egg
          </Mono>
        </div>
      </div>

      <div style={{
        ...paperCardStyle,
        padding: '10px 12px', marginBottom: 14,
        fontSize: 14, color: inkSoft, lineHeight: 1.5,
      }}>
        Send creatures to challenge this shrine. If your squad's power reaches {node.difficulty}, you claim it for 24h and earn coins and a rare egg.
      </div>

      <InkButton
        onClick={() => setSelecting(true)}
        style={{ width: '100%', minHeight: 48, fontSize: 16 }}
      >
        ⚔️ Challenge shrine
      </InkButton>
    </motion.div>
  )
}
