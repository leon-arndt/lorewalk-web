import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { ensureSession, subscribeSessionError } from '@/lib/supabase'
import { InkButton, Mono } from '@/components/UI/Journal'
import { forest, ink, inkSoft, ochre, stamp } from '@/lib/theme'

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
  let color = inkSoft
  if (account) {
    const id = account.userId.slice(0, 8)
    text = account.isAnonymous ? t('settings_conn_guest', { id }) : t('settings_conn_google', { id })
    color = ink
  } else if (error === 'not_configured') {
    text = t('settings_conn_not_configured')
    color = stamp
  } else if (error) {
    text = t('settings_conn_failed', { error })
    color = stamp
  } else {
    text = t('settings_conn_connecting')
  }

  return (
    <div data-testid="connection-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Mono style={{ display: 'block', fontSize: 12, lineHeight: '16px', fontWeight: 500, color, minWidth: 0, overflowWrap: 'anywhere' }}>
        <span style={{
          display: 'inline-block', width: 9, height: 9, boxSizing: 'border-box', borderRadius: '50%', marginRight: 7,
          border: `1px solid ${ink}`, background: account ? forest : error ? stamp : ochre,
        }} />
        {text}
      </Mono>
      {!account && error && error !== 'not_configured' && (
        <InkButton variant="paper" onClick={() => void retry()} disabled={retrying} style={{ flexShrink: 0, fontSize: 13 }}>
          {t('settings_conn_retry')}
        </InkButton>
      )}
    </div>
  )
}
