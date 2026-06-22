import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { xpForNextLevel } from '@/lib/profile'
import { FriendsSection } from '@/components/UI/FriendsSection'

const CATEGORY_ICONS: Record<string, string> = {
  heritage: '🏛', nature: '🌿', religious: '🕌',
  museum: '🎨', landmark: '📍', arts: '🎭',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-SG', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function ProfilePage() {
  const { profile, setDisplayName } = useProfile()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile.displayName)

  const xpNeeded = xpForNextLevel(profile.level)
  const xpPct = Math.min((profile.xp / xpNeeded) * 100, 100)

  const unlockedAchievements = profile.achievements.filter((a) => a.unlockedAt)
  const lockedAchievements = profile.achievements.filter((a) => !a.unlockedAt)

  function handleNameSave() {
    setDisplayName(nameInput)
    setEditingName(false)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', paddingBottom: 60 }}>

      {/* Header card */}
      <div style={{ background: 'white', padding: '28px 20px 24px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(129,140,248,0.35)',
          }}>
            🧭
          </div>

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
                    border: '2px solid #6366f1', borderRadius: 10,
                    padding: '4px 10px', outline: 'none',
                  }}
                />
                <button
                  onClick={handleNameSave}
                  style={{
                    background: '#6366f1', color: 'white', border: 'none',
                    borderRadius: 10, padding: '4px 14px', fontWeight: 600,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Save
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
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                color: 'white',
              }}>
                Lv {profile.level}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {profile.totalXp} total XP
              </span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>XP Progress</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{profile.xp} / {xpNeeded}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #818cf8, #c084fc)',
              width: `${xpPct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            {xpForNextLevel(profile.level) - profile.xp} XP to Level {profile.level + 1}
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
          { label: 'Visited', value: profile.visitHistory.length, icon: '📍' },
          { label: 'Day streak', value: profile.streakDays, icon: '🔥' },
          { label: 'Total XP', value: profile.totalXp, icon: '⭐' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: 'white', padding: '16px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <FriendsSection />

        {/* Achievements */}
        <section>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            Achievements · {unlockedAchievements.length}/{profile.achievements.length}
          </h2>

          {unlockedAchievements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {unlockedAchievements.map((a) => (
                <div
                  key={a.id}
                  title={`${a.name}: ${a.description}\nUnlocked ${formatDate(a.unlockedAt!)}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '10px 12px', borderRadius: 14,
                    background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    minWidth: 72, cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {lockedAchievements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lockedAchievements.map((a) => (
                <div
                  key={a.id}
                  title={a.description}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '10px 12px', borderRadius: 14,
                    background: '#f8fafc', border: '1px dashed #e2e8f0',
                    minWidth: 72, opacity: 0.5, cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: 26, filter: 'grayscale(1)' }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Visit history */}
        <section>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            Visit History
          </h2>

          {profile.visitHistory.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                No visits yet. Check in at a landmark to get started.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.visitHistory.map((visit, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'white', borderRadius: 14, padding: '12px 14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: '#f0fdf4', border: '2px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {CATEGORY_ICONS[visit.poiCategory] ?? '📍'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: '#1e293b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {visit.poiName}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {formatDate(visit.visitedAt)} · {formatTime(visit.visitedAt)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#16a34a',
                    background: '#f0fdf4', padding: '3px 8px', borderRadius: 10,
                    flexShrink: 0,
                  }}>
                    +{visit.xpEarned} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Joined date */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
          Explorer since {formatDate(profile.createdAt)}
        </p>
      </div>
    </div>
  )
}
