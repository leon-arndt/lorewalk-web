import { useEffect, useState } from 'react'
import { supabase, ensureSession } from '@/lib/supabase'

export interface Account {
  userId: string
  email: string | null
  // An anonymous account lives on this device only. A Google sign-in links it.
  isAnonymous: boolean
}

// The signed-in Supabase account, or null while offline or before the first
// session exists. It follows every switch: the first anonymous sign-in, a
// Google sign-in to another account, and a sign-out.
export function useAccount(enabled: boolean): Account | null {
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => {
    if (!enabled) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user
      setAccount(user
        ? {
            userId: user.id,
            email: user.email || (user.user_metadata?.email as string | undefined) || null,
            isAnonymous: !!user.is_anonymous,
          }
        : null)
      // After a sign-out the online features still need a player id, so go
      // back to an anonymous session. Deferred, because a Supabase call made
      // inside this callback waits on a lock that the callback itself holds.
      if (event === 'SIGNED_OUT') setTimeout(() => void ensureSession(), 0)
    })
    void ensureSession()
    return () => {
      subscription.unsubscribe()
      setAccount(null)
    }
  }, [enabled])

  // A failed sign-in does not retry by itself: the dashboard setting may have
  // been off, or the network down. Try again until a session exists.
  useEffect(() => {
    if (!enabled || account) return
    const retry = () => { if (document.visibilityState === 'visible') void ensureSession() }
    const timer = setInterval(retry, 15_000)
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
    }
  }, [enabled, account])

  return account
}
