import { Capacitor } from '@capacitor/core'

// RevenueCat entitlement id that grants Premium once active. Must match the
// entitlement identifier configured in the RevenueCat dashboard, attached to
// the Play Console subscription products. See TODO.md for the manual setup
// steps (Play Console products, RevenueCat project, this API key).
const ENTITLEMENT_ID = 'premium'

// Public (client-safe) RevenueCat API key for the Android app - set once a
// RevenueCat project exists. Purchases silently no-op without it.
const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined

let configuredPlayerId: string | null = null

export function isBillingAvailable(): boolean {
  return Capacitor.isNativePlatform() && !!REVENUECAT_API_KEY
}

async function configure(playerId: string) {
  if (!isBillingAvailable() || configuredPlayerId === playerId) return
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY!, appUserID: playerId })
  configuredPlayerId = playerId
}

export interface PremiumOfferings {
  monthly: import('@revenuecat/purchases-capacitor').PurchasesPackage | null
  yearly: import('@revenuecat/purchases-capacitor').PurchasesPackage | null
}

// Reads the Monthly/Annual package slots off RevenueCat's "current" offering.
// Configure those slots in the RevenueCat dashboard rather than matching
// product id strings here, so pricing experiments don't need a client update.
export async function fetchPremiumOfferings(playerId: string): Promise<PremiumOfferings | null> {
  if (!isBillingAvailable()) return null
  await configure(playerId)
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) return null
  return { monthly: current.monthly, yearly: current.annual }
}

export type PurchaseResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; error?: string }

export async function purchasePremiumPackage(
  playerId: string,
  pkg: import('@revenuecat/purchases-capacitor').PurchasesPackage,
): Promise<PurchaseResult> {
  await configure(playerId)
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
    return { ok: !!customerInfo.entitlements.active[ENTITLEMENT_ID] }
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string }
    return { ok: false, cancelled: !!err.userCancelled, error: err.message }
  }
}

// Re-links purchases already made under this player's Google account (e.g.
// after a reinstall) instead of charging again.
export async function restorePremiumPurchases(playerId: string): Promise<boolean> {
  if (!isBillingAvailable()) return false
  await configure(playerId)
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const { customerInfo } = await Purchases.restorePurchases()
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID]
}

// Google Play requires cancellation through its own subscription management
// UI, not in-app - this just deep-links there instead of calling a cancel API.
export function playSubscriptionManagementUrl(productId?: string): string {
  const base = 'https://play.google.com/store/account/subscriptions'
  const params = new URLSearchParams({ package: 'com.lorewalk.app' })
  if (productId) params.set('sku', productId)
  return `${base}?${params.toString()}`
}

