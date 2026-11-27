import { createPortal } from 'react-dom'
import { useState } from 'react'
import type { Friend } from '@/hooks/useFriends'
import { friendAchievementList, type FriendAchievement } from '@/lib/profile'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { deterministicAppearance } from '@/data/cosmetics'
import { AchievementCard, BadgeDetailSheet } from '@/components/UI/BadgeDetailSheet'
import { Mono, NoteCard, Stamp } from '@/components/UI/Journal'
import { useLocale } from '@/contexts/LocaleContext'
import { forest, ink, inkHint, line, paperCard, paperShade } from '@/lib/theme'
import { MONO, paperSheet, SCRIM } from '@/lib/paper'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

interface Props {
  friend: Friend
  onClose: () => void
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function FriendProfileScreen({ friend, onClose }: Props) {
  const { t } = useLocale()
  const [badge, setBadge] = useState<FriendAchievement | null>(null)
  const achievements = friendAchievementList(friend.achievementIds)
  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 76,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '90vh',
          ...paperSheet,
          borderRadius: '10px 10px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              flexShrink: 0, padding: '5px 5px 14px', background: paperCard, border: `1px solid ${line}`, borderRadius: 6,
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)', transform: 'rotate(-3deg)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 2, background: paperShade,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PlayerFaceIcon appearance={deterministicAppearance(friend.playerId)} size={60} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 600, lineHeight: '30px', color: ink, overflowWrap: 'anywhere' }}>{friend.displayName}</div>
              <Mono style={{ display: 'block', marginTop: 2 }}>
                Friend since {formatSince(friend.addedAt)}
              </Mono>
              <Stamp tilt={-3} style={{ marginTop: 10 }}>
                {t('level_badge', { level: friend.level })}
              </Stamp>
            </div>
          </div>

          <NoteCard style={{ marginTop: 20, padding: '12px 0', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div style={{ padding: '0 8px', textAlign: 'center', borderRight: `1px solid ${line}` }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, lineHeight: '28px', color: ink }}>{friend.totalSteps.toLocaleString()}</div>
              <Mono>{t('friend_total_steps')}</Mono>
            </div>
            <div style={{ padding: '0 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, lineHeight: '28px', color: ink }}>{unlocked.length}/{achievements.length}</div>
              <Mono>Achievements</Mono>
            </div>
          </NoteCard>

          <h3 style={{ margin: '22px 0 10px', fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>
            Achievements
          </h3>

          {unlocked.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: unlocked.length && locked.length ? 10 : 0 }}>
              {unlocked.map((a, i) => (
                <AchievementCard key={a.id} icon={a.icon} name={a.name} unlocked tilt={i % 2 ? 0.8 : -0.8} onClick={() => setBadge(a)} />
              ))}
            </div>
          )}

          {locked.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {locked.map((a) => (
                <AchievementCard key={a.id} icon={a.icon} name={a.name} unlocked={false} onClick={() => setBadge(a)} />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {badge && (
        <BadgeDetailSheet
          icon={
            <span style={{ fontSize: 64, filter: badge.unlocked ? undefined : 'grayscale(1)', opacity: badge.unlocked ? 1 : 0.5 }}>
              {badge.icon}
            </span>
          }
          name={badge.name}
          description={badge.description}
          status={badge.unlocked ? 'Unlocked' : 'Not yet unlocked'}
          statusColor={badge.unlocked ? forest : inkHint}
          onClose={() => setBadge(null)}
        />
      )}
    </motion.div>,
    document.body,
  )
}
