import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { creaturePower, creatureName, MAX_SHRINE_CREATURES, SHRINE_DURATION_MS } from '@/lib/profile'
import { glassPanel, glassChrome } from '@/lib/glass'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { HatchedCreature, ShrineNode, PlayerPosition } from '@/types'

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

const panelStyle = (isClosing: boolean) => ({
  position: 'absolute' as const, bottom: 0, left: 0, right: 0,
  ...glassPanel, border: 'none',
  borderRadius: '24px 24px 0 0',
  padding: '20px 20px',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)',
  zIndex: 10,
  animation: isClosing
    ? 'panelSlideDown 0.28s cubic-bezier(0.36,0,0.66,0) forwards'
    : 'panelSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
})

const SHRINE_ACCENT = '#7c3aed'
const SHRINE_BG = 'rgba(124,58,237,0.08)'

export function ShrinePanel({ node, position: _position, onStart, onCollect, onClose, isClosing = false }: Props) {
  const { profile, busyCreatureIds } = useProfile()
  const [now, setNow] = useState(Date.now())
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('power')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
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
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          ...glassChrome, cursor: 'pointer',
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#64748b', WebkitTapHighlightColor: 'transparent',
        }}
      >x</button>
    </>
  )

  // ── Cleared (held) ───────────────────────────────────────────────────────────
  if (isCleared) {
    const clearedMs = new Date(node.clearedUntil!).getTime() - now
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⛩️</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {node.poiName}
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>Guardian Shrine - Held</p>
          <div style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 12,
            background: SHRINE_BG, color: SHRINE_ACCENT, fontSize: 13, fontWeight: 700,
          }}>
            Replenishes in {formatDuration(clearedMs)}
          </div>
        </div>
      </div>
    )
  }

  // ── Expedition in progress / ready ──────────────────────────────────────────
  if (exp) {
    const members = exp.creatureIds.map((id) => byId.get(id)).filter(Boolean) as HatchedCreature[]
    const willWin = exp.power >= node.difficulty
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>⛩️</div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              {node.poiName}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Guardian Shrine</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {members.map((m) => (
            <div key={m.id} style={{ textAlign: 'center' }}>
              <CreaturePreview species={m.species} emoji={m.emoji} creatureType={m.creatureType} isShiny={m.isShiny} size={48} />
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Lv.{m.level}</div>
            </div>
          ))}
        </div>

        {expReady ? (
          <>
            <div style={{
              padding: '10px 14px', borderRadius: 12, textAlign: 'center', marginBottom: 12,
              background: willWin ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: willWin ? '#16a34a' : '#dc2626',
              }}>
                {willWin ? '⚔️ Victory!' : '💀 Defeated - too weak'}
              </span>
            </div>
            <button
              onClick={onCollect}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                background: willWin
                  ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                  : 'linear-gradient(135deg, #64748b, #94a3b8)',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: willWin ? '0 2px 10px rgba(124,58,237,0.4)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {willWin ? 'Claim Shrine 🏆' : 'Return home'}
            </button>
          </>
        ) : (
          <div style={{
            padding: '14px 16px', borderRadius: 14, textAlign: 'center',
            background: 'rgba(248,250,252,0.7)',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              Battle in progress. Back in {formatDuration(new Date(exp.returnsAt).getTime() - now)}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Creature selection ───────────────────────────────────────────────────────
  if (selecting) {
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>⛩️</div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Battle squad</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Up to {MAX_SHRINE_CREATURES} creatures</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Power</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: selectedPower >= node.difficulty ? '#7c3aed' : '#f59e0b', lineHeight: 1 }}>
              {selectedPower} <span style={{ fontSize: 13, color: '#cbd5e1' }}>/ {node.difficulty}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
                border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                background: sortKey === s.key ? SHRINE_ACCENT : '#f1f5f9',
                color: sortKey === s.key ? 'white' : '#64748b',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {available.length === 0 ? (
          <p style={{ margin: '20px 0', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            No creatures available.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            maxHeight: 200, overflowY: 'auto', marginBottom: 14,
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
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '8px 4px', borderRadius: 12, cursor: atMax ? 'default' : 'pointer',
                    border: `2px solid ${isSel ? SHRINE_ACCENT : '#f1f5f9'}`,
                    background: isSel ? SHRINE_BG : 'white',
                    opacity: atMax ? 0.4 : 1, WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isSel && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                      background: SHRINE_ACCENT, color: 'white', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</span>
                  )}
                  <CreaturePreview species={c.species} emoji={c.emoji} creatureType={c.creatureType} isShiny={c.isShiny} size={40} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', lineHeight: 1.1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{creatureName(c)}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#f59e0b' }}>⚡{creaturePower(c)}</span>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => canSend && onStart(selected)}
          disabled={!canSend}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: canSend
              ? selectedPower >= node.difficulty
                ? `linear-gradient(135deg, ${SHRINE_ACCENT}, #a855f7)`
                : 'linear-gradient(135deg, #f59e0b, #f97316)'
              : '#e2e8f0',
            color: canSend ? 'white' : '#94a3b8', fontSize: 15, fontWeight: 700,
            cursor: canSend ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent',
            boxShadow: canSend ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
          }}
        >
          {selected.length === 0
            ? 'Select creatures'
            : selectedPower < node.difficulty
              ? `Send anyway (may lose) - ${formatDuration(SHRINE_DURATION_MS)}`
              : `Challenge! - ${formatDuration(SHRINE_DURATION_MS)}`}
        </button>
      </div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  return (
    <div style={panelStyle(isClosing)}>
      {header}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>⛩️</div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {node.poiName}
          </h2>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>Guardian Shrine</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: SHRINE_BG, color: SHRINE_ACCENT,
            }}>
              {difficultyLabel} - {node.difficulty} power
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309' }}>
              Win: coins + egg
            </span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 12, marginBottom: 14,
        background: 'rgba(248,250,252,0.8)', fontSize: 13, color: '#475569', lineHeight: 1.5,
      }}>
        Send creatures to challenge this shrine. If your squad's power reaches {node.difficulty}, you claim it for 24h and earn coins and a rare egg.
      </div>

      <button
        onClick={() => setSelecting(true)}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
          background: `linear-gradient(135deg, ${SHRINE_ACCENT}, #a855f7)`,
          color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(124,58,237,0.4)', WebkitTapHighlightColor: 'transparent',
        }}
      >
        ⚔️ Challenge shrine
      </button>
    </div>
  )
}
