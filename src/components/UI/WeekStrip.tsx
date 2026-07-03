import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'
import { glassPanel } from '@/lib/glass'
import { StepRing } from '@/components/UI/StepRing'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// This week's step rings, pinned to the top of the map. Tap to open the full
// journal calendar. Mirrors Pikmin Bloom's home-screen diary strip.
export function WeekStrip({ dailySteps = {}, onOpen }: {
  dailySteps?: Record<string, number>
  onOpen: () => void
}) {
  const now = new Date()
  const todayKey = localDateKey(now)
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
    const key = localDateKey(d)
    return {
      key,
      date: d.getDate(),
      dow: WEEKDAYS[i],
      steps: dailySteps[key] ?? 0,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }
  })

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', border: 'none', cursor: 'pointer',
        ...glassPanel, borderRadius: 18, padding: '8px 6px',
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {days.map((d) => {
        const goalMet = d.steps >= DAILY_STEP_GOAL
        return (
          <div key={d.key} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            opacity: d.isFuture ? 0.4 : 1,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: d.isToday ? '#6366f1' : '#94a3b8' }}>{d.dow}</span>
            <StepRing progress={d.steps / DAILY_STEP_GOAL} size={30} stroke={3}>
              {goalMet
                ? <span style={{ fontSize: 12 }}>😄</span>
                : <span style={{ fontSize: 10, fontWeight: 700, color: d.isToday ? '#6366f1' : '#475569' }}>{d.date}</span>}
            </StepRing>
          </div>
        )
      })}
    </button>
  )
}
