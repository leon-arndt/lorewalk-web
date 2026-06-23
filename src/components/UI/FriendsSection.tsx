import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useProfile } from '@/contexts/ProfileContext'
import { useFriends } from '@/hooks/useFriends'

function hoursLeft(iso: string): string {
  const h = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 3_600_000))
  return h === 0 ? 'Refreshing soon' : `Refreshes in ${h}h`
}

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

export function FriendsSection() {
  const { profile } = useProfile()
  const { friendCode, friends, loading, addFriend, regenerate } = useFriends(
    profile.id,
    profile.displayName,
  )

  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, setTick] = useState(0)

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
      color: { dark: '#1e293b', light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch(() => {})
  }, [friendCode?.code])

  async function handleAdd() {
    if (!input.trim() || adding) return
    setAdding(true)
    const r = await addFriend(input)
    setResult(r)
    if (r.ok) setInput('')
    setAdding(false)
    setTimeout(() => setResult(null), 3000)
  }

  function handleInput(raw: string) {
    // Auto-insert dash after 4th char
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

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
        Friends · {loading ? '…' : friends.length}
      </h2>

      {/* My code card */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>
          Your friend code
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* QR */}
          <div style={{
            width: 96, height: 96, borderRadius: 10, flexShrink: 0,
            background: '#f8fafc', border: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {qrUrl
              ? <img src={qrUrl} alt="Friend QR code" width={92} height={92} />
              : <span style={{ fontSize: 10, color: '#cbd5e1' }}>…</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              onClick={copyCode}
              title="Tap to copy"
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                fontSize: 20, fontWeight: 800, letterSpacing: 3, color: '#1e293b',
                fontFamily: 'monospace',
                background: '#f8fafc', border: '1.5px dashed #e2e8f0',
                borderRadius: 10, padding: '9px 8px', cursor: 'pointer',
              }}
            >
              {friendCode?.code ?? '—'}
            </button>
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 5 }}>
              {copied ? '✓ Copied!' : (friendCode ? hoursLeft(friendCode.expiresAt) : '')}
            </div>
            <button
              onClick={regenerate}
              style={{
                marginTop: 8, width: '100%', fontSize: 12, fontWeight: 600,
                color: '#6366f1', background: 'none',
                border: '1px solid #e0e7ff', borderRadius: 8,
                padding: '6px 0', cursor: 'pointer',
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Add a friend */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>
          Add a friend
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="XXXX-XXXX"
            maxLength={9}
            style={{
              flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: 2,
              fontFamily: 'monospace', padding: '10px 12px',
              border: '1.5px solid #e2e8f0', borderRadius: 10,
              outline: 'none', color: '#1e293b', background: 'white',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: adding || !input.trim() ? '#f1f5f9' : '#6366f1',
              color: adding || !input.trim() ? '#cbd5e1' : 'white',
              fontSize: 13, fontWeight: 700,
              cursor: adding || !input.trim() ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Add
          </button>
        </div>
        {result && (
          <div style={{
            marginTop: 8, fontSize: 12, fontWeight: 600,
            color: result.ok ? '#16a34a' : '#e11d48',
          }}>
            {result.message}
          </div>
        )}
      </div>

      {/* Friends list */}
      {!loading && friends.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 16, padding: 24, textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Share your code with other Lorewalk players to add friends.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {friends.map((f) => (
            <div key={f.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'white', borderRadius: 14, padding: '12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 700, color: 'white',
              }}>
                {f.displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: '#1e293b',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.displayName}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Added {formatAdded(f.addedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
