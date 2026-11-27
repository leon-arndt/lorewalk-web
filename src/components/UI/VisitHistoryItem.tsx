import type { VisitRecord } from '@/types'
import { Mono } from '@/components/UI/Journal'
import { paperCardStyle } from '@/lib/paper'
import { categoryCss, forest, ink } from '@/lib/theme'

const CATEGORY_ICONS: Record<string, string> = {
  heritage: '🏛', nature: '🌿', religious: '🕌',
  museum: '🎨', landmark: '📍', arts: '🎭',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-SG', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function VisitHistoryItem({ visit }: { visit: VisitRecord }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      ...paperCardStyle, padding: '10px 12px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `${categoryCss(visit.poiCategory)}40`, border: `1.5px solid ${ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {CATEGORY_ICONS[visit.poiCategory] ?? '📍'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {visit.poiName}
        </div>
        <Mono style={{ display: 'block', marginTop: 1 }}>
          {formatDate(visit.visitedAt)} · {formatTime(visit.visitedAt)}
        </Mono>
      </div>
      <Mono style={{ flexShrink: 0, fontWeight: 500, color: forest }}>
        +{visit.xpEarned} XP
      </Mono>
    </div>
  )
}
