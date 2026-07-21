// Verifies RevenueCat's server-to-server webhook and upserts the resulting
// entitlement into premium_entitlements - the server-verified source of
// truth the client reconciles against (see src/contexts/ProfileContext.tsx).
//
// Setup (see TODO.md for the full checklist):
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value also set in the
//     RevenueCat dashboard's webhook "Authorization header value" field>
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Then point the RevenueCat dashboard's webhook URL at the deployed function.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Play Console subscription product ids, linked to RevenueCat packages.
// Update if the ids change - see TODO.md for the Play Console setup steps.
const PRODUCT_INTERVALS: Record<string, 'monthly' | 'yearly'> = {
  lorewalk_premium_monthly: 'monthly',
  lorewalk_premium_yearly: 'yearly',
}

interface RevenueCatEvent {
  app_user_id: string
  original_app_user_id?: string
  product_id?: string
  expiration_at_ms?: number | null
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (!secret || req.headers.get('authorization') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let event: RevenueCatEvent
  try {
    const body = await req.json()
    event = body.event
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!event?.app_user_id) return new Response('Missing app_user_id', { status: 400 })

  // A cancellation only turns off auto-renew - access continues until
  // expiration_at_ms, when RevenueCat separately sends an EXPIRATION event.
  // So expiry vs. now is enough to derive current entitlement, no need to
  // branch on event.type. See https://www.revenuecat.com/docs/integrations/webhooks/event-flows
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null
  const isActive = expiresAt !== null && new Date(expiresAt).getTime() > Date.now()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabase.from('premium_entitlements').upsert({
    player_id: event.app_user_id,
    is_active: isActive,
    product_id: event.product_id ?? null,
    interval: event.product_id ? (PRODUCT_INTERVALS[event.product_id] ?? null) : null,
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
