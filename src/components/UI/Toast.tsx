import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReward } from '@/contexts/RewardContext'
import { rewardGradient } from '@/lib/theme'
import { AnimatePresence, motion } from 'motion/react'
import { popSpring } from '@/lib/motion'

const TOAST_MS = 4000

export function Toast() {
  const { toast, dismissToast } = useReward()
  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16,
      bottom: 'calc(env(safe-area-inset-bottom) + 144px)',
      display: 'flex', justifyContent: 'center',
      zIndex: 10000, pointerEvents: 'none',
    }}>
      <AnimatePresence mode="wait">
        {toast && (
          <motion.button
            key={toast.id}
            initial={{ y: 40, scale: 0.6, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.8, opacity: 0, transition: { duration: 0.18 } }}
            transition={popSpring}
            role="status"
            onClick={() => {
              if (toast.to) navigate(toast.to)
              dismissToast()
            }}
            style={{
              pointerEvents: 'auto',
              background: rewardGradient,
              color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.4,
              padding: '10px 20px', borderRadius: 24, border: 'none',
              boxShadow: '0 4px 16px rgba(129,140,248,0.45)',
              textAlign: 'center', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {toast.message}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
