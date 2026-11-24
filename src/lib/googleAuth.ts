import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

// Google sign-in turns the anonymous, one-device session into an account that
// a second device can sign in to. Both platforms end with a Google ID token
// that Supabase verifies. Only the way to get the token differs:
// - Web: Google Identity Services draws its own button and calls back.
// - Android: Google blocks its OAuth pages inside a WebView, so the native
//   Credential Manager sheet does it, through @capgo/capacitor-social-login.

// The OAuth "Web application" client id from Google Cloud. Android uses the
// same one: Supabase checks the token audience against it.
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

export const isGoogleSignInAvailable = !!CLIENT_ID
export const isNativeGoogleSignIn = Capacitor.isNativePlatform()

export interface GoogleToken {
  idToken: string
  nonce?: string
}

interface GoogleIdApi {
  initialize: (options: {
    client_id: string
    nonce?: string
    callback: (response: { credential?: string }) => void
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

// Google puts the hashed nonce in the token, and Supabase hashes the raw one
// to compare. crypto.subtle only exists on HTTPS and localhost, so a plain
// HTTP dev host signs in without a nonce.
async function makeNonce(): Promise<{ raw: string; hashed: string } | null> {
  if (!crypto.subtle) return null
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Google sign-in script failed to load'))
      document.head.appendChild(script)
    })
    // A failed load must not stick: the next mount retries.
    scriptPromise.catch(() => { scriptPromise = null })
  }
  return scriptPromise
}

// Web only. Google requires its own rendered button: a custom element cannot
// start the flow. Resolves false when the button could not be drawn.
export async function renderGoogleButton(
  parent: HTMLElement,
  locale: string,
  onToken: (token: GoogleToken) => void,
): Promise<boolean> {
  if (!CLIENT_ID) return false
  try {
    await loadGoogleScript()
    const api = window.google?.accounts.id
    if (!api) return false
    const nonce = await makeNonce()
    api.initialize({
      client_id: CLIENT_ID,
      nonce: nonce?.hashed,
      callback: (response) => {
        if (response.credential) onToken({ idToken: response.credential, nonce: nonce?.raw })
      },
    })
    api.renderButton(parent, {
      type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale,
    })
    return true
  } catch (err) {
    console.warn('Google sign-in unavailable', err)
    return false
  }
}

// Android only. Resolves null when the player closes the sheet or it fails.
export async function getNativeGoogleToken(): Promise<GoogleToken | null> {
  if (!CLIENT_ID) return null
  try {
    const { SocialLogin } = await import('@capgo/capacitor-social-login')
    await SocialLogin.initialize({ google: { webClientId: CLIENT_ID } })
    const nonce = await makeNonce()
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: { nonce: nonce?.hashed },
    })
    if (result.responseType !== 'online' || !result.idToken) return null
    return { idToken: result.idToken, nonce: nonce?.raw }
  } catch (err) {
    console.warn('Google sign-in did not finish', err)
    return null
  }
}

// First try to link Google to the current anonymous account. That keeps the
// player id, and with it the friends, the Premium entitlement, and the medal
// claims. Linking fails when the Google account already owns a Lorewalk
// account, which is the second-device case: sign in to that account instead.
export async function signInWithGoogleToken({ idToken, nonce }: GoogleToken): Promise<boolean> {
  const credentials = { provider: 'google', token: idToken, nonce } as const
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity(credentials)
    if (!error) return true
    if (error.code !== 'identity_already_exists') console.warn('Google link failed', error.message)
  }
  const { error } = await supabase.auth.signInWithIdToken(credentials)
  if (error) console.warn('Google sign-in failed', error.message)
  return !error
}
