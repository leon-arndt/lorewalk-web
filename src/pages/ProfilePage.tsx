import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import { xpForNextLevel, currentMonthKey, monthLabel, recentMonthKeys, stepsThisMonth, MEDAL_EVENT_TARGET_STEPS } from '@/lib/profile'
import { FriendsSection } from '@/components/UI/FriendsSection'
import { PostcardsSection } from '@/components/UI/PostcardsSection'
import { MedalSvg } from '@/components/UI/MedalSvg'
import { BadgeDetailSheet } from '@/components/UI/BadgeDetailSheet'
import { MedalHistoryScreen } from '@/components/UI/MedalHistoryScreen'
import { VisitHistoryItem } from '@/components/UI/VisitHistoryItem'
import { VisitHistoryScreen } from '@/components/UI/VisitHistoryScreen'
import { getMedalConfig } from '@/data/medals'
import { StreakChestCard } from '@/components/UI/StreakChestCard'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { PremiumModal } from '@/components/UI/PremiumModal'
import type { Achievement, EarnedMedal } from '@/types'
import { accent, rewardGradient, rewardGradientHorizontal } from '@/lib/theme'
import { pageBackground } from '@/lib/glass'

const PREMIUM_BENEFITS = [
  { icon: '🔓', text: 'Every landmark unlocked' },
  { icon: '🏅', text: "Monthly challenge - earn a unique real physical medal" },
]

declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string
declare const __BUILD_DATE__: string

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function ProfilePage() {
  const { profile, setDisplayName, addXp, addCoins, addDevEgg, addDevSteps, addDevStreakDays, toggleDevPremium, claimMedal } = useProfile()
  const { showReward } = useReward()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile.displayName)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showChallengeInfo, setShowChallengeInfo] = useState(false)
  const [badgeDetail, setBadgeDetail] = useState<{
    icon: ReactNode; name: string; description: string; status: string; statusColor: string
  } | null>(null)
  const [showMedalHistory, setShowMedalHistory] = useState(false)
  const [showVisitHistory, setShowVisitHistory] = useState(false)

  const xpNeeded = xpForNextLevel(profile.level)
  const xpPct = Math.min((profile.xp / xpNeeded) * 100, 100)

  const unlockedAchievements = profile.achievements.filter((a) => a.unlockedAt)
  const lockedAchievements = profile.achievements.filter((a) => !a.unlockedAt)

  const currentMonth = currentMonthKey()
  const monthSteps = stepsThisMonth(profile.dailySteps, currentMonth)
  const medalComplete = monthSteps >= MEDAL_EVENT_TARGET_STEPS
  const medalClaimed = profile.medals.some((m) => m.monthKey === currentMonth)

  function handleNameSave() {
    setDisplayName(nameInput)
    setEditingName(false)
  }


  function openAchievementDetail(a: Achievement) {
    setBadgeDetail({
      icon: (
        <span style={{ fontSize: 64, filter: a.unlockedAt ? undefined : 'grayscale(1)', opacity: a.unlockedAt ? 1 : 0.5 }}>
          {a.icon}
        </span>
      ),
      name: a.name,
      description: a.description,
      status: a.unlockedAt ? `Acquired on ${formatDate(a.unlockedAt)}` : 'Not yet unlocked',
      statusColor: a.unlockedAt ? '#16a34a' : '#94a3b8',
    })
  }

  function openMedalDetail(monthKey: string, earned: EarnedMedal | undefined) {
    const cfg = getMedalConfig(monthKey)
    if (!cfg) return
    setBadgeDetail({
      icon: (
        <div style={{ filter: earned ? undefined : 'grayscale(1)', opacity: earned ? 1 : 0.45 }}>
          <MedalSvg config={cfg} size={140} />
        </div>
      ),
      name: cfg.title,
      description: cfg.challenge,
      status: earned ? `Acquired on ${formatDate(earned.claimedAt)}` : 'Not yet earned',
      statusColor: earned ? '#16a34a' : '#94a3b8',
    })
  }

  function handleClaimMedal() {
    const medal = claimMedal()
    if (!medal) return
    showReward({
      emoji: '🏅',
      title: 'Medal earned!',
      subtitle: `You completed the ${monthLabel(medal.monthKey)} challenge.`,
      items: [{ type: 'badge', label: medal.title }],
      medalMonthKey: medal.monthKey,
    })
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: pageBackground, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>

      {/* Header card */}
      <div style={{ position: 'relative', background: 'white', padding: '44px 20px 24px', borderBottom: '1px solid #f1f5f9' }}>
        <button
          onClick={() => navigate('/settings')}
          aria-label={t('profile_settings')}
          style={{
            position: 'absolute', top: 12, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar - premium members get a shield-shaped background instead of a circle. Tapping it opens character customization. */}
          <button
            onClick={() => navigate('/customize')}
            aria-label={t('profile_customize')}
            data-sfx="click"
            style={{
              position: 'relative', width: 64, height: 64, flexShrink: 0,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            }}
          >
            {profile.isPremium ? (
              <svg width={64} height={64} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 10px rgba(245,158,11,0.45))' }}>
                <defs>
                  <linearGradient id="premiumShieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="55%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>
                <path
                  d="M50 4 L88 18 L88 50 C88 77 70 92 50 98 C30 92 12 77 12 50 L12 18 Z"
                  fill="url(#premiumShieldFill)"
                  stroke="#fff7ed"
                  strokeWidth={2}
                />
              </svg>
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: rewardGradient,
                boxShadow: '0 4px 12px rgba(129,140,248,0.35)',
              }} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PlayerFaceIcon appearance={profile.appearance} size={48} />
            </div>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  autoFocus
                  maxLength={24}
                  style={{
                    flex: 1, fontSize: 18, fontWeight: 700, color: '#1e293b',
                    border: `2px solid ${accent}`, borderRadius: 10,
                    padding: '4px 10px', outline: 'none',
                  }}
                />
                <button
                  onClick={handleNameSave}
                  style={{
                    background: accent, color: 'white', border: 'none',
                    borderRadius: 10, padding: '4px 14px', fontWeight: 600,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {t('profile_save')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                  {profile.displayName}
                </span>
                <button
                  onClick={() => { setNameInput(profile.displayName); setEditingName(true) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: '#94a3b8', padding: 0,
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => navigate('/customize')}
                  aria-label={t('profile_customize')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
                    <path d="M4 21c0-4 3-7 8-7s8 3 8 7" />
                  </svg>
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: accent,
                color: 'white',
              }}>
                {t('level_badge', { level: profile.level })}
              </span>
              {profile.isPremium && (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                  color: '#78350f',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  👑 {t('profile_premium_badge')}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {profile.totalXp} {t('profile_stat_total_xp')}
              </span>
            </div>

            {/* XP bar - grouped under the level, constrained to the name column */}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: rewardGradientHorizontal,
                  width: `${xpPct}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                <span>{t('profile_xp_to_level', { xp: xpNeeded - profile.xp, level: profile.level + 1 })}</span>
                <span>{profile.xp} / {xpNeeded}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: '#f1f5f9',
        borderBottom: '1px solid #f1f5f9',
      }}>
        {[
          { labelKey: 'profile_stat_visited' as const, value: profile.visitHistory.length, icon: '📍' },
          { labelKey: 'profile_stat_streak' as const, value: profile.streakDays, icon: '🔥' },
          { labelKey: 'profile_stat_total_xp' as const, value: profile.totalXp, icon: '⭐' },
        ].map(({ labelKey, value, icon }) => (
          <div key={labelKey} style={{
            background: 'white', padding: '16px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t(labelKey)}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <StreakChestCard />

        {/* Premium */}
        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
            👑 Lorewalk Premium
          </h2>

          {profile.isPremium ? (
            <div style={{
              background: 'white', borderRadius: 18, padding: 18,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #fde68a',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🏅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{monthLabel(currentMonth)} challenge</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Walk {MEDAL_EVENT_TARGET_STEPS.toLocaleString()} steps this month</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#78350f', padding: '3px 10px', borderRadius: 20,
                    background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                  }}>
                    Premium
                  </span>
                  <button
                    onClick={() => setShowChallengeInfo(true)}
                    aria-label="How the monthly challenge works"
                    style={{
                      width: 20, height: 20, borderRadius: '50%', border: '1px solid #fbbf24',
                      background: 'white', color: '#b45309', fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0, lineHeight: 1,
                    }}
                  >
                    i
                  </button>
                </div>
              </div>

              <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, #fde68a, #f59e0b)',
                  width: `${Math.min(100, (monthSteps / MEDAL_EVENT_TARGET_STEPS) * 100)}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: medalClaimed || medalComplete ? 12 : 0 }}>
                {Math.min(monthSteps, MEDAL_EVENT_TARGET_STEPS).toLocaleString()} / {MEDAL_EVENT_TARGET_STEPS.toLocaleString()} steps
              </div>

              {medalClaimed ? (
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                  ✅ Medal claimed for {monthLabel(currentMonth)}
                </div>
              ) : medalComplete ? (
                <button
                  onClick={handleClaimMedal}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f',
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                  }}
                >
                  🏅 Claim this month's medal
                </button>
              ) : null}

              <button
                onClick={() => setShowPremiumModal(true)}
                style={{
                  width: '100%', marginTop: 12, padding: 0, border: 'none', background: 'none',
                  fontSize: 11.5, fontWeight: 600, color: '#b45309', cursor: 'pointer', textAlign: 'center',
                }}
              >
                Manage subscription
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPremiumModal(true)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                background: 'linear-gradient(160deg, #fffbeb 0%, #fff7ed 100%)',
                border: '2px solid #fde68a', borderRadius: 18, padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>🛡️</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#78350f' }}>Go Premium</div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>Unlock everything Lorewalk has to offer</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {PREMIUM_BENEFITS.map((b) => (
                  <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#78350f', fontWeight: 600 }}>
                    <span style={{ fontSize: 16 }}>{b.icon}</span> {b.text}
                  </div>
                ))}
              </div>

              <div
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                  color: '#78350f', fontSize: 15, fontWeight: 800, textAlign: 'center',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                }}
              >
                See what's included →
              </div>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>Monthly medals</span>
            <button
              onClick={() => setShowMedalHistory(true)}
              aria-label="View all monthly medals"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#b45309', fontSize: 18, fontWeight: 800, padding: 4, lineHeight: 1,
              }}
            >
              ›
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {recentMonthKeys(4).map((monthKey) => {
              const cfg = getMedalConfig(monthKey)
              if (!cfg) return null
              const earned = profile.medals.find((m) => m.monthKey === monthKey)
              return (
                <button
                  key={monthKey}
                  onClick={() => openMedalDetail(monthKey, earned)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer', flex: 1,
                  }}
                >
                  <div style={{ filter: earned ? undefined : 'grayscale(1)', opacity: earned ? 1 : 0.4 }}>
                    <MedalSvg config={cfg} size={72} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#78350f', textAlign: 'center', lineHeight: 1.3 }}>
                    {monthLabel(monthKey)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <PostcardsSection />

        <FriendsSection />

        {/* Achievements */}
        <section>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
            {t('profile_achievements')}
          </h2>

          {unlockedAchievements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {unlockedAchievements.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openAchievementDetail(a)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '10px 12px', borderRadius: 14, border: 'none',
                    background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    minWidth: 72, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {lockedAchievements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lockedAchievements.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openAchievementDetail(a)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '10px 12px', borderRadius: 14, border: '1px dashed #e2e8f0',
                    background: '#f8fafc',
                    minWidth: 72, opacity: 0.5, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 26, filter: 'grayscale(1)' }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Visit history */}
        <section>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: accent }}>
            {t('profile_visit_history')}
          </h2>

          {profile.visitHistory.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                {t('profile_no_visits')}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.visitHistory.slice(0, 10).map((visit, i) => (
                <VisitHistoryItem key={`${visit.poiId}-${visit.visitedAt}-${i}`} visit={visit} />
              ))}
              {profile.visitHistory.length > 10 && (
                <button
                  onClick={() => setShowVisitHistory(true)}
                  style={{
                    display: 'block', width: '100%', marginTop: 4, padding: '12px',
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
                    fontSize: 13, fontWeight: 700, color: accent, cursor: 'pointer',
                  }}
                >
                  {t('profile_visit_history_see_all', { count: profile.visitHistory.length })}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Joined date + app version */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
          {t('profile_explorer_since', { date: formatDate(profile.createdAt) })}
          <br />
          v{__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_DATE__}
        </p>

        {import.meta.env.DEV && (
          <section style={{ marginTop: 24, padding: '14px 16px', background: '#1e1e2e', borderRadius: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              🛠 Dev cheats
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[100, 1000, 5000].map((n) => (
                <button
                  key={n}
                  onClick={() => addDevSteps(n)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                    background: '#312e81', color: '#c4b5fd', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  +{n.toLocaleString()} steps
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[100, 1000, 10000].map((n) => (
                <button
                  key={n}
                  onClick={() => addXp(n)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                    background: '#1e3a5f', color: '#93c5fd', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  +{n.toLocaleString()} XP
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[10, 100, 1000].map((n) => (
                <button
                  key={n}
                  onClick={() => addCoins(n)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                    background: '#422006', color: '#fcd34d', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  +{n.toLocaleString()} 🪙
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => addDevEgg(false)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                  background: '#1a2e1a', color: '#86efac', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                +Egg
              </button>
              <button
                onClick={() => addDevEgg(true)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                  background: '#2e2000', color: '#fcd34d', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ✨ Shiny Egg
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => addDevStreakDays(7)}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 10, border: 'none',
                  background: '#422006', color: '#fcd34d', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                🔥 +7 streak days (grant chest)
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={toggleDevPremium}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 10, border: 'none',
                  background: profile.isPremium ? '#422006' : '#1e1e2e',
                  color: profile.isPremium ? '#fcd34d' : '#a78bfa',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                {profile.isPremium ? '👑 Premium ON' : '👑 Toggle Premium (dev)'}
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  localStorage.removeItem('lorewalk_profile')
                  localStorage.removeItem('lorewalk.steps')
                  localStorage.removeItem('lorewalk.stepRingCelebratedDate')
                  window.location.reload()
                }}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 10, border: 'none',
                  background: '#450a0a', color: '#fca5a5', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                🗑 Reset save data
              </button>
            </div>
          </section>
        )}
      </div>

      {showChallengeInfo && (
        <div
          onClick={() => setShowChallengeInfo(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,10,30,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              background: 'white', borderRadius: 20,
              padding: '22px 20px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏅</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: accent }}>
              How the monthly challenge works
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Finish this challenge to earn a real physical medal, which you can pick up at the next community event. Terms and conditions apply.
            </p>
            <button
              onClick={() => setShowChallengeInfo(false)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showMedalHistory && (
        <MedalHistoryScreen
          medals={profile.medals}
          createdAt={profile.createdAt}
          onSelectMonth={(monthKey, earned) => { setShowMedalHistory(false); openMedalDetail(monthKey, earned) }}
          onClose={() => setShowMedalHistory(false)}
        />
      )}

      {showVisitHistory && (
        <VisitHistoryScreen
          visits={profile.visitHistory}
          onClose={() => setShowVisitHistory(false)}
        />
      )}

      {badgeDetail && (
        <BadgeDetailSheet
          icon={badgeDetail.icon}
          name={badgeDetail.name}
          description={badgeDetail.description}
          status={badgeDetail.status}
          statusColor={badgeDetail.statusColor}
          onClose={() => setBadgeDetail(null)}
        />
      )}

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </div>
  )
}
