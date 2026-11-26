import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { ensureSession, subscribeSessionError } from '@/lib/supabase'
import { accent } from '@/lib/theme'

// One line under the online switch: is there a server session, of which kind,
// and if not, why. The first 8 characters of the user id are enough to match
// a row in the Supabase dashboard.
export function ConnectionStatus() {
  const { t } = useLocale()
  const { account } = useProfile()
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => subscribeSessionError(setError), [])

  async function retry() {
    setRetrying(true)
    await ensureSession()
    setRetrying(false)
  }

  let text: string
  let color = '#64748b'
  if (account) {
    const id = account.userId.slice(0, 8)
    text = account.isAnonymous ? t('settings_conn_guest', { id }) : t('settings_conn_google', { id })
    color = accent
  } else if (error === 'not_configured') {
    text = t('settings_conn_not_configured')
    color = '#b91c1c'
  } else if (error) {
    text = t('settings_conn_failed', { error })
    color = '#b91c1c'
  } else {
    text = t('settings_conn_connecting')
  }

  return (
    <div data-testid="connection-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, minWidth: 0, overflowWrap: 'anywhere' }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6,
          background: account ? '#22c55e' : error ? '#ef4444' : '#f59e0b',
        }} />
        {text}
      </div>
      {!account && error && error !== 'not_configured' && (
        <button
          onClick={() => void retry()}
          disabled={retrying}
          style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 10, border: 'none',
            background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 12,
            cursor: retrying ? 'default' : 'pointer', opacity: retrying ? 0.6 : 1,
          }}
        >
          {t('settings_conn_retry')}
        </button>
      )}
    </div>
  )
}
