import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { hasReturned, expeditionDurationMs, claimPendingCoins } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import type { ExpeditionTarget, HatchedCreature, Squad } from '@/types'

// Where a squad sets out from when sending it on an expedition: the player's live
// position, or Singapore's centre when GPS is unavailable (e.g. offline testing).
const SG_CENTRE = { lat: 1.3521, lon: 103.8198 }

interface LatLon { lat: number; lon: number }

const RARE_CATEGORIES = new Set(['religious', 'museum', 'nature'])

function typeColors(category: string) {
  return RARE_CATEGORIES.has(category)
    ? { bg: '#fef3c7', fg: '#b45309', ring: '#fbbf24' }
    : { bg: '#ede9fe', fg: '#7c3aed', ring: '#c4b5fd' }
}

function matchCount(squad: Squad, category: string, byId: Map<string, HatchedCreature>) {
  return squad.slots.filter((id) => (id ? byId.get(id)?.poiCategory === category : false)).length
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface SlotProps {
  creature: HatchedCreature | null
  disabled: boolean
  onTap: () => void
}

function Slot({ creature, disabled, onTap }: SlotProps) {
  if (!creature) {
    return (
      <button onClick={onTap} disabled={disabled} style={{
        aspectRatio: '1', border: '2px dashed #e2e8f0', borderRadius: 14,
        background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: '#cbd5e1', opacity: disabled ? 0.5 : 1,
      }}>
        +
      </button>
    )
  }

  const c = typeColors(creature.poiCategory)
  return (
    <button onClick={onTap} disabled={disabled} style={{
      aspectRatio: '1', borderRadius: 14, cursor: disabled ? 'default' : 'pointer',
      background: c.bg, border: `2px solid ${c.ring}`, opacity: disabled ? 0.6 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 2, padding: 4,
    }}>
      <span style={{ fontSize: 24, lineHeight: 1 }}>{creature.emoji}</span>
      <span style={{ fontSize: 8, fontWeight: 700, color: c.fg, textTransform: 'capitalize' }}>
        {creature.poiCategory}
      </span>
    </button>
  )
}

function SquadCard({ squad, now, from }: { squad: Squad; now: number; from: LatLon }) {
  const { profile, setActiveSquad, renameSquad, clearSlot, collectExpedition, recallSquad } = useProfile()
  const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
  const isActive = profile.activeSquadId === squad.id
  const members = squad.slots.map((id) => (id ? byId.get(id) ?? null : null))
  const exp = squad.expedition
  const away = exp !== null
  const ready = exp !== null && hasReturned(exp, now)

  const [picker, setPicker] = useState<number | null>(null)
  const [expeditionOpen, setExpeditionOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState(squad.name)
  // Mirror external renames/resets into the controlled input.
  useEffect(() => { setNameDraft(squad.name) }, [squad.name])

  function handleSlotTap(i: number) {
    if (away) return
    if (members[i]) clearSlot(squad.id, i)
    else setPicker(i)
  }

  function handleCollect() {
    const r = collectExpedition(squad.id)
    if (r) {
      const parts = [`+${r.xp} XP`, `+${r.coins} 🪙`]
      if (r.egg) parts.push('🥚 egg!')
      setFlash(parts.join('  '))
      setTimeout(() => setFlash(null), 2800)
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: 18, padding: 16, marginBottom: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: `2px solid ${isActive ? '#a5b4fc' : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim()
            if (trimmed) renameSquad(squad.id, trimmed)
            else setNameDraft(squad.name)
          }}
          style={{
            flex: 1, fontSize: 16, fontWeight: 700, color: '#1e293b',
            border: 'none', borderBottom: '1px solid transparent', outline: 'none',
            background: 'transparent', padding: '2px 0',
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = '#c7d2fe')}
        />
        <button
          onClick={() => setActiveSquad(squad.id)}
          disabled={isActive}
          style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            border: 'none', cursor: isActive ? 'default' : 'pointer',
            background: isActive ? '#6366f1' : '#eef2ff',
            color: isActive ? 'white' : '#6366f1',
          }}
        >
          {isActive ? '★ Active' : 'Set active'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {members.map((c, i) => (
          <Slot key={i} creature={c} disabled={away} onTap={() => handleSlotTap(i)} />
        ))}
      </div>

      {!away && (
        <button
          onClick={() => setExpeditionOpen(true)}
          style={{
            marginTop: 12, width: '100%', textAlign: 'center',
            fontSize: 13, fontWeight: 600, color: '#6366f1',
            background: '#eef2ff', border: 'none', borderRadius: 10,
            padding: '10px 12px', cursor: 'pointer',
          }}
        >
          🧭 Send on expedition…
        </button>
      )}

      {away && exp && (
        <div style={{
          marginTop: 12, background: '#f8fafc', border: '1px solid #f1f5f9',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
            🧭 Exploring <strong>{exp.poiName}</strong>
            {isActive && <span style={{ color: '#94a3b8' }}> · live boost paused</span>}
          </div>
          {ready ? (
            <button
              onClick={handleCollect}
              style={{
                width: '100%', fontSize: 13, fontWeight: 700, color: 'white',
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer',
              }}
            >
              {flash ?? '🎁 Collect reward'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
                {formatCountdown(new Date(exp.returnsAt).getTime() - now)}
              </span>
              <button
                onClick={() => recallSquad(squad.id)}
                style={{
                  fontSize: 11, fontWeight: 600, color: '#e11d48',
                  background: '#fff1f2', border: 'none', borderRadius: 20,
                  padding: '5px 12px', cursor: 'pointer',
                }}
              >
                Recall (no reward)
              </button>
            </div>
          )}
        </div>
      )}

      {picker !== null && (
        <CreaturePicker squad={squad} slotIndex={picker} onClose={() => setPicker(null)} />
      )}
      {expeditionOpen && (
        <ExpeditionPicker
          squad={squad}
          byId={byId}
          from={from}
          onClose={() => setExpeditionOpen(false)}
        />
      )}
    </div>
  )
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)',
        display: 'flex', alignItems: 'flex-end', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '70vh', overflowY: 'auto',
          background: 'white', borderRadius: '20px 20px 0 0', padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreaturePicker({ squad, slotIndex, onClose }: { squad: Squad; slotIndex: number; onClose: () => void }) {
  const { profile, assignToSlot } = useProfile()

  const assignedIn = new Map<string, string>()
  for (const sq of profile.squads) {
    for (const id of sq.slots) if (id) assignedIn.set(id, sq.name)
  }

  if (profile.hatchedCreatures.length === 0) {
    return (
      <Sheet title="Add a creature" onClose={onClose}>
        <p style={{ margin: '8px 0', fontSize: 13, color: '#94a3b8' }}>
          You have no creatures yet — hatch one from the Creatures tab first.
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet title="Add a creature" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {profile.hatchedCreatures.map((c) => {
          const col = typeColors(c.poiCategory)
          const where = assignedIn.get(c.id)
          return (
            <button
              key={c.id}
              onClick={() => { assignToSlot(squad.id, slotIndex, c.id); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                background: 'white', border: `2px solid ${col.ring}`, borderRadius: 14,
                padding: 10, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 26 }}>{c.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{c.species}</div>
                <div style={{ fontSize: 10, color: col.fg, textTransform: 'capitalize', fontWeight: 600 }}>
                  {c.poiCategory}
                </div>
                {where && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>in {where}</div>}
              </div>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

function ExpeditionPicker({ squad, byId, from, onClose }: {
  squad: Squad
  byId: Map<string, HatchedCreature>
  from: LatLon
  onClose: () => void
}) {
  const { profile, startExpedition } = useProfile()
  const visited = profile.visitHistory.filter((v) => v.lat != null && v.lon != null)

  function send(target: ExpeditionTarget, durationMs: number) {
    startExpedition(squad.id, target, durationMs)
    onClose()
  }

  return (
    <Sheet title="Send on expedition" onClose={onClose}>
      {visited.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: 13, color: '#94a3b8' }}>
          Check in at a landmark first — squads can only be sent to places you've visited.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visited.map((v) => {
            const matches = matchCount(squad, v.poiCategory, byId)
            const bonus = matches * 25
            const col = typeColors(v.poiCategory)
            const distM = haversineDistance(from.lat, from.lon, v.lat!, v.lon!)
            const durationMs = expeditionDurationMs(distM)
            return (
              <button
                key={v.poiId}
                onClick={() => send({ poiId: v.poiId, poiName: v.poiName, poiCategory: v.poiCategory, lat: v.lat!, lon: v.lon! }, durationMs)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  textAlign: 'left', fontSize: 13, color: '#1e293b',
                  background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10,
                  padding: '10px 12px', cursor: 'pointer',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{v.poiName}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}> · {v.poiCategory}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>
                    🧭 {(distM / 1000).toFixed(1)} km · ⏱ {formatCountdown(durationMs)}
                  </span>
                </span>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: bonus > 0 ? col.bg : '#f1f5f9',
                  color: bonus > 0 ? col.fg : '#94a3b8',
                }}>
                  {bonus > 0 ? `+${bonus}%` : 'no match'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

export function SquadsPage() {
  const { profile } = useProfile()
  const { position } = useGeolocation()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second so countdowns and the "ready" state stay live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const from: LatLon = position
    ? { lat: position.latitude, lon: position.longitude }
    : SG_CENTRE

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', paddingBottom: 60 }}>
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Squads</h1>
          <button
            onClick={() => navigate('/shop#coins')}
            title="Get more coins"
            style={{
              flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#b45309', cursor: 'pointer',
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20,
              padding: '4px 12px',
            }}>
            🪙 {profile.coins}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          Build teams from your creatures. Keep the active squad home to boost your check-ins by 25% per matching member, or send a squad on an expedition for an away reward (further trips take longer).
        </p>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {profile.squads.map((squad) => (
          <SquadCard key={squad.id} squad={squad} now={now} from={from} />
        ))}
      </div>

      <Holdings now={now} />
    </div>
  )
}

function Holdings({ now }: { now: number }) {
  const { profile, collectClaim } = useProfile()
  const [flash, setFlash] = useState<string | null>(null)

  if (profile.claims.length === 0) {
    return (
      <div style={{ padding: '8px 16px 32px' }}>
        <h2 style={{ margin: '4px 0 8px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Holdings</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
          Finish an expedition to claim that landmark. Held landmarks earn coins over time.
        </p>
      </div>
    )
  }

  function collect(poiId: string) {
    const coins = collectClaim(poiId)
    if (coins > 0) {
      setFlash(`+${coins} 🪙`)
      setTimeout(() => setFlash(null), 2200)
    }
  }

  return (
    <div style={{ padding: '8px 16px 32px' }}>
      <h2 style={{ margin: '4px 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
        Holdings · {profile.claims.length}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profile.claims.map((claim) => {
          const pending = claimPendingCoins(claim, now)
          const col = typeColors(claim.poiCategory)
          return (
            <div key={claim.poiId} style={{
              background: 'white', borderRadius: 14, padding: '12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>🚩 {claim.poiName}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: col.fg, textTransform: 'capitalize' }}>
                  {claim.poiCategory} · ×{claim.affinity.toFixed(2)} rate
                </div>
              </div>
              <button
                onClick={() => collect(claim.poiId)}
                disabled={pending <= 0}
                style={{
                  flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 20,
                  border: 'none', cursor: pending > 0 ? 'pointer' : 'default',
                  background: pending > 0 ? '#fffbeb' : '#f1f5f9',
                  color: pending > 0 ? '#b45309' : '#cbd5e1',
                }}
              >
                {pending > 0 ? `Collect ${pending} 🪙` : 'Earning…'}
              </button>
            </div>
          )
        })}
      </div>
      {flash && (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#b45309', textAlign: 'center' }}>{flash}</div>
      )}
    </div>
  )
}
