import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { getFoodDef, foodPowerRequirement } from '@/data/foods'
import { creaturePower, foodExpeditionDurationMs, MAX_FOOD_CREATURES } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import { glassPanel, glassChrome } from '@/lib/glass'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { FoodNode, HatchedCreature, PlayerPosition } from '@/types'

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

export function FoodNodePanel({ node, position, onStart, onCollect, onClose, isClosing = false }: Props) {
  const { profile, busyCreatureIds } = useProfile()
  const def = getFoodDef(node.foodId)
  const [now, setNow] = useState(Date.now())
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('power')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
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
      >×</button>
    </>
  )

  // ── Expedition in progress / ready to collect ────────────────────────────────
  if (exp) {
    const members = exp.creatureIds.map((id) => byId.get(id)).filter(Boolean) as HatchedCreature[]
    return (
      <div style={panelStyle(isClosing)}>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{def.emoji}</div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{def.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Near {node.poiName}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {members.map((m) => (
            <div key={m.id} style={{ textAlign: 'center' }}>
              <CreaturePreview emoji={m.emoji} creatureType={m.creatureType} size={48} />
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Lv.{m.level}</div>
            </div>
          ))}
        </div>

        {expReady ? (
          <button
            onClick={onCollect}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(34,197,94,0.4)', WebkitTapHighlightColor: 'transparent',
            }}
          >
            Collect {def.name} 🎁
          </button>
        ) : (
          <div style={{
            padding: '14px 16px', borderRadius: 14, textAlign: 'center',
            background: 'rgba(248,250,252,0.7)',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              Foraging. Back in {formatDuration(new Date(exp.returnsAt).getTime() - now)}
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
            <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{def.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{def.name}</h2>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Select up to {MAX_FOOD_CREATURES} creatures</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Power</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: selectedPower >= requirement ? '#16a34a' : '#f59e0b', lineHeight: 1 }}>
              {selectedPower} <span style={{ fontSize: 13, color: '#cbd5e1' }}>/ {requirement}</span>
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
                background: sortKey === s.key ? '#6366f1' : '#f1f5f9',
                color: sortKey === s.key ? 'white' : '#64748b',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {available.length === 0 ? (
          <p style={{ margin: '20px 0', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            No creatures available. Hatch some eggs first.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            maxHeight: 200, overflowY: 'auto', marginBottom: 14,
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
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '8px 4px', borderRadius: 12, cursor: atMax ? 'default' : 'pointer',
                    border: `2px solid ${isSel ? '#6366f1' : '#f1f5f9'}`,
                    background: isSel ? 'rgba(99,102,241,0.08)' : 'white',
                    opacity: atMax ? 0.4 : 1, WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isSel && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                      background: '#6366f1', color: 'white', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</span>
                  )}
                  <CreaturePreview emoji={c.emoji} creatureType={c.creatureType} size={40} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', lineHeight: 1.1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.species}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#f59e0b' }}>⚡{creaturePower(c)}</span>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => { onStart(selected, durationMs); }}
          disabled={!canSend}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: canSend ? 'linear-gradient(135deg, #f59e0b, #f97316)' : '#e2e8f0',
            color: canSend ? 'white' : '#94a3b8', fontSize: 15, fontWeight: 700,
            cursor: canSend ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent',
            boxShadow: canSend ? '0 2px 10px rgba(245,158,11,0.4)' : 'none',
          }}
        >
          {selected.length === 0
            ? 'Select creatures'
            : selectedPower < requirement
              ? `Need ${requirement - selectedPower} more power`
              : `Send ${selected.length} · ⏱ ${formatDuration(durationMs)}`}
        </button>
      </div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  return (
    <div style={panelStyle(isClosing)}>
      {header}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{def.emoji}</div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{def.name}</h2>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#94a3b8' }}>Near {node.poiName}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309' }}>
              +{def.xp} creature XP
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
              ⚡ {requirement} power
            </span>
            {distM > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
                🧭 {distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setSelecting(true)}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(245,158,11,0.4)', WebkitTapHighlightColor: 'transparent',
        }}
      >
        Start expedition
      </button>
    </div>
  )
}
