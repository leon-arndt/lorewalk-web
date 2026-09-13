import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useReward } from '@/contexts/RewardContext'
import { pageBackground } from '@/lib/glass'
import {
  fetchPremiumOfferings, isBillingAvailable, playSubscriptionManagementUrl, purchasePremiumPackage,
  type PremiumOfferings,
} from '@/lib/billing'
import type { PremiumInterval } from '@/types'

const PLAN_PRICES: Record<PremiumInterval, { price: string; subPrice?: string; savePct?: number }> = {
  monthly: { price: 'SGD 6.99/mo' },
  yearly: { price: 'SGD 59.99/yr', subPrice: 'SGD 5.00', savePct: 28 },
}

interface PremiumModalProps {
  onClose: () => void
  context?: string
}

export function PremiumModal({ onClose, context }: PremiumModalProps) {
  const { profile, subscribePremium, cancelPremium } = useProfile()
  const { mode } = useConnectionMode()
  const { t } = useLocale()
  const { showToast } = useReward()
  const FEATURE_ROWS: { icon: string; label: string; basic: boolean; premium: string }[] = [
    { icon: '🗺️', label: t('premium_feature_standard_landmarks'), basic: true, premium: t('premium_feature_all_landmarks') },
    { icon: '🔓', label: t('premium_feature_premium_landmarks'), basic: false, premium: t('premium_feature_unlocked') },
    { icon: '🏅', label: t('premium_feature_medal_challenge'), basic: false, premium: t('premium_feature_real_medal') },
  ]
  const PLANS: Record<PremiumInterval, { label: string; price: string; sub?: string; badge?: string }> = {
    monthly: { label: t('premium_plan_monthly'), price: PLAN_PRICES.monthly.price },
    yearly: {
      label: t('premium_plan_yearly'), price: PLAN_PRICES.yearly.price,
      sub: t('premium_approx_per_month', { price: PLAN_PRICES.yearly.subPrice! }),
      badge: t('premium_save_badge', { pct: PLAN_PRICES.yearly.savePct! }),
    },
  }
  const [interval, setInterval] = useState<PremiumInterval>('yearly')
  const [subscribed, setSubscribed] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [offerings, setOfferings] = useState<PremiumOfferings | null>(null)

  // Live store pricing once a RevenueCat project + Play Console products exist.
  // Until then this resolves to null and the hardcoded PLANS copy above is shown.
  useEffect(() => {
    if (!isBillingAvailable()) return
    let cancelled = false
    fetchPremiumOfferings(profile.id).then((o) => { if (!cancelled) setOfferings(o) })
    return () => { cancelled = true }
  }, [profile.id])

  function planPrice(key: PremiumInterval): string {
    return (key === 'monthly' ? offerings?.monthly : offerings?.yearly)?.product.priceString ?? PLANS[key].price
  }

  async function handleSubscribe() {
    if (mode !== 'online') {
      subscribePremium(interval)
      setSubscribed(true)
      showToast(t('premium_test_purchase_complete'))
      setTimeout(onClose, 1400)
      return
    }
    if (!isBillingAvailable()) {
      showToast(Capacitor.isNativePlatform()
        ? t('premium_not_setup_native')
        : t('premium_not_setup_web'))
      return
    }
    const pkg = interval === 'monthly' ? offerings?.monthly : offerings?.yearly
    if (!pkg) {
      showToast(t('premium_plan_unavailable'))
      return
    }
    setPurchasing(true)
    const result = await purchasePremiumPackage(profile.id, pkg)
    setPurchasing(false)
    if (result.ok) {
      // Optimistic local unlock for instant UI feedback; the RevenueCat webhook
      // writes premium_entitlements, which ProfileContext reconciles against
      // as the durable, server-verified source of truth on next load.
      subscribePremium(interval)
      setSubscribed(true)
      showToast(t('premium_purchase_complete'))
      setTimeout(onClose, 1400)
    } else if (!result.cancelled) {
      showToast(result.error ?? t('premium_purchase_failed'))
    }
  }

  function handleCancel() {
    if (mode === 'online') {
      window.open(playSubscriptionManagementUrl(), '_blank', 'noopener')
      setConfirmingCancel(false)
      return
    }
    cancelPremium()
    setCancelled(true)
    showToast(t('premium_cancelled_msg'))
    setTimeout(onClose, 1400)
  }

  const isManaging = profile.isPremium
  const currentPlan = profile.premiumInterval ? PLANS[profile.premiumInterval] : PLANS.monthly

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '92vh',
          background: pageBackground,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>

        <button
          onClick={onClose}
          data-sfx="close"
          aria-label={t('common_close')}
          style={{
            position: 'absolute', top: 12, right: 14, border: 'none', background: 'transparent',
            fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>

        <div style={{ overflowY: 'auto', padding: '4px 20px calc(24px + env(safe-area-inset-bottom))' }}>
          <div style={{ textAlign: 'center', padding: '14px 8px 4px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            }}>
              <span style={{ fontSize: 28 }}>👑</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#1e293b' }}>
              {isManaging ? t('premium_youre_premium') : t('premium_go_premium')}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {isManaging
                ? t('premium_plan_summary', { label: currentPlan.label, price: currentPlan.price })
                : (context ?? t('premium_unlock_everything'))}
            </div>
          </div>

          <div style={{
            marginTop: 14, borderRadius: 18, overflow: 'hidden',
            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 52px 52px',
              alignItems: 'center', padding: '10px 14px',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <span />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>{t('premium_basic_col')}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textAlign: 'center' }}>{t('premium_premium_col')}</span>
            </div>

            {FEATURE_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 52px 52px',
                  alignItems: 'center', padding: '10px 14px',
                  borderBottom: i === FEATURE_ROWS.length - 1 ? 'none' : '1px solid #f8fafc',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                  <span style={{ fontSize: 15 }}>{row.icon}</span> {row.label}
                </span>
                <span style={{ textAlign: 'center', color: row.basic ? '#16a34a' : '#e2e8f0', fontSize: 16 }}>
                  {row.basic ? '✓' : '—'}
                </span>
                <span style={{ textAlign: 'center', color: '#f59e0b', fontSize: 16 }}>✓</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center', margin: '8px 6px 0' }}>
            {t('premium_medal_note')}
          </div>

          {isManaging ? (
            <>
              {confirmingCancel ? (
                <div style={{
                  marginTop: 18, borderRadius: 14, padding: 14,
                  background: 'rgba(254,242,242,0.9)', border: '1px solid #fecaca',
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>
                    {mode === 'online'
                      ? t('premium_cancel_confirm_online')
                      : t('premium_cancel_confirm_offline')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      style={{
                        flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f',
                        fontSize: 13, fontWeight: 800,
                      }}
                    >
                      {mode === 'online' ? t('premium_not_now') : t('premium_keep_premium')}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelled}
                      style={{
                        flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid #fca5a5', cursor: cancelled ? 'default' : 'pointer',
                        background: 'white', color: '#b91c1c', fontSize: 13, fontWeight: 800,
                        opacity: cancelled ? 0.6 : 1,
                      }}
                    >
                      {mode === 'online' ? t('premium_open_play') : t('premium_yes_cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  style={{
                    width: '100%', marginTop: 18, padding: '12px 0', borderRadius: 14,
                    border: '1px solid #e2e8f0', background: 'transparent',
                    color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('premium_cancel_subscription')}
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                {(Object.keys(PLANS) as PremiumInterval[]).map((key) => {
                  const plan = PLANS[key]
                  const selected = interval === key
                  return (
                    <button
                      key={key}
                      onClick={() => setInterval(key)}
                      style={{
                        flex: 1, position: 'relative', textAlign: 'left', cursor: 'pointer',
                        borderRadius: 14, padding: '10px 12px',
                        border: selected ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                        background: selected ? '#fffbeb' : 'white',
                      }}
                    >
                      {plan.badge && (
                        <span style={{
                          position: 'absolute', top: -9, right: 10,
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: '#f59e0b', color: 'white', padding: '2px 7px', borderRadius: 20,
                        }}>
                          {plan.badge}
                        </span>
                      )}
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{plan.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#78350f', marginTop: 2 }}>{planPrice(key)}</div>
                      {plan.sub && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{plan.sub}</div>}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={subscribed || purchasing}
                style={{
                  width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                  color: '#78350f', fontSize: 15, fontWeight: 800, cursor: (subscribed || purchasing) ? 'default' : 'pointer',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)', opacity: (subscribed || purchasing) ? 0.7 : 1,
                }}
              >
                {subscribed ? t('premium_youre_premium_exclaim') : purchasing ? t('premium_processing') : t('premium_subscribe_btn', { price: planPrice(interval) })}
              </button>
              <div style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>
                {t('premium_cancel_anytime')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
