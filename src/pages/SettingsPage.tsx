import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isVibrationEnabled, setVibrationEnabled, vibrate } from '@/lib/haptics'
import { useLocale } from '@/contexts/LocaleContext'
import { useMusic } from '@/contexts/MusicContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useProfile } from '@/contexts/ProfileContext'
import { usePlayerLocation } from '@/contexts/PlayerLocationContext'
import type { NotificationPrefKey } from '@/types'
import { forest, ink, inkHint, line, paperCard, paperLight, paperShade, stamp, edge } from '@/lib/theme'
import { paperCardStyle, paperPage } from '@/lib/paper'
import { BackButton, Mono, SectionTitle } from '@/components/UI/Journal'
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

const HAIRLINE = `1px solid ${line}`
const rowTitle: React.CSSProperties = { fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink }
const rowNote: React.CSSProperties = { display: 'block', marginTop: 2, fontSize: 12, lineHeight: '16px' }
const slider: React.CSSProperties = { width: '100%', minWidth: 0, height: 44, margin: 0, accentColor: ink, cursor: 'pointer' }

// An ink-outlined switch. The button is 44 px tall for the finger, and the track
// inside it is the part that shows. The knob slides, so it needs no ripple.
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      data-no-ripple
      style={{
        width: 50, height: 44, padding: 0, border: 'none', background: 'none',
        cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        width: 50, height: 28, boxSizing: 'border-box', borderRadius: 10, padding: 2,
        border: `1.5px solid ${ink}`, background: checked ? forest : paperShade,
        display: 'flex', alignItems: 'center', transition: 'background 0.15s',
      }}>
        <span style={{
          width: 21, height: 21, boxSizing: 'border-box', borderRadius: 6, display: 'block',
          background: paperCard, border: `1px solid ${edge}`,
          transform: checked ? 'translateX(22px)' : 'none', transition: 'transform 0.15s',
        }} />
      </span>
    </button>
  )
}

function Divider() {
  return <div aria-hidden style={{ gridColumn: '1 / -1', borderTop: HAIRLINE }} />
}

export function SettingsPage() {
  const { t } = useLocale()
  const { volume, setVolume, sfxVolume, setSfxVolume } = useMusic()
  const { profile, toggleNotificationPref } = useProfile()
  const { mode, setMode } = useConnectionMode()
  const navigate = useNavigate()
  const [vibration, setVibration] = useState(isVibrationEnabled)
  const { healthSteps } = usePlayerLocation()
  const [healthDenied, setHealthDenied] = useState(false)

  async function handleToggleHealthSteps() {
    const ok = await healthSteps.setEnabled(!healthSteps.enabled)
    setHealthDenied(!ok)
  }

  async function handleToggleNotifications(key: NotificationPrefKey) {
    const turningOn = !profile[key]
    if (turningOn && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    toggleNotificationPref(key)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: paperLight,
        padding: 'calc(env(safe-area-inset-top) + 16px) 16px 10px', borderBottom: `1px solid ${edge}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <BackButton onClick={() => navigate('/profile')} style={{ marginLeft: -4 }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '30px', letterSpacing: '-0.01em', color: ink }}>{t('settings_title')}</h1>
          <span aria-hidden style={{ display: 'block', width: 36, height: 3, borderRadius: 2, background: stamp, marginTop: 1 }} />
        </div>
      </div>

      <div style={{ padding: '22px 16px 20px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <AccountSection />

        <section>
          <SectionTitle>{t('profile_language')}</SectionTitle>
          <LanguageDropdown />
        </section>

        <section>
          <SectionTitle>{t('settings_sound_section')}</SectionTitle>
          <div style={{
            ...paperCardStyle, padding: '4px 14px',
            display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 16,
          }}>
            <label htmlFor="settings-music" style={rowTitle}>{t('settings_music_volume')}</label>
            <input
              id="settings-music"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={slider}
            />
            <Divider />
            <label htmlFor="settings-sfx" style={rowTitle}>{t('settings_sound_effects')}</label>
            <input
              id="settings-sfx"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              style={slider}
            />
            <Divider />
            <span style={rowTitle}>{t('settings_vibration')}</span>
            <div style={{ justifySelf: 'end', padding: '4px 0' }}>
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

        {healthSteps.available && (
          <section>
            <SectionTitle>{t('settings_steps_section')}</SectionTitle>
            <div style={{ ...paperCardStyle, padding: '0 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={rowTitle}>{t('settings_health_steps')}</div>
                  <Mono style={rowNote}>{t('settings_health_steps_desc')}</Mono>
                </div>
                <ToggleSwitch checked={healthSteps.enabled} onChange={handleToggleHealthSteps} />
              </div>
              {healthDenied && (
                <Mono style={{ ...rowNote, margin: 0, padding: '10px 0', borderTop: HAIRLINE, color: stamp }}>
                  {t('settings_health_steps_denied')}
                </Mono>
              )}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>{t('settings_connection')}</SectionTitle>
          <div style={{ ...paperCardStyle, padding: '0 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0' }}>
              <div style={{ minWidth: 0 }}>
                <div style={rowTitle}>{t('settings_online_mode')}</div>
                <Mono style={rowNote}>{t('settings_online_mode_desc')}</Mono>
              </div>
              <ToggleSwitch checked={mode === 'online'} onChange={() => setMode(mode === 'online' ? 'offline' : 'online')} />
            </div>
            {mode === 'online' && (
              <div style={{ borderTop: HAIRLINE, padding: '10px 0' }}>
                <ConnectionStatus />
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>{t('settings_notifications')}</SectionTitle>
          <div style={{ ...paperCardStyle, padding: '0 14px', display: 'flex', flexDirection: 'column' }}>
            {NOTIFICATION_PREFS.map(({ key, titleKey, descKey }, i) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 0',
                  borderTop: i > 0 ? HAIRLINE : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={rowTitle}>{t(titleKey)}</div>
                  <Mono style={rowNote}>{t(descKey)}</Mono>
                </div>
                <ToggleSwitch checked={profile[key]} onChange={() => handleToggleNotifications(key)} />
              </div>
            ))}
          </div>
        </section>

        <p style={{ margin: 0, textAlign: 'center' }}>
          <Mono style={{ color: inkHint, fontVariantNumeric: 'tabular-nums' }}>
            v{__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_DATE__}
          </Mono>
        </p>
      </div>
    </div>
  )
}
