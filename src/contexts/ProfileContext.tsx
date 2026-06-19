import { createContext, useContext, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { PlayerProfile, Poi } from '@/types'
import {
  loadProfile, saveProfile,
  applyXp, updateStreak, checkAchievements,
} from '@/lib/profile'

interface ProfileContextValue {
  profile: PlayerProfile
  visitedPois: Set<string>
  addVisit: (poi: Poi) => void
  setDisplayName: (name: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile)

  const visitedPois = useMemo(
    () => new Set(profile.visitHistory.map((v) => v.poiId)),
    [profile.visitHistory],
  )

  function addVisit(poi: Poi) {
    if (visitedPois.has(poi.id)) return

    const xpGained = poi.points ?? 5

    const { level, xp } = applyXp(profile.level, profile.xp, xpGained)
    const { streakDays, lastVisitDate } = updateStreak(profile.lastVisitDate, profile.streakDays)

    const newHistory = [
      {
        poiId: poi.id,
        poiName: poi.name,
        poiCategory: poi.category ?? 'landmark',
        visitedAt: new Date().toISOString(),
        xpEarned: xpGained,
      },
      ...profile.visitHistory,
    ]

    const updatedAchievements = checkAchievements(
      profile.achievements,
      newHistory,
      level,
      streakDays,
    )

    const updated: PlayerProfile = {
      ...profile,
      level,
      xp,
      totalXp: profile.totalXp + xpGained,
      visitHistory: newHistory,
      achievements: updatedAchievements,
      lastVisitDate,
      streakDays,
    }

    setProfile(updated)
    saveProfile(updated)
  }

  function setDisplayName(name: string) {
    const updated = { ...profile, displayName: name.trim() || 'Explorer' }
    setProfile(updated)
    saveProfile(updated)
  }

  return (
    <ProfileContext.Provider value={{ profile, visitedPois, addVisit, setDisplayName }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
