// Verifies RevenueCat's server-to-server webhook and records what the player
// paid for. A subscription event upserts premium_entitlements, the
// server-verified source of truth the client reconciles against (see
// src/contexts/ProfileContext.tsx). A coin pack purchase inserts one
// coin_grants row (see src/lib/coinGrants.ts).
//
// Setup (see TODO.md for the full checklist):
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value also set in the
//     RevenueCat dashboard's webhook "Authorization header value" field>
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Then point the RevenueCat dashboard's webhook URL at the deployed function.
//
// Sandbox purchases (Play license testers) are ignored unless
// REVENUECAT_ALLOW_SANDBOX=true. Set it on a test project, never on the
// production one, or a tester account gets real Premium and real coins.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Play Console subscription product ids, linked to RevenueCat packages.
// Update if the ids change - see TODO.md for the Play Console setup steps.
const PRODUCT_INTERVALS: Record<string, 'monthly' | 'yearly'> = {
  lorewalk_premium_monthly: 'monthly',
  lorewalk_premium_yearly: 'yearly',
}

// Play Console in-app product ids for the coin packs. The server decides how
// many coins a product is worth: the client never sends an amount. Keep in
// step with COIN_PACKS in src/pages/ShopPage.tsx.
const COIN_PRODUCTS: Record<string, number> = {
  lorewalk_coins_100: 100,
  lorewalk_coins_600: 600,
  lorewalk_coins_1000: 1000,
  lorewalk_coins_2500: 2500,
}

// The events that carry the current expiry of a subscription. Anything else
// (TRANSFER, TEST, SUBSCRIBER_ALIAS, a one-time purchase) must not touch the
// entitlement: an event without an expiry would read as "not active".
const ENTITLEMENT_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'UNCANCELLATION', 'EXPIRATION',
  'BILLING_ISSUE', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RevenueCatEvent {
  id?: string
  type?: string
  environment?: string
  app_user_id: string
  original_app_user_id?: string
  product_id?: string
  transaction_id?: string | null
  expiration_at_ms?: number | null
}

// Compares in constant time, so the response time does not leak how much of a
// guessed secret is right.
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i % y.length]
  return diff === 0
}

// RevenueCat retries any answer that is not a 2xx. An event this function
// does not act on must still get a 200, or it comes back for days.
const ignored = (why: string) => new Response(`Ignored: ${why}`, { status: 200 })

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (!secret || !sameSecret(req.headers.get('authorization') ?? '', secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let event: RevenueCatEvent
  try {
    const body = await req.json()
    event = body.event
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!event?.type) return new Response('Missing event', { status: 400 })

  if (event.environment === 'SANDBOX' && Deno.env.get('REVENUECAT_ALLOW_SANDBOX') !== 'true') {
    return ignored('sandbox')
  }
  // The app configures RevenueCat with the Supabase auth uid. Any other id
  // (an anonymous RevenueCat id) belongs to no player row.
  if (!event.app_user_id || !UUID_RE.test(event.app_user_id)) return ignored('no player id')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const productId = event.product_id ?? ''

  if (event.type === 'NON_RENEWING_PURCHASE' && productId in COIN_PRODUCTS) {
    const grantId = event.transaction_id ?? event.id
    if (!grantId) return new Response('Missing transaction id', { status: 400 })
    const { error } = await supabase.from('coin_grants').upsert({
      id: grantId,
      player_id: event.app_user_id,
      coins: COIN_PRODUCTS[productId],
      product_id: productId,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) {
      console.error('coin_grants insert failed', error)
      return new Response('Server error', { status: 500 })
    }
    return new Response('OK', { status: 200 })
  }

  if (!ENTITLEMENT_EVENTS.has(event.type) || !(productId in PRODUCT_INTERVALS)) {
    return ignored(event.type)
  }

  // A cancellation only turns off auto-renew - access continues until
  // expiration_at_ms, when RevenueCat separately sends an EXPIRATION event.
  // So expiry vs. now is enough to derive current entitlement.
  // See https://www.revenuecat.com/docs/integrations/webhooks/event-flows
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null
  const isActive = expiresAt !== null && new Date(expiresAt).getTime() > Date.now()

  const { error } = await supabase.from('premium_entitlements').upsert({
    player_id: event.app_user_id,
    is_active: isActive,
    product_id: productId,
    interval: PRODUCT_INTERVALS[productId],
    expires_at: expiresAt,
    revenuecat_app_user_id: event.original_app_user_id ?? event.app_user_id,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('premium_entitlements upsert failed', error)
    return new Response('Server error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
