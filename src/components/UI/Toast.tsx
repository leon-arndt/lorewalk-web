import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReward } from '@/contexts/RewardContext'
import { stamp, edge } from '@/lib/theme'
import { paperTag } from '@/lib/paper'
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
      bottom: 'calc(env(safe-area-inset-bottom) + 194px)',
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
              ...paperTag,
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 44,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: 1.4,
              padding: '8px 16px 8px 12px',
              boxShadow: '2px 3px 0 rgba(51,40,30,0.3)',
              textAlign: 'left', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span aria-hidden style={{
              width: 10, height: 10, boxSizing: 'border-box', flexShrink: 0, borderRadius: '50%',
              border: `1px solid ${edge}`, background: stamp,
            }} />
            <span>{toast.message}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
