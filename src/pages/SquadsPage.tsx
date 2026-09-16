import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import { usePlayerLocation } from '@/contexts/PlayerLocationContext'
import { hasReturned, expeditionDurationMs, claimPendingCoins } from '@/lib/profile'
import { haversineDistance } from '@/lib/mapUtils'
import { CreatureTile, EmptyPad } from '@/components/UI/CreatureTile'
import { CoinCapsule } from '@/components/UI/CoinCapsule'
import type { ExpeditionTarget, HatchedCreature, RewardItem, Squad } from '@/types'
import { accent, accentAlpha, accentSoft, categoryCss, rewardGradient } from '@/lib/theme'
import { glassPage, glassSheet } from '@/lib/glass'

// Where a squad sets out from when sending it on an expedition: the player's live
// position, or Singapore's centre when GPS is unavailable (e.g. offline testing).
const SG_CENTRE = { lat: 1.3521, lon: 103.8198 }

interface LatLon { lat: number; lon: number }

// Frosted card on the page glass, same material as the egg and pantry cards.
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.58)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(15,23,42,0.04)',
}

function TypeDot({ category }: { category: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: categoryCss(category), flexShrink: 0 }} />
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

function SquadCard({ squad, now, from }: { squad: Squad; now: number; from: LatLon }) {
  const { profile, setActiveSquad, renameSquad, clearSlot, collectExpedition, recallSquad } = useProfile()
  const { showReward } = useReward()
  const { t } = useLocale()
  const byId = new Map(profile.hatchedCreatures.map((c) => [c.id, c]))
  const isActive = profile.activeSquadId === squad.id
  const members = squad.slots.map((id) => (id ? byId.get(id) ?? null : null))
  const exp = squad.expedition
  const away = exp !== null
  const ready = exp !== null && hasReturned(exp, now)

  const [picker, setPicker] = useState<number | null>(null)
  const [expeditionOpen, setExpeditionOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(squad.name)
  // Mirror external renames/resets into the controlled input.
  useEffect(() => { setNameDraft(squad.name) }, [squad.name])

  function handleSlotTap(i: number) {
    if (away) return
    if (members[i]) clearSlot(squad.id, i)
    else setPicker(i)
  }

  function handleCollect() {
    if (!exp) return
    const r = collectExpedition(squad.id)
    if (!r) return
    const items: RewardItem[] = [
      { type: 'xp', amount: r.xp },
      { type: 'coins', amount: r.coins },
    ]
    if (r.food) items.push({ type: 'food', label: r.food.name, emoji: r.food.emoji })
    if (r.egg) items.push({ type: 'egg' })
    r.levelUps.forEach(({ species, newLevel }) => items.push({ type: 'level_up', amount: newLevel, label: species }))
    showReward({
      emoji: '🧭',
      title: t('squads_expedition_reward_title'),
      subtitle: t('squads_expedition_reward_subtitle', { name: exp.poiName }),
      items,
    })
  }

  return (
    <div style={{
      ...card, borderRadius: 20, padding: '14px 12px 12px', marginBottom: 14,
      border: `2px solid ${isActive ? accentAlpha(0.45) : 'transparent'}`,
      transition: 'border-color 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 4px' }}>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim()
            if (trimmed) renameSquad(squad.id, trimmed)
            else setNameDraft(squad.name)
          }}
          style={{
            flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: '#1e293b',
            border: 'none', borderBottom: '1px solid transparent', outline: 'none',
            background: 'transparent', padding: '2px 0',
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = accentAlpha(0.35))}
        />
        <button
          onClick={() => setActiveSquad(squad.id)}
          disabled={isActive}
          style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            border: 'none', cursor: isActive ? 'default' : 'pointer',
            background: isActive ? accent : 'rgba(255,255,255,0.75)',
            color: isActive ? 'white' : accent,
            boxShadow: isActive ? 'none' : `inset 0 0 0 1px ${accentAlpha(0.18)}`,
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
        >
          {isActive ? t('squads_active') : t('squads_set_active')}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {members.map((c, i) => c
          ? <CreatureTile key={i} creature={c} disabled={away} onTap={() => handleSlotTap(i)} />
          : <EmptyPad key={i} disabled={away} onTap={() => handleSlotTap(i)} />)}
      </div>

      {!away && (() => {
        const hasMembers = members.some(Boolean)
        return (
          <button
            onClick={() => hasMembers && setExpeditionOpen(true)}
            disabled={!hasMembers}
            style={{
              marginTop: 6, width: '100%', textAlign: 'center',
              fontSize: 13, fontWeight: 700,
              color: hasMembers ? 'white' : '#94a3b8',
              background: hasMembers ? accent : 'rgba(241,245,249,0.7)',
              boxShadow: hasMembers ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px ${accentAlpha(0.22)}` : 'none',
              border: 'none', borderRadius: 14,
              padding: '11px 12px',
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
          marginTop: 6, background: 'rgba(255,255,255,0.55)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
          borderRadius: 14, padding: '12px 14px',
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
                background: rewardGradient,
                border: 'none', borderRadius: 14, padding: '11px', cursor: 'pointer',
              }}
            >
              {t('squads_collect_reward')}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
                {formatCountdown(new Date(exp.returnsAt).getTime() - now)}
              </span>
              <button
                onClick={() => recallSquad(squad.id)}
                style={{
                  fontSize: 11, fontWeight: 600, color: '#e11d48',
                  background: 'rgba(255,241,242,0.8)', border: 'none', borderRadius: 20,
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
  const { t } = useLocale()
  return createPortal(
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end', zIndex: 60,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          ...glassSheet, borderRadius: '24px 24px 0 0', overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 8px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{title}</h3>
          <button
            onClick={onClose}
            data-sfx="close"
            aria-label={t('common_close')}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(100,116,139,0.12)', color: '#64748b', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
      <div className="grid grid-cols-4 gap-1">
        {[...profile.hatchedCreatures].reverse().sort((a, b) => Number(assignedIn.has(a.id)) - Number(assignedIn.has(b.id))).map((c) => {
          const where = assignedIn.get(c.id)
          return (
            <CreatureTile
              key={c.id}
              creature={c}
              disabled={!!where}
              note={where && t('squads_in_squad', { name: where })}
              onTap={() => { assignToSlot(squad.id, slotIndex, c.id); onClose() }}
            />
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
            const distM = haversineDistance(from.lat, from.lon, v.lat!, v.lon!)
            const durationMs = expeditionDurationMs(distM)
            return (
              <button
                key={v.poiId}
                onClick={() => send({ poiId: v.poiId, poiName: v.poiName, poiCategory: v.poiCategory, lat: v.lat!, lon: v.lon! }, durationMs)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  textAlign: 'left', fontSize: 13, color: '#1e293b',
                  ...card, border: 'none', borderRadius: 14,
                  padding: '11px 14px', cursor: 'pointer',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TypeDot category={v.poiCategory} />
                    <span style={{ fontWeight: 600 }}>{v.poiName}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>
                    🧭 {(distM / 1000).toFixed(1)} km · ⏱ {formatCountdown(durationMs)}
                  </span>
                </span>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: bonus > 0 ? accentSoft : 'rgba(241,245,249,0.8)',
                  color: bonus > 0 ? accent : '#94a3b8',
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
  const { position } = usePlayerLocation()
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
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', ...glassPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: accent }}>{t('squads_title')}</h1>
          <CoinCapsule />
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
  const { showToast } = useReward()
  const { t } = useLocale()

  if (profile.claims.length === 0) {
    return (
      <div style={{ padding: '8px 16px 32px' }}>
        <h2 style={{ margin: '4px 0 8px', fontSize: 15, fontWeight: 700, color: accent }}>{t('squads_holdings')}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
          {t('squads_holdings_empty')}
        </p>
      </div>
    )
  }

  function collect(poiId: string) {
    const coins = collectClaim(poiId)
    if (coins > 0) showToast(t('toast_coins_collected', { coins }))
  }

  return (
    <div style={{ padding: '8px 16px 32px' }}>
      <h2 style={{ margin: '4px 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
        {t('squads_holdings_title', { n: profile.claims.length })}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profile.claims.map((claim) => {
          const pending = claimPendingCoins(claim, now)
          return (
            <div key={claim.poiId} style={{
              ...card, borderRadius: 16, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>🚩 {claim.poiName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>
                  <TypeDot category={claim.poiCategory} />
                  {claim.poiCategory} · ×{claim.affinity.toFixed(2)} rate
                </div>
              </div>
              <button
                onClick={() => collect(claim.poiId)}
                disabled={pending <= 0}
                style={{
                  flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 20,
                  border: 'none', cursor: pending > 0 ? 'pointer' : 'default',
                  background: pending > 0 ? '#fef3c7' : 'rgba(241,245,249,0.8)',
                  color: pending > 0 ? '#b45309' : '#cbd5e1',
                }}
              >
                {pending > 0 ? t('squads_collect', { coins: pending }) : t('squads_earning')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
