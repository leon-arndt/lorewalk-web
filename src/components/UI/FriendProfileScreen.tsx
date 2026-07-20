import { useState } from 'react'
import type { Friend } from '@/hooks/useFriends'
import { friendAchievementList, type FriendAchievement } from '@/lib/profile'
import { PlayerFaceIcon } from '@/components/UI/PlayerFaceIcon'
import { deterministicAppearance } from '@/data/cosmetics'
import { BadgeDetailSheet } from '@/components/UI/BadgeDetailSheet'
import { rewardGradient } from '@/lib/theme'
import { pageBackground } from '@/lib/glass'

interface Props {
  friend: Friend
  onClose: () => void
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function FriendProfileScreen({ friend, onClose }: Props) {
  const [badge, setBadge] = useState<FriendAchievement | null>(null)
  const achievements = friendAchievementList(friend.achievementIds)
  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 76,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '90vh',
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

        <div style={{ overflowY: 'auto', padding: '16px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              position: 'relative', width: 76, height: 76, borderRadius: '50%',
              background: rewardGradient,
              boxShadow: '0 4px 12px rgba(129,140,248,0.35)',
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayerFaceIcon appearance={deterministicAppearance(friend.playerId)} size={56} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#1e293b' }}>{friend.displayName}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#6366f1',
                background: '#eef2ff', borderRadius: 20, padding: '2px 9px',
              }}>
                Lv {friend.level}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Friend since {formatSince(friend.addedAt)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <div style={{
              flex: 1, background: 'white', borderRadius: 14, padding: '12px 8px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{friend.totalSteps.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Total steps</div>
            </div>
            <div style={{
              flex: 1, background: 'white', borderRadius: 14, padding: '12px 8px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{unlocked.length}/{achievements.length}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Achievements</div>
            </div>
          </div>

          <h3 style={{ margin: '20px 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
            Achievements
          </h3>

          {unlocked.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: unlocked.length && locked.length ? 8 : 0 }}>
              {unlocked.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setBadge(a)}
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

          {locked.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {locked.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setBadge(a)}
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
        </div>
      </div>

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
          statusColor={badge.unlocked ? '#16a34a' : '#94a3b8'}
          onClose={() => setBadge(null)}
        />
      )}
    </div>
  )
}
