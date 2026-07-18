import { useEffect, useState, type CSSProperties } from 'react'

interface ConfettiProps {
  onDone: () => void
  count?: number
}

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotate: number
  drift: number
}

const COLORS = ['#f59e0b', '#6366f1', '#22c55e', '#ec4899', '#38bdf8']
const DURATION_MS = 1100

function randomPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 150,
    duration: 700 + Math.random() * 400,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 60,
  }))
}

export function Confetti({ onDone, count = 24 }: ConfettiProps) {
  // Lazy initializer: the sanctioned spot for one-time impure setup, runs only on mount.
  const [pieces] = useState<Piece[]>(() => randomPieces(count))

  useEffect(() => {
    const t = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9999 }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: -10,
            left: `${p.left}%`,
            width: 7,
            height: 10,
            background: p.color,
            borderRadius: 2,
            animation: `confettiFall ${p.duration}ms ${p.delay}ms ease-in forwards`,
            '--drift': `${p.drift}px`,
            '--rotate': `${p.rotate}deg`,
          } as CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 110vh) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
