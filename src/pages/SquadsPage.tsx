import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { hasReturned, expeditionDurationMs, claimPendingCoins } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
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
      justifyContent: 'center', gap: 2, padding: 4, position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 4, right: 4, fontSize: 8, fontWeight: 700,
        color: 'white', background: '#6366f1', borderRadius: 6,
        padding: '1px 4px', lineHeight: 1.4,
      }}>
        Lv.{creature.level}
      </span>
      <CreaturePreview emoji={creature.emoji} size={40} />
      <span style={{ fontSize: 8, fontWeight: 700, color: c.fg, textTransform: 'capitalize' }}>
        {creature.poiCategory}
      </span>
    </button>
  )
}

function SquadCard({ squad, now, from }: { squad: Squad; now: number; from: LatLon }) {
  const { profile, setActiveSquad, renameSquad, clearSlot, collectExpedition, recallSquad } = useProfile()
  const { t } = useLocale()
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
      if (r.food) parts.push(`${r.food.emoji} ${r.food.name}!`)
      if (r.egg) parts.push('🥚 egg!')
      r.levelUps.forEach(({ species, newLevel }) => parts.push(`⬆️ ${species} Lv.${newLevel}!`))
      setFlash(parts.join('  '))
      setTimeout(() => setFlash(null), 3200)
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
          {isActive ? t('squads_active') : t('squads_set_active')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {members.map((c, i) => (
          <Slot key={i} creature={c} disabled={away} onTap={() => handleSlotTap(i)} />
        ))}
      </div>

      {!away && (() => {
        const hasMembers = members.some(Boolean)
        return (
          <button
            onClick={() => hasMembers && setExpeditionOpen(true)}
            disabled={!hasMembers}
            style={{
              marginTop: 12, width: '100%', textAlign: 'center',
              fontSize: 13, fontWeight: 600,
              color: hasMembers ? '#6366f1' : '#94a3b8',
              background: hasMembers ? '#eef2ff' : '#f1f5f9',
              border: 'none', borderRadius: 10,
              padding: '10px 12px',
              cursor: hasMembers ? 'pointer' : 'not-allowed',
              opacity: hasMembers ? 1 : 0.7,
            }}
          >
            {hasMembers ? t('squads_send_expedition') : t('squads_add_member_first')}
          </button>
        )
      })()}

      {away && exp && (
        <div style={{
          marginTop: 12, background: '#f8fafc', border: '1px solid #f1f5f9',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
            {t('squads_exploring', { name: exp.poiName })}
            {isActive && <span style={{ color: '#94a3b8' }}>{t('squads_boost_paused')}</span>}
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
              {flash ?? t('squads_collect_reward')}
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
                {t('squads_recall')}
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
  const { t } = useLocale()

  const assignedIn = new Map<string, string>()
  for (const sq of profile.squads) {
    for (const id of sq.slots) if (id) assignedIn.set(id, sq.name)
  }

  if (profile.hatchedCreatures.length === 0) {
    return (
      <Sheet title={t('squads_add_creature')} onClose={onClose}>
        <p style={{ margin: '8px 0', fontSize: 13, color: '#94a3b8' }}>
          {t('squads_no_creatures')}
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet title={t('squads_add_creature')} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {profile.hatchedCreatures.map((c) => {
          const col = typeColors(c.poiCategory)
          const where = assignedIn.get(c.id)
          const used = !!where
          return (
            <button
              key={c.id}
              disabled={used}
              onClick={() => { if (!used) { assignToSlot(squad.id, slotIndex, c.id); onClose() } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                background: used ? '#f8fafc' : 'white',
                border: `2px solid ${used ? '#e2e8f0' : col.ring}`, borderRadius: 14,
                padding: 10, cursor: used ? 'default' : 'pointer',
                opacity: used ? 0.55 : 1,
              }}
            >
              <CreaturePreview emoji={c.emoji} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: used ? '#94a3b8' : '#1e293b' }}>{c.species}</div>
                <div style={{ fontSize: 10, color: used ? '#94a3b8' : col.fg, textTransform: 'capitalize', fontWeight: 600 }}>
                  {c.poiCategory} · Lv.{c.level}
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
  const { t } = useLocale()
  const visited = profile.visitHistory.filter((v) => v.lat != null && v.lon != null)

  function send(target: ExpeditionTarget, durationMs: number) {
    startExpedition(squad.id, target, durationMs)
    onClose()
  }

  return (
    <Sheet title={t('squads_send_title')} onClose={onClose}>
      {visited.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: 13, color: '#94a3b8' }}>
          {t('squads_no_visited')}
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
                  {bonus > 0 ? `+${bonus}%` : t('squads_no_match')}
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
  const { t } = useLocale()
  const { position } = useGeolocation()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second so countdowns and the "ready" state stay live.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const from: LatLon = position
    ? { lat: position.latitude, lon: position.longitude }
    : SG_CENTRE

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'linear-gradient(160deg, #f8faff 0%, #f2efff 55%, #fdf6ff 100%)', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{t('squads_title')}</h1>
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
          {t('squads_subtitle')}
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
  const { t } = useLocale()
  const [flash, setFlash] = useState<string | null>(null)

  if (profile.claims.length === 0) {
    return (
      <div style={{ padding: '8px 16px 32px' }}>
        <h2 style={{ margin: '4px 0 8px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('squads_holdings')}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
          {t('squads_holdings_empty')}
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
        {t('squads_holdings_title', { n: profile.claims.length })}
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
                {pending > 0 ? t('squads_collect', { coins: pending }) : t('squads_earning')}
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
