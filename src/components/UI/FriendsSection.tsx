import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useFriends, type Friend } from '@/hooks/useFriends'
import { totalSteps as sumTotalSteps } from '@/lib/profile'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { deterministicAppearance } from '@/data/cosmetics'
import { FriendProfileScreen } from '@/components/UI/FriendProfileScreen'
import { InkButton, Mono, SectionTitle } from '@/components/UI/Journal'
import { MONO, paperCardStyle } from '@/lib/paper'
import { forest, ink, inkHint, inkSoft, line, paperCard, paperLight, paperShade, stamp, edge } from '@/lib/theme'

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

export function FriendsSection() {
  const { profile } = useProfile()
  const { t } = useLocale()
  const { showToast } = useReward()
  const { friendCode, friends, loading, addFriend, regenerate, codeStatus } = useFriends(
    profile.id,
    profile.displayName,
    profile.level,
    sumTotalSteps(profile.dailySteps),
    profile.achievements.filter((a) => a.unlockedAt).map((a) => a.id),
  )

  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, setTick] = useState(0)
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)

  // The "Refreshes in Xh" label is computed at render; tick once a minute so it
  // counts down on its own instead of freezing until the next unrelated re-render.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!friendCode) { setQrUrl(null); return }
    QRCode.toDataURL(friendCode.code, {
      width: 200, margin: 2,
      color: { dark: ink, light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch(() => {})
  }, [friendCode?.code])

  async function handleAdd() {
    if (!input.trim() || adding) return
    setAdding(true)
    const r = await addFriend(input)
    setResult({ ok: r.ok, text: t(r.key, r.vars) })
    if (r.ok) setInput('')
    setAdding(false)
    setTimeout(() => setResult(null), 3000)
  }

  function handleInput(raw: string) {
    let val = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4, 8)
    setInput(val)
  }

  function copyCode() {
    if (!friendCode) return
    navigator.clipboard.writeText(friendCode.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [regenerating, setRegenerating] = useState(false)

  async function handleRegenerate() {
    if (regenerating) return
    setRegenerating(true)
    if (!(await regenerate())) showToast(t('friends_code_failed'))
    setRegenerating(false)
  }

  function hoursLeft(iso: string): string {
    const h = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 3_600_000))
    return h === 0 ? t('friends_refreshing_soon') : t('friends_refreshes_in', { h })
  }

  return (
    <section>
      <SectionTitle>
        {loading ? '…' : t('friends_title', { n: friends.length })}
      </SectionTitle>

      {/* My code card */}
      <div style={{ ...paperCardStyle, padding: 14, marginBottom: 10 }}>
        <Mono style={{ display: 'block', marginBottom: 10 }}>
          {t('friends_your_code')}
        </Mono>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 6, flexShrink: 0,
            background: '#ffffff', border: `1px solid ${line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {qrUrl
              ? <img src={qrUrl} alt={t('friends_qr_alt')} width={92} height={92} />
              : <Mono>…</Mono>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              onClick={copyCode}
              title={t('friends_tap_to_copy')}
              style={{
                display: 'block', width: '100%', minHeight: 44, textAlign: 'center',
                fontSize: 20, fontWeight: 500, letterSpacing: 3, color: ink,
                fontFamily: MONO,
                background: paperLight, border: '1.5px dashed #8C7A5C',
                borderRadius: 10, padding: '6px 8px', cursor: 'pointer',
              }}
            >
              {friendCode?.code ?? '-'}
            </button>
            <Mono style={{ display: 'block', textAlign: 'center', marginTop: 5, minHeight: 14 }}>
              {copied ? t('friends_copied')
                : friendCode ? hoursLeft(friendCode.expiresAt)
                : codeStatus === 'waiting' ? t('friends_code_waiting')
                : codeStatus === 'failed' ? t('friends_code_failed')
                : ''}
            </Mono>
            <InkButton
              variant="paper"
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
              style={{ marginTop: 6, width: '100%', fontSize: 14 }}
            >
              {t('friends_regenerate')}
            </InkButton>
          </div>
        </div>
      </div>

      {/* Add a friend */}
      <div style={{ ...paperCardStyle, padding: 14, marginBottom: 10 }}>
        <Mono style={{ display: 'block', marginBottom: 8 }}>
          {t('friends_add_friend')}
        </Mono>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('friends_placeholder')}
            maxLength={9}
            style={{
              flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', fontSize: 16, fontWeight: 500, letterSpacing: 2,
              fontFamily: MONO, padding: '0 12px',
              border: `1px solid ${edge}`, borderRadius: 10,
              outline: 'none', color: ink, background: paperCard,
            }}
          />
          <InkButton
            onClick={handleAdd}
            disabled={adding || !input.trim()}
          >
            {t('friends_add_btn')}
          </InkButton>
        </div>
        {result && (
          <div style={{
            marginTop: 8, fontSize: 13, fontWeight: 500,
            color: result.ok ? forest : stamp,
          }}>
            {result.text}
          </div>
        )}
      </div>

      {/* Friends list */}
      {!loading && friends.length === 0 ? (
        <div style={{ border: '1.5px dashed #8C7A5C', borderRadius: 6, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>👥</div>
          <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>
            {t('friends_empty_text')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {friends.map((f) => (
            <button
              key={f.playerId}
              onClick={() => setSelectedFriend(f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                ...paperCardStyle, padding: '10px 12px',
              }}
            >
              <div style={{
                position: 'relative', width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: paperShade, border: `1px solid ${edge}`, boxSizing: 'border-box', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PlayerFaceIcon appearance={deterministicAppearance(f.playerId)} size={30} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 500, color: ink,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {f.displayName}
                  </span>
                  <Mono style={{ flexShrink: 0, fontWeight: 500, color: ink }}>
                    {t('level_badge', { level: f.level })}
                  </Mono>
                </div>
                <Mono style={{
                  display: 'block', marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.totalSteps.toLocaleString()} steps · {t('friends_added_date', { date: formatAdded(f.addedAt) })}
                </Mono>
              </div>
              <span style={{ flexShrink: 0, color: inkHint, fontSize: 18, fontWeight: 600 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {selectedFriend && (
        <FriendProfileScreen friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      )}
    </section>
  )
}
