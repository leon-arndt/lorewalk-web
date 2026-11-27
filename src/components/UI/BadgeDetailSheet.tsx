import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { paperSheet, SCRIM } from '@/lib/paper'
import { ink, inkSoft, line, ochre, paperCard } from '@/lib/theme'
import { InkButton, Stamp } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

interface Props {
  icon: ReactNode
  name: string
  description: string
  status: string
  statusColor: string
  onClose: () => void
}

// One achievement in a grid. An unlocked one is a small specimen card. A locked
// one is a pencil outline, like a slot the explorer has not filled yet.
export function AchievementCard({ icon, name, unlocked, tilt = 0, onClick }: {
  icon: string
  name: string
  unlocked: boolean
  tilt?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 0, minHeight: 44, padding: 5, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4,
        background: unlocked ? paperCard : 'transparent',
        border: unlocked ? `1px solid ${line}` : '1.5px dashed #8C7A5C',
        boxShadow: unlocked ? '1px 2px 0 rgba(51,40,30,0.18)' : undefined,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: unlocked ? `${ochre}33` : undefined,
      }}>
        <span style={{ fontSize: 26, lineHeight: 1, filter: unlocked ? undefined : 'grayscale(1)', opacity: unlocked ? 1 : 0.45 }}>
          {icon}
        </span>
      </span>
      <span style={{
        minHeight: 28, fontSize: 11, fontWeight: 500, lineHeight: '14px', textAlign: 'center',
        color: unlocked ? ink : inkSoft, overflowWrap: 'anywhere',
      }}>
        {name}
      </span>
    </button>
  )
}

export function BadgeDetailSheet({ icon, name, description, status, statusColor, onClose }: Props) {
  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '80vh',
          ...paperSheet,
          borderRadius: '10px 10px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 24px calc(28px + env(safe-area-inset-bottom))', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0 16px' }}>
            <div style={{
              padding: 14, background: paperCard, border: `1px solid ${line}`, borderRadius: 3,
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)', transform: 'rotate(-1.5deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>
              {icon}
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: '28px', color: ink }}>{name}</div>

          <p style={{ margin: '8px 0 0', fontSize: 14, color: inkSoft, lineHeight: 1.5 }}>
            {description}
          </p>

          <div style={{ marginTop: 16 }}>
            <Stamp color={statusColor} tilt={-2}>
              {status}
            </Stamp>
          </div>

          <InkButton variant="paper" onClick={onClose} data-sfx="close" style={{ width: '100%', marginTop: 24 }}>
            Close
          </InkButton>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
