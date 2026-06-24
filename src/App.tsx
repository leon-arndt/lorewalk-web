import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionModeProvider } from '@/contexts/ConnectionModeContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { MusicProvider } from '@/contexts/MusicContext'
import { BottomNav } from '@/components/UI/BottomNav'
import { CoinCapsule } from '@/components/UI/CoinCapsule'
import { MapPage } from '@/pages/MapPage'
import { CreaturesPage } from '@/pages/CreaturesPage'
import { SquadsPage } from '@/pages/SquadsPage'
import { ShopPage } from '@/pages/ShopPage'
import { ProfilePage } from '@/pages/ProfilePage'

export default function App() {
  return (
    <LocaleProvider>
    <MusicProvider>
    <ConnectionModeProvider>
      <ProfileProvider>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Routes>
                <Route path="/" element={<MapPage />} />
                <Route path="/creatures" element={<CreaturesPage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </div>
            <CoinCapsule />
          </div>
          <BottomNav />
        </BrowserRouter>
      </ProfileProvider>
    </ConnectionModeProvider>
    </MusicProvider>
    </LocaleProvider>
  )
}
