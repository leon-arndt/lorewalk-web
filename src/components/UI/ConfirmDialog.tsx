import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { backdropIn, popSpring, tapScale } from '@/lib/motion'
import { accent } from '@/lib/theme'

// In-game replacement for window.confirm. `danger` paints the confirm button
// red, for an action that destroys something, such as a creature release.
// It renders on document.body, so a page's stacking context cannot put the
// bottom nav above it.
export function ConfirmDialog({ open, icon, title, body, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: {
  open: boolean
  icon?: React.ReactNode
  title: string
  body?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          {...backdropIn('rgba(15,23,42,0.55)')}
          exit={{ backgroundColor: 'rgba(15,23,42,0)', transition: { duration: 0.15 } }}
          onClick={onCancel}
          style={{
            position: 'fixed', inset: 0, zIndex: 4000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.12 } }}
            transition={popSpring}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, background: 'white', borderRadius: 24, padding: '24px 20px 20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}
          >
            {icon && <div style={{ marginBottom: 4 }}>{icon}</div>}
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>{title}</h2>
            {body && <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.45 }}>{body}</p>}
            <motion.button
              whileTap={tapScale}
              onClick={onConfirm}
              style={{
                marginTop: 10, width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                fontWeight: 800, fontSize: 15, color: 'white', cursor: 'pointer',
                background: danger ? '#dc2626' : accent,
                boxShadow: danger ? '0 4px 14px rgba(220,38,38,0.35)' : '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              {confirmLabel}
            </motion.button>
            <motion.button
              whileTap={tapScale}
              data-sfx="close"
              onClick={onCancel}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 14, border: 'none',
                fontWeight: 700, fontSize: 14, background: '#f1f5f9', color: '#475569', cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
