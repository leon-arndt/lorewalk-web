import { useEffect, useState } from 'react'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
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
import { InkButton, Mono, NoteCard, PageHeader, SectionTitle, Stamp } from '@/components/UI/Journal'
import { categoryCss, forest, ink, inkHint, inkSoft, line, paperCard, stamp, pencil } from '@/lib/theme'
import { MONO, paperCardStyle, paperPage, paperSheet, paperTag, SCRIM } from '@/lib/paper'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

// Where a squad sets out from when sending it on an expedition: the player's live
// position, or Singapore's centre when GPS is unavailable (e.g. offline testing).
const SG_CENTRE = { lat: 1.3521, lon: 103.8198 }

interface LatLon { lat: number; lon: number }


function TypeDot({ category }: { category: string }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: categoryCss(category), border: `1px solid ${ink}`, flexShrink: 0 }} />
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
    if (r.food) items.push({ type: 'food', label: r.food.name, emoji: r.food.emoji, spriteId: `food_${r.food.id}` })
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
    <NoteCard taped={isActive} tilt={isActive ? -0.5 : 0} style={{ padding: '10px 12px 12px', marginBottom: isActive ? 20 : 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim()
            if (trimmed) renameSquad(squad.id, trimmed)
            else setNameDraft(squad.name)
          }}
          style={{
            flex: 1, minWidth: 0, minHeight: 44, fontFamily: 'inherit', fontSize: 19, fontWeight: 500, color: ink,
            border: 'none', borderBottom: `1px solid ${line}`, borderRadius: 0, outline: 'none',
            background: 'transparent', padding: 0,
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = ink)}
        />
        <button
          onClick={() => setActiveSquad(squad.id)}
          disabled={isActive}
          style={{
            flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center',
            padding: 0, border: 'none', background: 'transparent', fontFamily: 'inherit',
            cursor: isActive ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isActive
            ? <Stamp tilt={-4}>{t('squads_active')}</Stamp>
            : <span style={{ ...paperTag, background: paperCard, fontSize: 13, fontWeight: 500, lineHeight: '18px', padding: '5px 10px' }}>{t('squads_set_active')}</span>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        {members.map((c, i) => c
          ? <CreatureTile key={i} creature={c} disabled={away} onTap={() => handleSlotTap(i)} />
          : <EmptyPad key={i} disabled={away} onTap={() => handleSlotTap(i)} />)}
      </div>

      {!away && (() => {
        const hasMembers = members.some(Boolean)
        return (
          <InkButton
            variant={hasMembers ? 'ink' : 'paper'}
            onClick={() => hasMembers && setExpeditionOpen(true)}
            disabled={!hasMembers}
            style={{
              marginTop: 10, width: '100%', fontSize: 14,
              ...(hasMembers ? null : { background: 'transparent', border: `1.5px dashed ${pencil}`, color: inkHint, opacity: 1 }),
            }}
          >
            {hasMembers ? t('squads_send_expedition') : t('squads_add_member_first')}
          </InkButton>
        )
      })()}

      {away && exp && (
        <div style={{ ...paperCardStyle, marginTop: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 13, color: ink, marginBottom: 8 }}>
            {t('squads_exploring', { name: exp.poiName })}
            {isActive && <span style={{ color: inkHint }}>{t('squads_boost_paused')}</span>}
          </div>
          {ready ? (
            <InkButton
              onClick={handleCollect}
              style={{ width: '100%', fontSize: 14, background: stamp, borderColor: stamp }}
            >
              {t('squads_collect_reward')}
            </InkButton>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: ink, fontVariantNumeric: 'tabular-nums' }}>
                {formatCountdown(new Date(exp.returnsAt).getTime() - now)}
              </span>
              <InkButton variant="danger" onClick={() => recallSquad(squad.id)} style={{ fontSize: 13, padding: '0 12px' }}>
                {t('squads_recall')}
              </InkButton>
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
    </NoteCard>
  )
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useLocale()
  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-end', zIndex: 60,
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          ...paperSheet, borderRadius: '10px 10px 0 0', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 8px 4px 16px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>{title}</h3>
          <button
            onClick={onClose}
            data-sfx="close"
            aria-label={t('common_close')}
            style={{
              flexShrink: 0, width: 44, height: 44, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ ...paperTag, background: paperCard, width: 30, height: 30, fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</span>
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 16px calc(24px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>,
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
        <p style={{ margin: '8px 0', fontSize: 13, color: inkSoft }}>
          {t('squads_no_creatures')}
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet title={t('squads_add_creature')} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, paddingBottom: 3 }}>
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
        <p style={{ margin: '8px 0', fontSize: 13, color: inkSoft }}>
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
                  ...paperCardStyle,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  minHeight: 56, textAlign: 'left', fontFamily: 'inherit', fontSize: 14, color: ink,
                  padding: '9px 12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <TypeDot category={v.poiCategory} />
                    <span style={{ fontWeight: 500 }}>{v.poiName}</span>
                  </span>
                  <Mono style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <EmojiSprite id="item_compass" emoji="🧭" size={16} /> {(distM / 1000).toFixed(1)} km · ⏱ {formatCountdown(durationMs)}
                  </Mono>
                </span>
                {bonus > 0
                  ? <Stamp color={forest} tilt={-3} style={{ flexShrink: 0 }}>+{bonus}%</Stamp>
                  : <Mono style={{ flexShrink: 0 }}>{t('squads_no_match')}</Mono>}
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
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <PageHeader title={t('squads_title')} right={<CoinCapsule />} />
      <p style={{ margin: 0, padding: '10px 16px 0', fontSize: 13, lineHeight: '18px', color: inkSoft }}>
        {t('squads_subtitle')}
      </p>

      <div style={{ padding: '22px 16px 0' }}>
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
      <section style={{ padding: '10px 16px 32px' }}>
        <SectionTitle>{t('squads_holdings')}</SectionTitle>
        <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>
          {t('squads_holdings_empty')}
        </p>
      </section>
    )
  }

  function collect(poiId: string) {
    const coins = collectClaim(poiId)
    if (coins > 0) showToast(t('toast_coins_collected', { coins }))
  }

  return (
    <section style={{ padding: '10px 16px 32px' }}>
      <SectionTitle>{t('squads_holdings_title', { n: profile.claims.length })}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {profile.claims.map((claim) => {
          const pending = claimPendingCoins(claim, now)
          return (
            <div key={claim.poiId} style={{
              ...paperCardStyle, padding: '10px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 500, color: ink }}><EmojiSprite id="item_claim" emoji="🚩" size={18} />{claim.poiName}</div>
                <Mono style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, textTransform: 'capitalize' }}>
                  <TypeDot category={claim.poiCategory} />
                  {claim.poiCategory} · ×{claim.affinity.toFixed(2)} rate
                </Mono>
              </div>
              <InkButton
                variant="paper"
                onClick={() => collect(claim.poiId)}
                disabled={pending <= 0}
                style={{ flexShrink: 0, fontSize: 13, padding: '0 12px' }}
              >
                {pending > 0 ? t('squads_collect', { coins: pending }) : t('squads_earning')}
              </InkButton>
            </div>
          )
        })}
      </div>
    </section>
  )
}
