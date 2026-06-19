import { createContext, useContext, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { HatchedCreature, PlayerProfile, Poi } from '@/types'
import {
  loadProfile, saveProfile,
  applyXp, updateStreak, checkAchievements,
  createEgg, advanceEggs, hatchEgg,
} from '@/lib/profile'

interface ProfileContextValue {
  profile: PlayerProfile
  visitedPois: Set<string>
  addVisit: (poi: Poi) => void
  setDisplayName: (name: string) => void
  justHatched: HatchedCreature[]
  clearJustHatched: () => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile)
  const [justHatched, setJustHatched] = useState<HatchedCreature[]>([])

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

    // Advance all active eggs; split newly-hatched from still-incubating
    const { incubating, hatched } = advanceEggs(profile.eggs)
    const newCreatures = hatched.map(hatchEgg)

    // Award a new egg from this POI if a slot is available
    const maxSlots = profile.maxEggSlots
    const updatedEggs =
      incubating.length < maxSlots
        ? [...incubating, createEgg(poi)]
        : incubating

    const updated: PlayerProfile = {
      ...profile,
      level,
      xp,
      totalXp: profile.totalXp + xpGained,
      visitHistory: newHistory,
      achievements: updatedAchievements,
      lastVisitDate,
      streakDays,
      eggs: updatedEggs,
      hatchedCreatures: [...profile.hatchedCreatures, ...newCreatures],
    }

    setProfile(updated)
    saveProfile(updated)

    if (newCreatures.length > 0) setJustHatched(newCreatures)
  }

  function setDisplayName(name: string) {
    const updated = { ...profile, displayName: name.trim() || 'Explorer' }
    setProfile(updated)
    saveProfile(updated)
  }

  function clearJustHatched() {
    setJustHatched([])
  }

  return (
    <ProfileContext.Provider value={{ profile, visitedPois, addVisit, setDisplayName, justHatched, clearJustHatched }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
