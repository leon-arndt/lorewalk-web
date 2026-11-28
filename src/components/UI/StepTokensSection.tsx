import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import {
  MONTHLY_STEP_GOAL, stepsInMonth, pendingStepToken, collectedStepTokenThisMonth, stepTokenLadder,
} from '@/lib/stepTokens'
import { StepTokenSvg } from '@/components/UI/StepTokenSvg'
import { BadgeDetailSheet } from '@/components/UI/BadgeDetailSheet'
import { InkButton, Mono, NoteCard, SectionTitle } from '@/components/UI/Journal'
import { forest, ink, inkHint, line, ochreInk, paperCard } from '@/lib/theme'

// The pickup code of a collected token. Staff scan it at the Community Walk.
function PickupCode({ code }: { code: string }) {
  const { t } = useLocale()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    QRCode.toDataURL(code, { width: 200, margin: 2, color: { dark: ink, light: paperCard } })
      .then((u) => { if (live) setUrl(u) })
      .catch(() => {})
    return () => { live = false }
  }, [code])

  return (
    <div data-testid="step-token-pickup" style={{ marginTop: 18 }}>
      {url && <img src={url} alt="" width={160} height={160} style={{ display: 'block', margin: '0 auto', border: `1px solid ${line}`, borderRadius: 6 }} />}
      <Mono style={{ display: 'block', marginTop: 8 }}>{t('step_token_pickup')}</Mono>
    </div>
  )
}

// The Monthly Step Goal and the Step Tokens on the profile page: the steps of
// this month, the count of goal months, the next tokens, and the claim.
export function StepTokensSection({ onGoPremium }: { onGoPremium: () => void }) {
  const { profile, claimStepToken } = useProfile()
  const { showReward, showToast } = useReward()
  const { t, locale } = useLocale()
  const [detail, setDetail] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const count = profile.stepGoalMonths.length
  const monthSteps = stepsInMonth(profile.dailySteps)
  const reached = monthSteps >= MONTHLY_STEP_GOAL
  const pending = pendingStepToken(count, profile.stepTokens)
  const waiting = collectedStepTokenThisMonth(profile.stepTokens)
  const goal = MONTHLY_STEP_GOAL.toLocaleString(locale)

  async function handleCollect() {
    if (busy) return
    setBusy(true)
    const token = await claimStepToken()
    setBusy(false)
    if (!token) {
      showToast(t('token_claim_failed'))
      return
    }
    showReward({
      emoji: '🏅',
      spriteId: 'item_badge',
      title: t('step_token_collected_title'),
      subtitle: t('step_token_collected_subtitle', { n: token.milestone }),
      items: [{ type: 'badge', label: t('step_token_name', { n: token.milestone }) }],
      stepToken: token.milestone,
    })
  }

  const detailToken = detail === null ? undefined : profile.stepTokens.find((x) => x.milestone === detail)

  return (
    <section data-testid="step-tokens">
      <SectionTitle note={t('step_tokens_count', { count })}>{t('step_tokens_title')}</SectionTitle>

      <NoteCard>
        <div style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink, marginBottom: 4 }}>{t('step_goal_title')}</div>
        <Mono style={{ display: 'block', marginBottom: 12 }}>{t('step_goal_intro', { goal })}</Mono>

        <div style={{ height: 8, background: 'rgba(51,40,30,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
          <div style={{
            height: '100%', background: forest,
            width: `${Math.min(100, (monthSteps / MONTHLY_STEP_GOAL) * 100)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <Mono style={{ display: 'block', color: reached ? forest : undefined }}>
          {reached
            ? t('step_goal_reached')
            : t('step_goal_progress', { steps: monthSteps.toLocaleString(locale), goal })}
        </Mono>
        {!profile.isPremium && (
          <Mono style={{ display: 'block', marginTop: 2, color: ochreInk }}>{t('step_goal_premium_only')}</Mono>
        )}

        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {stepTokenLadder(profile.stepTokens).map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`step-token-${m}`}
              aria-label={t('step_token_name', { n: m })}
              onClick={() => setDetail(m)}
              style={{
                flex: 1, minWidth: 0, minHeight: 44, padding: 0, cursor: 'pointer',
                display: 'flex', justifyContent: 'center', background: 'none', border: 'none',
                filter: count >= m ? undefined : 'grayscale(1)', opacity: count >= m ? 1 : 0.4,
              }}
            >
              <StepTokenSvg milestone={m} size={52} />
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {!profile.isPremium ? (
            <InkButton variant="paper" onClick={onGoPremium} style={{ width: '100%' }}>
              {pending !== null ? t('step_token_premium') : t('premium_go_premium')}
            </InkButton>
          ) : pending === null ? null : waiting ? (
            <Mono style={{ display: 'block', textAlign: 'center', color: ochreInk }}>{t('step_token_wait')}</Mono>
          ) : (
            <InkButton onClick={handleCollect} disabled={busy} style={{ width: '100%' }}>
              {t('step_token_collect', { n: pending })}
            </InkButton>
          )}
        </div>
      </NoteCard>

      {detail !== null && (
        <BadgeDetailSheet
          icon={
            <div style={{ filter: count >= detail ? undefined : 'grayscale(1)', opacity: count >= detail ? 1 : 0.45 }}>
              <StepTokenSvg milestone={detail} size={120} />
            </div>
          }
          name={t('step_token_name', { n: detail })}
          description={t('step_token_desc', { n: detail })}
          status={
            detailToken
              ? t('step_token_status_collected', {
                date: new Date(detailToken.claimedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
              })
              : count >= detail ? t('step_token_status_ready') : t('step_token_status_locked', { left: detail - count })
          }
          statusColor={detailToken ? forest : count >= detail ? ochreInk : inkHint}
          onClose={() => setDetail(null)}
        >
          {detailToken?.claimCode && <PickupCode code={detailToken.claimCode} />}
        </BadgeDetailSheet>
      )}
    </section>
  )
}
