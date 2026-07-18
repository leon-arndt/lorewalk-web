import { useNavigate } from 'react-router-dom'
import { useLocale, LOCALE_LABELS } from '@/contexts/LocaleContext'
import type { Locale } from '@/contexts/LocaleContext'
import { useMusic } from '@/contexts/MusicContext'
import { useProfile } from '@/contexts/ProfileContext'
import type { NotificationPrefKey } from '@/types'

const NOTIFICATION_PREFS: { key: NotificationPrefKey; titleKey: 'settings_daily_motivation' | 'settings_notif_party_walk' | 'settings_notif_challenges' | 'settings_notif_friends_gifts' | 'settings_notif_latest_news'; descKey: 'settings_daily_motivation_desc' | 'settings_notif_party_walk_desc' | 'settings_notif_challenges_desc' | 'settings_notif_friends_gifts_desc' | 'settings_notif_latest_news_desc' }[] = [
  { key: 'dailyMotivationNotifications', titleKey: 'settings_daily_motivation', descKey: 'settings_daily_motivation_desc' },
  { key: 'partyWalkNotifications', titleKey: 'settings_notif_party_walk', descKey: 'settings_notif_party_walk_desc' },
  { key: 'challengesNotifications', titleKey: 'settings_notif_challenges', descKey: 'settings_notif_challenges_desc' },
  { key: 'friendsAndGiftsNotifications', titleKey: 'settings_notif_friends_gifts', descKey: 'settings_notif_friends_gifts_desc' },
  { key: 'latestNewsNotifications', titleKey: 'settings_notif_latest_news', descKey: 'settings_notif_latest_news_desc' },
]

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', padding: 2,
        background: checked ? '#22c55e' : '#e2e8f0',
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', display: 'block',
      }} />
    </button>
  )
}

export function SettingsPage() {
  const { t, locale, setLocale } = useLocale()
  const { volume, setVolume, sfxEnabled, setSfxEnabled } = useMusic()
  const { profile, toggleNotificationPref } = useProfile()
  const navigate = useNavigate()

  async function handleToggleNotifications(key: NotificationPrefKey) {
    const turningOn = !profile[key]
    if (turningOn && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    toggleNotificationPref(key)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc',
        padding: '20px 16px 14px', borderBottom: '1px solid #eef2f7',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/profile')}
          data-sfx="close"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: '#1e293b', padding: 0, lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{t('settings_title')}</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            {t('profile_language')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '4px 6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                style={{
                  fontSize: 13, fontWeight: locale === code ? 700 : 500,
                  padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: locale === code ? '#6366f1' : 'transparent',
                  color: locale === code ? 'white' : '#475569',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            {t('settings_music_volume')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>{volume === 0 ? '🔇' : '🔊'}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#6366f1' }}
            />
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            {t('settings_sound_effects')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>{sfxEnabled ? '🔊' : '🔇'}</span>
            <ToggleSwitch checked={sfxEnabled} onChange={() => setSfxEnabled(!sfxEnabled)} />
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            {t('settings_notifications')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '4px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column',
          }}>
            {NOTIFICATION_PREFS.map(({ key, titleKey, descKey }, i) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '14px 0',
                  borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {t(titleKey)}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {t(descKey)}
                  </div>
                </div>
                <ToggleSwitch checked={profile[key]} onChange={() => handleToggleNotifications(key)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
