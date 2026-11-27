import { createPortal } from 'react-dom'
import { MedalSvg } from '@/components/UI/MedalSvg'
import { getMedalConfig } from '@/data/medals'
import { useLocale } from '@/contexts/LocaleContext'
import { currentMonthKey } from '@/lib/profile'
import type { EarnedMedal } from '@/types'
import { paperSheet, SCRIM } from '@/lib/paper'
import { ink, line } from '@/lib/theme'
import { Mono } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  medals: EarnedMedal[]
  createdAt: string
  onSelectMonth: (monthKey: string, earned: EarnedMedal | undefined) => void
  onClose: () => void
}

export function MedalHistoryScreen({ medals, createdAt, onSelectMonth, onClose }: Props) {
  const { t } = useLocale()
  const currentYear = new Date().getFullYear()
  const firstYear = new Date(createdAt).getFullYear()
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i)
  const byMonthKey = new Map(medals.map((m) => [m.monthKey, m]))
  const nowKey = currentMonthKey()

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

        <div style={{ flexShrink: 0, margin: '0 20px', padding: '12px 0 10px', borderBottom: `1px solid ${line}` }}>
          <div style={{ fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>{t('medal_history_title')}</div>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          {years.map((year) => (
            <div key={year} style={{ marginBottom: 22 }}>
              <Mono style={{ display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 500, letterSpacing: '0.12em', color: ink }}>{year}</Mono>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {MONTH_ABBR.map((label, i) => {
                  const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
                  if (monthKey > nowKey) return null
                  const cfg = getMedalConfig(monthKey)
                  const earned = byMonthKey.get(monthKey)
                  if (!cfg) return null
                  return (
                    <button
                      key={monthKey}
                      onClick={() => onSelectMonth(monthKey, earned)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 44,
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ filter: earned ? undefined : 'grayscale(1)', opacity: earned ? 1 : 0.4 }}>
                        <MedalSvg config={cfg} size={56} />
                      </div>
                      <Mono style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Mono>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
