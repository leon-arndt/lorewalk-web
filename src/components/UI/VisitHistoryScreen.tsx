import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { VisitHistoryItem } from '@/components/UI/VisitHistoryItem'
import type { VisitRecord } from '@/types'
import { paperSheet, SCRIM } from '@/lib/paper'
import { ink, line } from '@/lib/theme'
import { InkButton, Mono } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

const PAGE_SIZE = 20

interface Props {
  visits: VisitRecord[]
  onClose: () => void
}

export function VisitHistoryScreen({ visits, onClose }: Props) {
  const { t } = useLocale()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 75,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '90vh',
          ...paperSheet,
          borderRadius: '10px 10px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>

        <div style={{
          flexShrink: 0, margin: '0 20px', padding: '12px 0 10px', borderBottom: `1.5px dashed ${line}`,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>{t('profile_visit_history')}</div>
          <Mono>
            {t('profile_visit_history_count', { count: visits.length })}
          </Mono>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visits.slice(0, visibleCount).map((visit, i) => (
              <VisitHistoryItem key={`${visit.poiId}-${visit.visitedAt}-${i}`} visit={visit} />
            ))}
          </div>

          {visibleCount < visits.length && (
            <InkButton
              variant="paper"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{ display: 'block', width: '100%', marginTop: 12 }}
            >
              {t('profile_visit_history_load_more')}
            </InkButton>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
