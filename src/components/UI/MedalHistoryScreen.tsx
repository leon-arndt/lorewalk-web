import { MedalSvg } from '@/components/UI/MedalSvg'
import { getMedalConfig } from '@/data/medals'
import { currentMonthKey } from '@/lib/profile'
import type { EarnedMedal } from '@/types'
import { pageBackground } from '@/lib/glass'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  medals: EarnedMedal[]
  createdAt: string
  onSelectMonth: (monthKey: string, earned: EarnedMedal | undefined) => void
  onClose: () => void
}

export function MedalHistoryScreen({ medals, createdAt, onSelectMonth, onClose }: Props) {
  const currentYear = new Date().getFullYear()
  const firstYear = new Date(createdAt).getFullYear()
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i)
  const byMonthKey = new Map(medals.map((m) => [m.monthKey, m]))
  const nowKey = currentMonthKey()

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
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Monthly medals</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>All months, sorted by year</div>
        </div>

        <div style={{ overflowY: 'auto', padding: '4px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          {years.map((year) => (
            <div key={year} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#78350f', marginBottom: 10 }}>{year}</div>
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
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      }}
                    >
                      <div style={{ filter: earned ? undefined : 'grayscale(1)', opacity: earned ? 1 : 0.4 }}>
                        <MedalSvg config={cfg} size={56} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
