import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import {
  getNativeGoogleToken, isGoogleSignInAvailable, isNativeGoogleSignIn,
  renderGoogleButton, signInWithGoogleToken, type GoogleToken,
} from '@/lib/googleAuth'

// On the web, Google draws the button and labels it in the given locale. On
// Android the app draws its own and opens the native account sheet. A sign-in
// that works needs no callback: the account in ProfileContext changes, and
// the Settings section that holds this button re-renders without it.
export function GoogleSignInButton() {
  const { t, locale } = useLocale()
  const holderRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [unavailable, setUnavailable] = useState(!isGoogleSignInAvailable)

  const signIn = useCallback(async (token: GoogleToken | null) => {
    setBusy(true)
    const ok = !!token && await signInWithGoogleToken(token)
    setFailed(!ok)
    setBusy(false)
  }, [])

  useEffect(() => {
    if (isNativeGoogleSignIn || !isGoogleSignInAvailable || !holderRef.current) return
    let cancelled = false
    void renderGoogleButton(holderRef.current, locale, (token) => { if (!cancelled) void signIn(token) })
      .then((drawn) => { if (!cancelled && !drawn) setUnavailable(true) })
    return () => { cancelled = true }
  }, [locale, signIn])

  if (unavailable) {
    return <div style={{ fontSize: 12, color: '#75634C' }}>{t('account_unavailable')}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
      {isNativeGoogleSignIn ? (
        <button
          onClick={async () => signIn(await getNativeGoogleToken())}
          style={{
            padding: '10px 16px', borderRadius: 8, border: '1px solid #dadce0',
            background: '#FFFDF6', color: '#33281E', fontWeight: 500, fontSize: 13, cursor: 'pointer',
          }}
        >
          {t('account_sign_in_google')}
        </button>
      ) : (
        <div ref={holderRef} style={{ minHeight: 40 }} />
      )}
      {failed && <div style={{ fontSize: 12, color: '#A8361F' }}>{t('account_sign_in_failed')}</div>}
    </div>
  )
}
