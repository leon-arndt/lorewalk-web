import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isVibrationEnabled, setVibrationEnabled, vibrate } from '@/lib/haptics'
import { useLocale } from '@/contexts/LocaleContext'
import { useMusic } from '@/contexts/MusicContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useProfile } from '@/contexts/ProfileContext'
import type { NotificationPrefKey } from '@/types'
import { accent } from '@/lib/theme'
import { glassPage } from '@/lib/glass'
import { AccountSection } from '@/components/UI/AccountSection'
import { ConnectionStatus } from '@/components/UI/ConnectionStatus'
import { LanguageDropdown } from '@/components/UI/LanguageDropdown'

const NOTIFICATION_PREFS: { key: NotificationPrefKey; titleKey: 'settings_daily_motivation' | 'settings_notif_party_walk' | 'settings_notif_challenges' | 'settings_notif_friends_gifts' | 'settings_notif_latest_news'; descKey: 'settings_daily_motivation_desc' | 'settings_notif_party_walk_desc' | 'settings_notif_challenges_desc' | 'settings_notif_friends_gifts_desc' | 'settings_notif_latest_news_desc' }[] = [
  { key: 'dailyMotivationNotifications', titleKey: 'settings_daily_motivation', descKey: 'settings_daily_motivation_desc' },
  { key: 'partyWalkNotifications', titleKey: 'settings_notif_party_walk', descKey: 'settings_notif_party_walk_desc' },
  { key: 'challengesNotifications', titleKey: 'settings_notif_challenges', descKey: 'settings_notif_challenges_desc' },
  { key: 'friendsAndGiftsNotifications', titleKey: 'settings_notif_friends_gifts', descKey: 'settings_notif_friends_gifts_desc' },
  { key: 'latestNewsNotifications', titleKey: 'settings_notif_latest_news', descKey: 'settings_notif_latest_news_desc' },
]

declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string
declare const __BUILD_DATE__: string

const audioLabel: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#1e293b' }

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
  const { t } = useLocale()
  const { volume, setVolume, sfxVolume, setSfxVolume } = useMusic()
  const { profile, toggleNotificationPref } = useProfile()
  const { mode, setMode } = useConnectionMode()
  const navigate = useNavigate()
  const [vibration, setVibration] = useState(isVibrationEnabled)

  async function handleToggleNotifications(key: NotificationPrefKey) {
    const turningOn = !profile[key]
    if (turningOn && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    toggleNotificationPref(key)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', ...glassPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
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
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: accent }}>{t('settings_title')}</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AccountSection />

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
            {t('profile_language')}
          </h2>
          <LanguageDropdown />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
            {t('settings_sound_section')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 16, rowGap: 18,
          }}>
            <label htmlFor="settings-music" style={audioLabel}>{t('settings_music_volume')}</label>
            <input
              id="settings-music"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ width: '100%', minWidth: 0, accentColor: accent }}
            />
            <label htmlFor="settings-sfx" style={audioLabel}>{t('settings_sound_effects')}</label>
            <input
              id="settings-sfx"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              style={{ width: '100%', minWidth: 0, accentColor: accent }}
            />
            <span style={audioLabel}>{t('settings_vibration')}</span>
            <div style={{ justifySelf: 'end' }}>
              <ToggleSwitch
                checked={vibration}
                onChange={() => {
                  setVibrationEnabled(!vibration)
                  setVibration(!vibration)
                  if (!vibration) vibrate(30)
                }}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
            {t('settings_connection')}
          </h2>
          <div style={{
            background: 'white', borderRadius: 16, padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {t('settings_online_mode')}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {t('settings_online_mode_desc')}
                </div>
              </div>
              <ToggleSwitch checked={mode === 'online'} onChange={() => setMode(mode === 'online' ? 'offline' : 'online')} />
            </div>
            {mode === 'online' && <ConnectionStatus />}
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
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

        {/* The page is glass over the map, so a white halo keeps the text legible on any tile. */}
        <p
          style={{
            margin: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#334155',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 2px #fff, 0 0 4px #fff, 0 1px 1px rgba(255,255,255,0.9)',
          }}
        >
          v{__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_DATE__}
        </p>
      </div>
    </div>
  )
}
