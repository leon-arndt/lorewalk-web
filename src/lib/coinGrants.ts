import { supabase } from '@/lib/supabase'
import type { PlayerProfile } from '@/types'

// A coin pack that the server verified: one row of coin_grants, written by the
// revenuecat-webhook Edge Function after a real Google Play purchase.
export interface CoinGrant {
  id: string
  coins: number
}

// Returns undefined when the read fails, so a caller can tell "no grants" from
// "could not ask".
export async function fetchCoinGrants(userId: string): Promise<CoinGrant[] | undefined> {
  const { data, error } = await supabase
    .from('coin_grants')
    .select('id, coins')
    .eq('player_id', userId)
  if (error) {
    console.warn('coin_grants read failed', error.message)
    return undefined
  }
  return (data ?? []) as CoinGrant[]
}

// Adds every grant that this profile has not counted yet. The profile carries
// the ids of the grants it holds, so the check travels with the save: a
// device that takes the cloud save takes its ids too and adds nothing twice,
// and a save that never held a grant gets it on the next sync.
export function applyCoinGrants(profile: PlayerProfile, grants: CoinGrant[]): { profile: PlayerProfile; coins: number } {
  const applied = new Set(profile.coinGrantsApplied)
  const fresh = grants.filter((g) => !applied.has(g.id) && Number.isFinite(g.coins) && g.coins > 0)
  if (fresh.length === 0) return { profile, coins: 0 }
  const coins = fresh.reduce((sum, g) => sum + g.coins, 0)
  return {
    profile: {
      ...profile,
      coins: profile.coins + coins,
      coinGrantsApplied: [...profile.coinGrantsApplied, ...fresh.map((g) => g.id)],
    },
    coins,
  }
}
