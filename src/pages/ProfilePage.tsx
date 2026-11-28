import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import { usePlayerLocation } from '@/contexts/PlayerLocationContext'
import { useLocale } from '@/contexts/LocaleContext'
import { xpForNextLevel } from '@/lib/profile'
import { FriendsSection } from '@/components/UI/FriendsSection'
import { PostcardsSection } from '@/components/UI/PostcardsSection'
import { AchievementCard, BadgeDetailSheet } from '@/components/UI/BadgeDetailSheet'
import { StepTokensSection } from '@/components/UI/StepTokensSection'
import { VisitHistoryItem } from '@/components/UI/VisitHistoryItem'
import { VisitHistoryScreen } from '@/components/UI/VisitHistoryScreen'
import { StreakChestCard } from '@/components/UI/StreakChestCard'
import { WeekStrip } from '@/components/UI/WeekStrip'
import { JournalOverlay } from '@/components/UI/JournalOverlay'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { PremiumModal } from '@/components/UI/PremiumModal'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { InkButton, Mono, NoteCard, PageHeader, SectionTitle, Stamp } from '@/components/UI/Journal'
import type { Achievement } from '@/types'
import { forest, ink, inkHint, inkSoft, line, ochre, paperCard, paperLight, paperShade, stamp, ochreInk, edge } from '@/lib/theme'
import { Icon } from '@/components/UI/Icons'
import { MONO, paperPage, paperTag } from '@/lib/paper'


const cheatButton = {
  flex: 1, minHeight: 44, padding: '0 4px', borderRadius: 10, cursor: 'pointer',
  background: paperCard, border: `1px solid ${edge}`, color: ink,
  fontFamily: MONO, fontWeight: 500, fontSize: 12,
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function ProfilePage() {
  const { profile, setDisplayName, addXp, addCoins, addDevEgg, addDevStreakDays, toggleDevPremium, addDevGoalMonths } = useProfile()
  const { addDevSteps } = usePlayerLocation()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile.displayName)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const premiumBenefits = [
    { icon: '🔓', text: t('premium_benefit_landmarks') },
    { icon: <EmojiSprite id="item_badge" emoji="🏅" size={22} />, text: t('premium_benefit_token') },
  ]
  const [badgeDetail, setBadgeDetail] = useState<{
    icon: ReactNode; name: string; description: string; status: string; statusColor: string
  } | null>(null)
  const [showVisitHistory, setShowVisitHistory] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)

  const xpNeeded = xpForNextLevel(profile.level)
  const xpPct = Math.min((profile.xp / xpNeeded) * 100, 100)

  const unlockedAchievements = profile.achievements.filter((a) => a.unlockedAt)
  const lockedAchievements = profile.achievements.filter((a) => !a.unlockedAt)


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
      statusColor: a.unlockedAt ? forest : inkHint,
    })
  }

  const stats = [
    { labelKey: 'profile_stat_visited' as const, value: profile.visitHistory.length, icon: <EmojiSprite id="item_pin" emoji="📍" size={24} /> },
    { labelKey: 'profile_stat_streak' as const, value: profile.streakDays, icon: <span style={{ fontSize: 19, lineHeight: '24px' }}>🔥</span> },
    { labelKey: 'profile_stat_total_xp' as const, value: profile.totalXp, icon: <EmojiSprite id="item_xp" emoji="⭐" size={24} /> },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>

      {/* The explorer's name is the title of the page */}
      <PageHeader
        title={editingName ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              autoFocus
              maxLength={24}
              style={{
                flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', fontFamily: 'inherit',
                fontSize: 19, fontWeight: 600, color: ink, background: paperCard,
                border: `1px solid ${edge}`, borderRadius: 10,
                padding: '0 10px', outline: 'none',
              }}
            />
            <InkButton onClick={handleNameSave} style={{ flexShrink: 0 }}>
              {t('profile_save')}
            </InkButton>
          </span>
        ) : (
          // The name is the rename button. Its small pencil says so, and the
          // look of the avatar has its own pencil on the photo below.
          <button
            type="button"
            onClick={() => { setNameInput(profile.displayName); setEditingName(true) }}
            aria-label={t('profile_rename')}
            style={{
              display: 'block', maxWidth: '100%', margin: 0, padding: 0, border: 'none', background: 'none',
              font: 'inherit', letterSpacing: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
              overflowWrap: 'anywhere', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {profile.displayName}
            <Icon name="edit" size={16} style={{ display: 'inline-block', marginLeft: 8, color: inkHint, verticalAlign: 'baseline' }} />
          </button>
        )}
        right={
          <button
            onClick={() => navigate('/settings')}
            aria-label={t('profile_settings')}
            style={{
              ...paperTag, width: 44, height: 44, padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        }
      />

      {/* Explorer card: the photo, the level, the XP bar, and the three figures */}
      <section style={{ padding: '18px 16px 0' }}>
        <NoteCard taped tilt={-0.5} style={{ padding: '18px 14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Avatar: a photo glued in. Tapping it opens character customization. */}
            <button
              onClick={() => navigate('/customize')}
              aria-label={t('profile_customize')}
              data-sfx="click"
              style={{
                position: 'relative', flexShrink: 0, padding: '5px 5px 14px', cursor: 'pointer',
                background: paperCard, border: `1px solid ${line}`, borderRadius: 6,
                boxShadow: '1px 2px 0 rgba(51,40,30,0.22)', transform: 'rotate(-4deg)',
              }}
            >
              {/* A pencil sticker on the corner of the photo: the photo is what it edits. */}
              <span aria-hidden style={{
                position: 'absolute', right: -9, bottom: -7, zIndex: 1, width: 28, height: 28, boxSizing: 'border-box',
                borderRadius: '50%', background: ink, color: paperLight, border: '2px solid #fff',
                display: 'grid', placeItems: 'center', transform: 'rotate(4deg)',
              }}>
                <Icon name="edit" size={14} strokeWidth={2} />
              </span>
              <div style={{
                width: 76, height: 76, borderRadius: 2,
                background: profile.isPremium ? `${ochre}4d` : paperShade,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PlayerFaceIcon appearance={profile.appearance} size={64} />
              </div>
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Stamp tilt={-3} style={{ fontSize: 13, lineHeight: '16px' }}>
                  {t('level_badge', { level: profile.level })}
                </Stamp>
                {profile.isPremium && (
                  <Stamp color={ochreInk} tilt={2}>
                    👑 {t('profile_premium_badge')}
                  </Stamp>
                )}
              </div>

              {/* XP bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 8, background: 'rgba(51,40,30,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: forest,
                    width: `${xpPct}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 8, marginTop: 5 }}>
                  <Mono>{t('profile_xp_to_level', { xp: xpNeeded - profile.xp, level: profile.level + 1 })}</Mono>
                  <Mono style={{ color: ink }}>{profile.xp} / {xpNeeded}</Mono>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            marginTop: 16, paddingTop: 12, borderTop: `1px solid ${line}`,
          }}>
            {stats.map(({ labelKey, value, icon }, i) => (
              <div key={labelKey} style={{
                padding: '0 6px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                borderRight: i < stats.length - 1 ? `1px solid ${line}` : 'none',
              }}>
                <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>{icon}</div>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, color: ink, lineHeight: '28px' }}>{value}</div>
                <Mono>{t(labelKey)}</Mono>
              </div>
            ))}
          </div>
        </NoteCard>
      </section>

      {/* This week's step rings. A tap opens the journal with the month calendar. */}
      <section style={{ padding: '16px 16px 0' }}>
        <WeekStrip dailySteps={profile.dailySteps} onOpen={() => setJournalOpen(true)} />
      </section>
      {journalOpen && <JournalOverlay onClose={() => setJournalOpen(false)} />}

      <div style={{ padding: '24px 16px 20px', display: 'flex', flexDirection: 'column', gap: 26 }}>

        <StreakChestCard />

        {/* Premium */}
        <section>
          <SectionTitle>
            👑 Lorewalk Premium
          </SectionTitle>

          {profile.isPremium ? (
            <div style={{
              background: paperLight, border: `1px solid ${edge}`, borderRadius: 10, overflow: 'hidden',
            }}>
              <div aria-hidden style={{ height: 6, background: ochre, borderBottom: `1px solid ${edge}` }} />
              <div style={{ padding: '12px 12px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink }}>{t('premium_youre_premium')}</div>
                  <Stamp color={ochreInk} tilt={3}>
                    {t('premium_premium_col')}
                  </Stamp>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {premiumBenefits.map((b) => (
                    <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: ink }}>
                      <span style={{ width: 22, flexShrink: 0, display: 'flex', justifyContent: 'center', fontSize: 15, lineHeight: 1 }}>{b.icon}</span> {b.text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowPremiumModal(true)}
                  style={{
                    width: '100%', minHeight: 44, marginTop: 2, padding: 0, border: 'none', background: 'none',
                    fontFamily: MONO, fontSize: 12, fontWeight: 500, color: ochreInk, cursor: 'pointer', textAlign: 'center',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                  }}
                >
                  {t('premium_manage_subscription')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPremiumModal(true)}
              style={{
                display: 'block', width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                background: paperLight, border: `1px solid ${edge}`, borderRadius: 10, overflow: 'hidden',
              }}
            >
              <div aria-hidden style={{ height: 6, background: ochre, borderBottom: `1px solid ${edge}` }} />
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>🛡️</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: '22px', color: ink }}>{t('premium_go_premium')}</div>
                    <Mono style={{ display: 'block' }}>{t('premium_unlock_everything')}</Mono>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {premiumBenefits.map((b) => (
                    <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: ink }}>
                      <span style={{ width: 22, flexShrink: 0, display: 'flex', justifyContent: 'center', fontSize: 15, lineHeight: 1 }}>{b.icon}</span> {b.text}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    minHeight: 44, boxSizing: 'border-box', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: paperCard, border: `1px solid ${edge}`,
                    color: ink, fontSize: 15, fontWeight: 500, textAlign: 'center',
                  }}
                >
                  {t('premium_see_included')}
                </div>
              </div>
            </button>
          )}

        </section>

        <StepTokensSection onGoPremium={() => setShowPremiumModal(true)} />

        <PostcardsSection />

        <FriendsSection />

        {/* Achievements */}
        <section>
          <SectionTitle note={`${unlockedAchievements.length} / ${profile.achievements.length}`}>
            {t('profile_achievements')}
          </SectionTitle>

          {unlockedAchievements.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
              {unlockedAchievements.map((a, i) => (
                <AchievementCard key={a.id} icon={a.icon} name={a.name} unlocked tilt={i % 2 ? 0.8 : -0.8} onClick={() => openAchievementDetail(a)} />
              ))}
            </div>
          )}

          {lockedAchievements.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {lockedAchievements.map((a) => (
                <AchievementCard key={a.id} icon={a.icon} name={a.name} unlocked={false} onClick={() => openAchievementDetail(a)} />
              ))}
            </div>
          )}
        </section>

        {/* Visit history */}
        <section>
          <SectionTitle>
            {t('profile_visit_history')}
          </SectionTitle>

          {profile.visitHistory.length === 0 ? (
            <div style={{ border: '1.5px dashed #8C7A5C', borderRadius: 6, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🗺️</div>
              <p style={{ margin: 0, fontSize: 13, color: inkSoft }}>
                {t('profile_no_visits')}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.visitHistory.slice(0, 10).map((visit, i) => (
                <VisitHistoryItem key={`${visit.poiId}-${visit.visitedAt}-${i}`} visit={visit} />
              ))}
              {profile.visitHistory.length > 10 && (
                <InkButton
                  variant="paper"
                  onClick={() => setShowVisitHistory(true)}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  {t('profile_visit_history_see_all', { count: profile.visitHistory.length })}
                </InkButton>
              )}
            </div>
          )}
        </section>

        <Mono style={{ display: 'block', textAlign: 'center' }}>
          {t('profile_explorer_since', { date: formatDate(profile.createdAt) })}
        </Mono>

        {import.meta.env.DEV && (
          <section style={{ marginTop: 16, padding: 12, background: paperLight, border: `1.5px dashed ${ink}`, borderRadius: 10 }}>
            <p style={{ margin: '0 0 10px', fontFamily: MONO, fontSize: 11, fontWeight: 500, color: inkSoft, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              🛠 Dev cheats
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[100, 1000, 5000].map((n) => (
                <button
                  key={n}
                  onClick={() => addDevSteps(n)}
                  style={cheatButton}
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
                  style={cheatButton}
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
                  style={cheatButton}
                >
                  +{n.toLocaleString()} 🪙
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => addDevEgg(false)}
                style={cheatButton}
              >
                +Egg
              </button>
              <button
                onClick={() => addDevEgg(true)}
                style={cheatButton}
              >
                ✨ Shiny Egg
              </button>
            </div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              <button
                onClick={() => addDevStreakDays(7)}
                style={cheatButton}
              >
                🔥 +7 streak days (grant chest)
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[1, 3].map((n) => (
                <button key={n} onClick={() => addDevGoalMonths(n)} style={cheatButton}>
                  +{n} goal month
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              <button
                onClick={toggleDevPremium}
                style={{ ...cheatButton, ...(profile.isPremium ? { background: ochre } : null) }}
              >
                {profile.isPremium ? '👑 Premium ON' : '👑 Toggle Premium (dev)'}
              </button>
            </div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              <button
                onClick={() => {
                  localStorage.removeItem('lorewalk_profile')
                  localStorage.removeItem('lorewalk.steps')
                  localStorage.removeItem('lorewalk.stepsApplied')
                  localStorage.removeItem('lorewalk.stepRingCelebratedDate')
                  window.location.reload()
                }}
                style={{ ...cheatButton, color: stamp, borderColor: stamp }}
              >
                🗑 Reset save data
              </button>
            </div>
          </section>
        )}
      </div>

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
