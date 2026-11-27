import { createPortal } from 'react-dom'
import { UUID_RE } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useProfile } from '@/contexts/ProfileContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useReward } from '@/contexts/RewardContext'
import { MONO, paperSheet, paperTag, SCRIM } from '@/lib/paper'
import { forest, ink, inkHint, inkSoft, line, ochre, paperCard, stamp, edge } from '@/lib/theme'
import { InkButton, Mono, NoteCard, Stamp } from '@/components/UI/Journal'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import {
  fetchPremiumOfferings, isBillingAvailable, playSubscriptionManagementUrl, purchasePremiumPackage,
  type PremiumOfferings,
} from '@/lib/billing'
import type { PremiumInterval } from '@/types'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

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
  const FEATURE_ROWS: { icon: string; sprite?: string; label: string; basic: boolean; premium: string }[] = [
    { icon: '🗺️', label: t('premium_feature_standard_landmarks'), basic: true, premium: t('premium_feature_all_landmarks') },
    { icon: '🔓', label: t('premium_feature_premium_landmarks'), basic: false, premium: t('premium_feature_unlocked') },
    { icon: '🏅', sprite: 'item_badge', label: t('premium_feature_medal_challenge'), basic: false, premium: t('premium_feature_real_medal') },
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
      // The simulated purchase is a dev tool. A shipped build must never
      // grant Premium without a real purchase.
      if (!import.meta.env.DEV) {
        showToast(t('premium_needs_online'))
        return
      }
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
    // The purchase binds to the RevenueCat app user id. That must be the
    // signed-in auth uid, or the webhook row never matches this player.
    if (!UUID_RE.test(profile.id)) {
      showToast(t('premium_purchase_failed'))
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
    if (mode === 'online' || !import.meta.env.DEV) {
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

  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxHeight: '92vh',
          ...paperSheet,
          borderRadius: '10px 10px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>

        <button
          onClick={onClose}
          data-sfx="close"
          aria-label={t('common_close')}
          style={{
            position: 'absolute', top: 4, right: 6, zIndex: 1, width: 44, height: 44, padding: 0,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ ...paperTag, background: paperCard, width: 30, height: 30, fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</span>
        </button>

        <div style={{ overflowY: 'auto', overflowX: 'hidden', padding: '40px 16px calc(24px + env(safe-area-inset-bottom))' }}>
          <NoteCard taped tilt={-0.5} style={{ padding: '18px 12px 12px', background: paperCard }}>
            {isManaging && (
              <Stamp tilt={6} style={{ position: 'absolute', top: 18, right: 12 }}>{t('premium_premium_col')}</Stamp>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: isManaging ? 84 : 0 }}>
              <div style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: '50%',
                background: ochre, border: `1px solid ${edge}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>👑</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 600, lineHeight: '28px', color: ink }}>
                  {isManaging ? t('premium_youre_premium') : t('premium_go_premium')}
                </div>
                <div style={{ fontSize: 13, lineHeight: '18px', color: inkSoft, marginTop: 2 }}>
                  {isManaging
                    ? t('premium_plan_summary', { label: currentPlan.label, price: currentPlan.price })
                    : (context ?? t('premium_unlock_everything'))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: `1px solid ${line}` }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 56px 64px',
                alignItems: 'center', padding: '8px 0 6px',
                borderBottom: `1px solid ${line}`,
              }}>
                <span />
                <Mono style={{ textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{t('premium_basic_col')}</Mono>
                <Mono style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: ink, textAlign: 'center' }}>{t('premium_premium_col')}</Mono>
              </div>

              {FEATURE_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 56px 64px',
                    alignItems: 'center', minHeight: 40, padding: '6px 0',
                    borderBottom: i === FEATURE_ROWS.length - 1 ? 'none' : `1px solid ${line}`,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: ink }}>
                    {row.sprite
                      ? <EmojiSprite id={row.sprite} emoji={row.icon} size={20} />
                      : <span style={{ width: 20, fontSize: 15, lineHeight: 1, textAlign: 'center' }}>{row.icon}</span>} {row.label}
                  </span>
                  <span style={{ textAlign: 'center', color: row.basic ? forest : inkHint, fontSize: 16, fontWeight: 600 }}>
                    {row.basic ? '✓' : '—'}
                  </span>
                  <span style={{ textAlign: 'center', color: forest, fontSize: 16, fontWeight: 600 }}>✓</span>
                </div>
              ))}
            </div>
          </NoteCard>

          <Mono style={{ display: 'block', textAlign: 'center', margin: '10px 6px 0' }}>
            {t('premium_medal_note')}
          </Mono>

          {isManaging ? (
            <>
              {confirmingCancel ? (
                <div style={{
                  marginTop: 18, borderRadius: 6, padding: 12,
                  background: paperCard, border: `1.5px solid ${stamp}`,
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: stamp, lineHeight: 1.5 }}>
                    {mode === 'online'
                      ? t('premium_cancel_confirm_online')
                      : t('premium_cancel_confirm_offline')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <InkButton
                      onClick={() => setConfirmingCancel(false)}
                      style={{ flex: 1, padding: '0 8px', fontSize: 14 }}
                    >
                      {mode === 'online' ? t('premium_not_now') : t('premium_keep_premium')}
                    </InkButton>
                    <InkButton
                      variant="danger"
                      onClick={handleCancel}
                      disabled={cancelled}
                      style={{ flex: 1, padding: '0 8px', fontSize: 14 }}
                    >
                      {mode === 'online' ? t('premium_open_play') : t('premium_yes_cancel')}
                    </InkButton>
                  </div>
                </div>
              ) : (
                <InkButton
                  variant="paper"
                  onClick={() => setConfirmingCancel(true)}
                  style={{ width: '100%', marginTop: 18, fontSize: 14 }}
                >
                  {t('premium_cancel_subscription')}
                </InkButton>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {(Object.keys(PLANS) as PremiumInterval[]).map((key) => {
                  const plan = PLANS[key]
                  const selected = interval === key
                  return (
                    <button
                      key={key}
                      onClick={() => setInterval(key)}
                      style={{
                        flex: 1, minWidth: 0, position: 'relative', textAlign: 'left', cursor: 'pointer',
                        minHeight: 76, borderRadius: 6, padding: '10px 10px 8px', fontFamily: 'inherit', color: ink,
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                        border: selected ? `1.5px solid ${ink}` : `1px solid ${line}`,
                        borderBottom: selected ? `5px solid ${ochre}` : `1px solid ${line}`,
                        background: paperCard,
                        boxShadow: selected ? '1px 2px 0 rgba(51,40,30,0.18)' : 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {plan.badge && (
                        <Stamp tilt={4} style={{ position: 'absolute', top: -12, right: 6, background: paperCard, whiteSpace: 'nowrap' }}>
                          {plan.badge}
                        </Stamp>
                      )}
                      <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>{plan.label}</div>
                      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: ink, marginTop: 2 }}>{planPrice(key)}</div>
                      {plan.sub && <Mono>{plan.sub}</Mono>}
                    </button>
                  )
                })}
              </div>

              <InkButton
                onClick={handleSubscribe}
                disabled={subscribed || purchasing}
                style={{ width: '100%', marginTop: 14, minHeight: 50, fontSize: 16, opacity: (subscribed || purchasing) ? 0.7 : 1 }}
              >
                {subscribed ? t('premium_youre_premium_exclaim') : purchasing ? t('premium_processing') : t('premium_subscribe_btn', { price: planPrice(interval) })}
              </InkButton>
              <Mono style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
                {t('premium_cancel_anytime')}
              </Mono>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
