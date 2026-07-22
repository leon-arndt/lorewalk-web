import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { VisitHistoryItem } from '@/components/UI/VisitHistoryItem'
import type { VisitRecord } from '@/types'
import { pageBackground } from '@/lib/glass'

const PAGE_SIZE = 20

interface Props {
  visits: VisitRecord[]
  onClose: () => void
}

export function VisitHistoryScreen({ visits, onClose }: Props) {
  const { t } = useLocale()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 75,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '90vh',
          background: pageBackground,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>

        <div style={{ flexShrink: 0, padding: '14px 20px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{t('profile_visit_history')}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {t('profile_visit_history_count', { count: visits.length })}
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '4px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visits.slice(0, visibleCount).map((visit, i) => (
              <VisitHistoryItem key={`${visit.poiId}-${visit.visitedAt}-${i}`} visit={visit} />
            ))}
          </div>

          {visibleCount < visits.length && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{
                display: 'block', width: '100%', marginTop: 12, padding: '12px',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
                fontSize: 13, fontWeight: 700, color: '#1e293b', cursor: 'pointer',
              }}
            >
              {t('profile_visit_history_load_more')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
