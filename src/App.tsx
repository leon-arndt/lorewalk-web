import { Component, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionModeProvider } from '@/contexts/ConnectionModeContext'
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { MusicProvider } from '@/contexts/MusicContext'
import { RewardProvider } from '@/contexts/RewardContext'
import { playClickSfx, playCloseSfx } from '@/lib/sfx'
import { BottomNav } from '@/components/UI/BottomNav'
import { CoinCapsule } from '@/components/UI/CoinCapsule'
import { LevelUpScreen } from '@/components/UI/LevelUpScreen'
import { RewardScreen } from '@/components/UI/RewardScreen'
import { MapPage } from '@/pages/MapPage'
import { CreaturesPage } from '@/pages/CreaturesPage'
import { SquadsPage } from '@/pages/SquadsPage'
import { ShopPage } from '@/pages/ShopPage'
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

// One delegated listener covers every button/link in the app, including ones
// added later - no per-component wiring needed. Elements tagged data-sfx="close"
// (panel close/back buttons) get the distinct close sound; everything else gets
// the default click.
function useGlobalClickSfx() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-sfx], button, a[href], [role="button"]')
      if (!target) return
      if (target.getAttribute('data-sfx') === 'close') playCloseSfx()
      else playClickSfx()
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
        <RewardProvider>
          <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Routes>
                  <Route path="/" element={<MapErrorBoundary><MapPage /></MapErrorBoundary>} />
                  <Route path="/creatures" element={<CreaturesPage />} />
                  <Route path="/squads" element={<SquadsPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/customize" element={<CharacterCustomizationPage />} />
                </Routes>
              </div>
              <CoinCapsule />
            </div>
            <BottomNav />
            <LevelUpOverlay />
            <RewardScreen />
          </BrowserRouter>
        </RewardProvider>
      </ProfileProvider>
    </ConnectionModeProvider>
    </MusicProvider>
    </LocaleProvider>
  )
}
