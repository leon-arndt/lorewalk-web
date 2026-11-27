import { Component, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ConnectionModeProvider } from '@/contexts/ConnectionModeContext'
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { MusicProvider } from '@/contexts/MusicContext'
import { RewardProvider, useReward } from '@/contexts/RewardContext'
import { PlayerLocationProvider } from '@/contexts/PlayerLocationContext'
import { useLocale } from '@/contexts/LocaleContext'
import { playSfx } from '@/lib/sfx'
import { installPressFeedback } from '@/lib/ripple'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { BottomNav } from '@/components/UI/BottomNav'
import { LevelUpScreen } from '@/components/UI/LevelUpScreen'
import { RewardScreen } from '@/components/UI/RewardScreen'
import { Toast } from '@/components/UI/Toast'
import { CloudConflictDialog } from '@/components/UI/CloudConflictDialog'
import { MapPage } from '@/pages/MapPage'
import { CreaturesPage } from '@/pages/CreaturesPage'
import { SquadsPage } from '@/pages/SquadsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CharacterCustomizationPage } from '@/pages/CharacterCustomizationPage'

function MapUnavailable() {
  // The map sits under every tab, so its fallback shows only on the map tab.
  if (useLocation().pathname !== '/') return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#75634C', fontSize: 14 }}>
      <span style={{ fontSize: 40 }}>🗺</span>
      Map unavailable
    </div>
  )
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return <MapUnavailable />
    return this.props.children
  }
}

// Tabs slide in from the side they sit on in the nav. Between two tabs the old
// page leaves at once, so only one page is ever in the DOM; back to the map it
// slides away and uncovers the map.
const ROUTE_ORDER = ['/', '/creatures', '/squads', '/profile', '/settings', '/customize']
const pageSpring = { type: 'spring', stiffness: 380, damping: 38 } as const
type PageDir = { dir: number; toMap: boolean }
const pageVariants = {
  enter: ({ dir }: PageDir) => ({ x: `${dir * 100}%` }),
  center: { x: 0 },
  exit: ({ dir, toMap }: PageDir) => (toMap
    ? { x: `${dir * -100}%`, transition: pageSpring }
    : { opacity: 0, transition: { duration: 0 } }),
}

function AnimatedRoutes() {
  const location = useLocation()
  const { pathname } = location
  const [prev, setPrev] = useState(pathname)
  const [dir, setDir] = useState(1)
  if (prev !== pathname) {
    setDir(ROUTE_ORDER.indexOf(pathname) >= ROUTE_ORDER.indexOf(prev) ? 1 : -1)
    setPrev(pathname)
  }
  const custom: PageDir = { dir, toMap: pathname === '/' }
  return (
    <AnimatePresence initial={false} custom={custom}>
      {ROUTE_ORDER.indexOf(pathname) > 0 && (
        <motion.div
          key={pathname}
          custom={custom}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={pageSpring}
          // Above the map's own controls (the credit button), which sit at z-index 2.
          style={{ position: 'absolute', inset: 0, zIndex: 10 }}
        >
          <Routes location={location}>
            <Route path="/creatures" element={<CreaturesPage />} />
            <Route path="/squads" element={<SquadsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/customize" element={<CharacterCustomizationPage />} />
          </Routes>
        </motion.div>
      )}
    </AnimatePresence>
  )
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

// A paid coin pack arrives through the server, sometimes a while after the
// purchase or on another device, so the notice lives here, not in the shop.
function CoinsDeliveredToast() {
  const { coinsDelivered, clearCoinsDelivered } = useProfile()
  const { showToast } = useReward()
  const { t } = useLocale()
  useEffect(() => {
    if (coinsDelivered === 0) return
    showToast(t('shop_coins_delivered', { coins: coinsDelivered }))
    clearCoinsDelivered()
  }, [coinsDelivered, clearCoinsDelivered, showToast, t])
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
  useEffect(installPressFeedback, [])
  return (
    <MotionConfig reducedMotion="user">
    <LocaleProvider>
    <MusicProvider>
    <ConnectionModeProvider>
      <ProfileProvider>
        <PlayerLocationProvider>
        <RewardProvider>
          <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {/* Mounted on every route: the other tabs are paper pages that cover it. */}
                <MapErrorBoundary><MapPage /></MapErrorBoundary>
                <AnimatedRoutes />
              </div>
            </div>
            <BottomNav />
            <LevelUpOverlay />
            <RewardScreen />
            <Toast />
            <EggReadyToast />
            <CoinsDeliveredToast />
            <CloudConflictDialog />
          </BrowserRouter>
        </RewardProvider>
        </PlayerLocationProvider>
      </ProfileProvider>
    </ConnectionModeProvider>
    </MusicProvider>
    </LocaleProvider>
    </MotionConfig>
  )
}
