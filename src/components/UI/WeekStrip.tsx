import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'
import { MONO, paperTag } from '@/lib/paper'
import { StepRing } from '@/components/UI/StepRing'
import { forest, ink, inkHint } from '@/lib/theme'

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
        width: '100%', cursor: 'pointer',
        ...paperTag, padding: '7px 6px', fontFamily: 'inherit',
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
            <span style={{ fontFamily: MONO, fontSize: 11, lineHeight: '13px', fontWeight: d.isToday ? 500 : 400, color: d.isToday ? ink : inkHint }}>{d.dow}</span>
            <StepRing progress={d.steps / DAILY_STEP_GOAL} size={30} stroke={3}>
              {goalMet
                ? <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={forest} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11" /></svg>
                : <span style={{ fontSize: 11, fontWeight: d.isToday ? 600 : 500, color: ink }}>{d.date}</span>}
            </StepRing>
          </div>
        )
      })}
    </button>
  )
}
