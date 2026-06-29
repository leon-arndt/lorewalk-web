import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { RewardConfig } from '@/types'

interface RewardContextValue {
  pendingReward: RewardConfig | null
  showReward: (config: RewardConfig) => void
  dismissReward: () => void
}

const RewardContext = createContext<RewardContextValue | null>(null)

export function RewardProvider({ children }: { children: ReactNode }) {
  const [pendingReward, setPendingReward] = useState<RewardConfig | null>(null)

  const showReward = useCallback((config: RewardConfig) => {
    setPendingReward(config)
  }, [])

  const dismissReward = useCallback(() => {
    setPendingReward(null)
  }, [])

  return (
    <RewardContext.Provider value={{ pendingReward, showReward, dismissReward }}>
      {children}
    </RewardContext.Provider>
  )
}

export function useReward(): RewardContextValue {
  const ctx = useContext(RewardContext)
  if (!ctx) throw new Error('useReward must be used within RewardProvider')
  return ctx
}
