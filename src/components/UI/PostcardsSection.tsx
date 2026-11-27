import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import type { Postcard } from '@/types'
import { InkButton, Mono, SectionTitle, Stamp } from '@/components/UI/Journal'
import { paperCardStyle } from '@/lib/paper'
import { categoryCss, ink, inkSoft, line, paperLight, stamp } from '@/lib/theme'

const CATEGORY_ICONS: Record<string, string> = {
  heritage: '🏛', nature: '🌿', religious: '🕌',
  museum: '🎨', landmark: '📍', arts: '🎭',
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'arriving…'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

function CardPill({ card, now, onOpen }: { card: Postcard; now: number; onOpen?: () => void }) {
  const delivered = now >= new Date(card.deliverAt).getTime()
  const msLeft = new Date(card.deliverAt).getTime() - now

  const canOpen = delivered && !card.openedAt && !!onOpen

  return (
    <div
      onClick={canOpen ? onOpen : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
        borderRadius: 6, padding: '10px 12px',
        cursor: canOpen ? 'pointer' : 'default',
        ...(card.openedAt
          ? { border: `1px dashed ${line}` }
          : { ...paperCardStyle, border: canOpen ? `1.5px solid ${ink}` : paperCardStyle.border }),
      }}
    >
      {/* POI category icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 6, flexShrink: 0,
        background: `${categoryCss(card.poiCategory)}${delivered ? '40' : '1f'}`, border: `1px solid ${line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, position: 'relative',
      }}>
        {CATEGORY_ICONS[card.poiCategory] ?? '📍'}
        <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 15 }}>
          {card.creatureEmoji}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink }}>
          {onOpen ? card.fromName : card.toName}
        </div>
        <div style={{
          fontSize: 13, color: inkSoft,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {card.poiName}
        </div>
        <Mono style={{ display: 'block', marginTop: 1 }}>
          {formatDate(card.sentAt)}
        </Mono>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {card.openedAt ? (
          <Mono>opened</Mono>
        ) : canOpen ? (
          <Stamp tilt={-3}>
            Open +10 XP
          </Stamp>
        ) : (
          <Mono>
            {formatCountdown(msLeft)}
          </Mono>
        )}
      </div>
    </div>
  )
}

export function PostcardsSection() {
  const { profile, openPostcard, seedMockPostcard } = useProfile()
  const now = useNow()
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')

  const inbox = [...profile.postcards].sort(
    (a, b) => new Date(b.deliverAt).getTime() - new Date(a.deliverAt).getTime(),
  )
  const sent = [...profile.outbox].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )

  const unread = inbox.filter((c) => !c.openedAt && now >= new Date(c.deliverAt).getTime()).length

  const empty = {
    border: '1.5px dashed #8C7A5C', borderRadius: 6, padding: '20px 20px', textAlign: 'center',
  } as const

  return (
    <section>
      <SectionTitle
        note={import.meta.env.DEV ? (
          <button
            onClick={seedMockPostcard}
            style={{
              font: 'inherit', color: 'inherit', padding: '4px 8px', borderRadius: 10,
              background: 'none', border: `1px dashed ${line}`, cursor: 'pointer',
            }}
          >
            + mock card
          </button>
        ) : undefined}
      >
        Postcards{unread > 0 ? ` · ${unread} new` : ''}
      </SectionTitle>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['inbox', 'sent'] as const).map((t) => (
          <InkButton
            key={t}
            variant={tab === t ? 'ink' : 'paper'}
            onClick={() => setTab(t)}
            style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13 }}
          >
            {t === 'inbox' ? 'Inbox' : 'Sent'}
            {t === 'inbox' && unread > 0 && (
              <span style={{
                marginLeft: 8, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: stamp, color: paperLight, border: `1px solid ${tab === t ? paperLight : stamp}`,
                borderRadius: 10, fontSize: 11, fontWeight: 600, lineHeight: 1,
              }}>
                {unread}
              </span>
            )}
          </InkButton>
        ))}
      </div>

      {tab === 'inbox' ? (
        inbox.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📬</div>
            <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>
              No postcards yet. Friends can send them after you check in at landmarks.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inbox.map((card) => (
              <CardPill
                key={card.id}
                card={card}
                now={now}
                onOpen={() => openPostcard(card.id)}
              />
            ))}
          </div>
        )
      ) : (
        sent.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📮</div>
            <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>
              No sent postcards. Check in at a landmark and send one to a friend.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sent.map((card) => (
              <CardPill key={card.id} card={card} now={now} />
            ))}
          </div>
        )
      )}
    </section>
  )
}
