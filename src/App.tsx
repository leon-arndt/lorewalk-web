import { Component, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionModeProvider } from '@/contexts/ConnectionModeContext'
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { MusicProvider } from '@/contexts/MusicContext'
import { RewardProvider, useReward } from '@/contexts/RewardContext'
import { PlayerLocationProvider } from '@/contexts/PlayerLocationContext'
import { useLocale } from '@/contexts/LocaleContext'
import { playSfx } from '@/lib/sfx'
import { BottomNav } from '@/components/UI/BottomNav'
import { LevelUpScreen } from '@/components/UI/LevelUpScreen'
import { RewardScreen } from '@/components/UI/RewardScreen'
import { Toast } from '@/components/UI/Toast'
import { MapPage } from '@/pages/MapPage'
import { CreaturesPage } from '@/pages/CreaturesPage'
import { SquadsPage } from '@/pages/SquadsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CharacterCustomizationPage } from '@/pages/CharacterCustomizationPage'

class MapErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#94a3b8', fontSize: 14 }}>
        <span style={{ fontSize: 40 }}>🗺</span>
        Map unavailable
      </div>
    )
    return this.props.children
  }
}

function LevelUpOverlay() {
  const { pendingLevelUp, dismissLevelUp } = useProfile()
  if (!pendingLevelUp) return null
  return <LevelUpScreen level={pendingLevelUp.level} rewards={pendingLevelUp.rewards} onDismiss={dismissLevelUp} />
}

// Steps count on every tab, so the "egg ready" notice lives here, not on the map.
function EggReadyToast() {
  const { justReady, clearJustReady } = useProfile()
  const { showToast } = useReward()
  const { t } = useLocale()
  useEffect(() => {
    if (justReady.length === 0) return
    showToast(
      justReady.length === 1
        ? t('toast_egg_ready_one', { name: justReady[0].poiName })
        : t('toast_egg_ready_many', { n: justReady.length }),
      { to: '/creatures' },
    )
    clearJustReady()
  }, [justReady, clearJustReady, showToast, t])
  return null
}

// One delegated listener covers every button/link in the app, including ones
// added later - no per-component wiring needed. Elements tagged data-sfx="close"
// (panel close/back buttons) get the distinct close sound; everything else gets
// the default click. A data-sfx value with a slash is a full soundbank event id
// ("poi/checkin"); a bare one is shorthand for the "ui/" namespace.
function useGlobalClickSfx() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-sfx], button, a[href], [role="button"]')
      if (!target) return
      const tag = target.getAttribute('data-sfx')
      playSfx(tag ? (tag.includes('/') ? tag : `ui/${tag}`) : 'ui/click')
    }
    // Capture phase so this still fires even when a panel's content wrapper calls
    // stopPropagation() on click to guard its backdrop-dismiss handler.
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])
}

export default function App() {
  useGlobalClickSfx()
  return (
    <LocaleProvider>
    <MusicProvider>
    <ConnectionModeProvider>
      <ProfileProvider>
        <PlayerLocationProvider>
        <RewardProvider>
          <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Routes>
                  <Route path="/" element={<MapErrorBoundary><MapPage /></MapErrorBoundary>} />
                  <Route path="/creatures" element={<CreaturesPage />} />
                  <Route path="/squads" element={<SquadsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/customize" element={<CharacterCustomizationPage />} />
                </Routes>
              </div>
            </div>
            <BottomNav />
            <LevelUpOverlay />
            <RewardScreen />
            <Toast />
            <EggReadyToast />
          </BrowserRouter>
        </RewardProvider>
        </PlayerLocationProvider>
      </ProfileProvider>
    </ConnectionModeProvider>
    </MusicProvider>
    </LocaleProvider>
  )
}
