import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionModeProvider } from '@/contexts/ConnectionModeContext'
import { BottomNav } from '@/components/UI/BottomNav'
import { MapPage } from '@/pages/MapPage'
import { CreaturesPage } from '@/pages/CreaturesPage'
import { ExpeditionsPage } from '@/pages/ExpeditionsPage'
import { ProfilePage } from '@/pages/ProfilePage'

export default function App() {
  return (
    <ConnectionModeProvider>
      <BrowserRouter>
        <div className="flex flex-col h-full">
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/creatures" element={<CreaturesPage />} />
            <Route path="/expeditions" element={<ExpeditionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ConnectionModeProvider>
  )
}
