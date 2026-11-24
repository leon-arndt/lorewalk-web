import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing - online mode will not work. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let sessionPromise: Promise<string | null> | null = null

// Returns the signed-in player's id, signing in anonymously on first use. The
// server derives auth.uid() from this session, and every RLS policy compares
// rows against it, so this id (not a client-made one) is the player id online.
export function ensureSession(): Promise<string | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: signIn, error } = await supabase.auth.signInAnonymously()
      if (error || !signIn.user) {
        console.warn('Anonymous sign-in failed', error?.message)
        return null
      }
      return signIn.user.id
    })()
    // A failure must not stick: the next call retries.
    void sessionPromise.then((id) => { if (!id) sessionPromise = null }, () => { sessionPromise = null })
  }
  return sessionPromise
}

// A Google sign-in or a sign-out swaps the player id, so the cached id must
// follow. INITIAL_SESSION is left alone on purpose: it can report "no session"
// while the first anonymous sign-in is still in flight, and a reset there
// would start a second one.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') sessionPromise = null
  else if (session && event !== 'INITIAL_SESSION') sessionPromise = Promise.resolve(session.user.id)
})
