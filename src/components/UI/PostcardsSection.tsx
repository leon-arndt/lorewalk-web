import { useState, useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import type { Postcard } from '@/types'
import { accent } from '@/lib/theme'

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

  return (
    <div
      onClick={delivered && !card.openedAt && onOpen ? onOpen : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: card.openedAt ? '#f8fafc' : 'white',
        borderRadius: 14, padding: '12px 14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: delivered && !card.openedAt && onOpen ? 'pointer' : 'default',
        border: !card.openedAt && delivered && onOpen ? '1.5px solid #f59e0b' : '1.5px solid transparent',
        opacity: card.openedAt ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* POI category icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: delivered ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, position: 'relative',
      }}>
        {CATEGORY_ICONS[card.poiCategory] ?? '📍'}
        <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 16 }}>
          {card.creatureEmoji}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {onOpen ? card.fromName : card.toName}
        </div>
        <div style={{
          fontSize: 12, color: '#64748b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {card.poiName}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {formatDate(card.sentAt)}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {card.openedAt ? (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>opened</span>
        ) : delivered && onOpen ? (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#b45309',
            background: '#fef3c7', padding: '3px 8px', borderRadius: 8,
          }}>
            Open +10 XP
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {formatCountdown(msLeft)}
          </span>
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

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: accent }}>
          Postcards{unread > 0 ? ` · ${unread} new` : ''}
        </h2>
        {import.meta.env.DEV && (
          <button
            onClick={seedMockPostcard}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              background: '#1e1e2e', color: '#a78bfa', border: 'none', cursor: 'pointer',
            }}
          >
            + mock card
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['inbox', 'sent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20,
              border: 'none', cursor: 'pointer',
              background: tab === t ? accent : '#f1f5f9',
              color: tab === t ? 'white' : '#64748b',
            }}
          >
            {t === 'inbox' ? 'Inbox' : 'Sent'}
            {t === 'inbox' && unread > 0 && (
              <span style={{
                marginLeft: 6, background: '#f59e0b', color: 'white',
                borderRadius: '50%', fontSize: 10, padding: '1px 5px', fontWeight: 800,
              }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'inbox' ? (
        inbox.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
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
          <div style={{
            background: 'white', borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📮</div>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
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
