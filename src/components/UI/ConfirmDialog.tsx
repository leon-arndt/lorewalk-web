import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { backdropIn, popSpring, tapScale } from '@/lib/motion'
import { InkButton } from '@/components/UI/Journal'
import { SCRIM } from '@/lib/paper'
import { ink, inkSoft, paperLight, edge } from '@/lib/theme'

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
          {...backdropIn(SCRIM)}
          exit={{ backgroundColor: 'rgba(51,40,30,0)', transition: { duration: 0.15 } }}
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
              width: '100%', maxWidth: 340, boxSizing: 'border-box', padding: '24px 20px 20px',
              background: paperLight, border: `1px solid ${edge}`, borderRadius: 10,
              boxShadow: '2px 3px 0 rgba(51,40,30,0.35)', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}
          >
            {icon && <div style={{ marginBottom: 4 }}>{icon}</div>}
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: ink, lineHeight: 1.25 }}>{title}</h2>
            {body && <p style={{ margin: 0, fontSize: 13, color: inkSoft, lineHeight: 1.45 }}>{body}</p>}
            <motion.div whileTap={tapScale} style={{ marginTop: 10, width: '100%', display: 'flex' }}>
              <InkButton variant={danger ? 'danger' : 'ink'} onClick={onConfirm} style={{ flex: 1 }}>
                {confirmLabel}
              </InkButton>
            </motion.div>
            <motion.div whileTap={tapScale} style={{ width: '100%', display: 'flex' }}>
              <InkButton variant="paper" data-sfx="close" onClick={onCancel} style={{ flex: 1 }}>
                {cancelLabel}
              </InkButton>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
