import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RewardConfig } from '@/types'

// Two feedback patterns cover the whole app: the full reward screen for a real
// payout, and a toast for a small update. `to` makes the toast tappable.
export interface ToastConfig {
  id: number
  message: string
  to?: string
}

interface RewardContextValue {
  pendingReward: RewardConfig | null
  showReward: (config: RewardConfig) => void
  dismissReward: () => void
  toast: ToastConfig | null
  showToast: (message: string, options?: { to?: string }) => void
  dismissToast: () => void
}

const RewardContext = createContext<RewardContextValue | null>(null)

export function RewardProvider({ children }: { children: ReactNode }) {
  const [pendingReward, setPendingReward] = useState<RewardConfig | null>(null)
  const [toast, setToast] = useState<ToastConfig | null>(null)
  const toastId = useRef(0)

  const showReward = useCallback((config: RewardConfig) => {
    setPendingReward(config)
  }, [])

  const dismissReward = useCallback(() => {
    setPendingReward(null)
  }, [])

  const showToast = useCallback((message: string, options?: { to?: string }) => {
    toastId.current += 1
    setToast({ id: toastId.current, message, to: options?.to })
  }, [])

  const dismissToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <RewardContext.Provider value={{ pendingReward, showReward, dismissReward, toast, showToast, dismissToast }}>
      {children}
    </RewardContext.Provider>
  )
}

export function useReward(): RewardContextValue {
  const ctx = useContext(RewardContext)
  if (!ctx) throw new Error('useReward must be used within RewardProvider')
  return ctx
}
