import { forest, indigo, ink, ochre, paperCard, stamp } from '@/lib/theme'
import { MONO } from '@/lib/paper'

// One ink colour for each of the first tokens, so they read as a set. Every
// token from 18 months on shares the last colour.
const TONES: Record<number, string> = { 1: forest, 3: indigo, 6: ochre, 12: stamp }

const C = 50
const BEADS = 24

// A Step Token in the field journal look: a flat coin with a beaded rim and the
// count of goal months.
export function StepTokenSvg({ milestone, size = 72 }: { milestone: number; size?: number }) {
  const tone = TONES[milestone] ?? ink
  const beads = Array.from({ length: BEADS }, (_, i) => {
    const a = (i / BEADS) * 2 * Math.PI
    return { x: C + 40.5 * Math.cos(a), y: C + 40.5 * Math.sin(a) }
  })
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx={C} cy={C} r="47" fill={paperCard} stroke={ink} strokeWidth="2" />
      {beads.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r="1.6" fill={tone} />)}
      <circle cx={C} cy={C} r="34" fill={`${tone}26`} stroke={tone} strokeWidth="1.5" />
      <text x={C} y={C + 11} textAnchor="middle" fontFamily={MONO} fontWeight="500" fontSize="32" fill={ink}>
        {milestone}
      </text>
    </svg>
  )
}
