import type { VisitRecord } from '@/types'

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
      background: 'white', borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: '#f0fdf4', border: '2px solid #bbf7d0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {CATEGORY_ICONS[visit.poiCategory] ?? '📍'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#1e293b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {visit.poiName}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {formatDate(visit.visitedAt)} · {formatTime(visit.visitedAt)}
        </div>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700, color: '#16a34a',
        background: '#f0fdf4', padding: '3px 8px', borderRadius: 10,
        flexShrink: 0,
      }}>
        +{visit.xpEarned} XP
      </div>
    </div>
  )
}
