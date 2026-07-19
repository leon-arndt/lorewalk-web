import { useEffect, useMemo, useRef, useState } from 'react'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import type { LevelReward } from '@/lib/profile'

const BURST_COLORS = ['#818cf8','#c084fc','#34d399','#fbbf24','#f472b6','#60a5fa','#fb923c']

function rewardInfo(r: LevelReward): { emoji: string; title: string; sub: string } {
  if (r.type === 'coins')          return { emoji: '🪙', title: `${r.amount} Coins`,          sub: 'Added to wallet' }
  if (r.type === 'egg_slot')       return { emoji: '🥚', title: 'Egg Slot',                   sub: '+1 incubation slot' }
  return                                  { emoji: '🐾', title: `+${r.amount} Creature Slots`, sub: 'Carry more companions' }
}

function ParticleBurst({ cx, cy }: { cx: number; cy: number }) {
  const [launched, setLaunched] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLaunched(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  const particles = useMemo(() => {
    const n = 26
    return Array.from({ length: n }, (_, i) => {
      const angle = (360 / n) * i + (Math.random() - 0.5) * (360 / n)
      const dist = 55 + Math.random() * 90
      return {
        dx: Math.cos((angle * Math.PI) / 180) * dist,
        dy: Math.sin((angle * Math.PI) / 180) * dist,
        size: 5 + Math.random() * 7,
        color: BURST_COLORS[i % BURST_COLORS.length],
        delay: Math.random() * 120,
        dur: 480 + Math.random() * 280,
      }
    })
  }, [])

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: cx - p.size / 2,
            top: cy - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            pointerEvents: 'none',
            zIndex: 210,
            transform: launched ? `translate(${p.dx}px,${p.dy}px) scale(0.25)` : 'translate(0,0) scale(1)',
            opacity: launched ? 0 : 1,
            transition: launched
              ? `transform ${p.dur}ms ease-out ${p.delay}ms, opacity ${p.dur * 0.55}ms ease-in ${p.delay + p.dur * 0.45}ms`
              : 'none',
          }}
        />
      ))}
    </>
  )
}

function AnimatedLevel({ level }: { level: number }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{
      fontSize: 96,
      fontWeight: 900,
      lineHeight: 1,
      background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      filter: 'drop-shadow(0 0 28px rgba(192,132,252,0.55))',
      transform: ready ? 'scale(1)' : 'scale(0.1)',
      opacity: ready ? 1 : 0,
      transition: 'transform 0.65s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
    }}>
      {level}
    </div>
  )
}

function RewardCard({
  reward,
  revealed,
  isNext,
  cardRef,
}: {
  reward: LevelReward
  revealed: boolean
  isNext: boolean
  cardRef: (el: HTMLDivElement | null) => void
}) {
  const info = rewardInfo(reward)
  return (
    <div
      ref={cardRef}
      style={{
        width: 96,
        borderRadius: 18,
        padding: '20px 12px 16px',
        textAlign: 'center',
        background: revealed ? 'rgba(5,150,105,0.18)' : 'rgba(255,255,255,0.06)',
        border: `2px solid ${revealed ? '#34d399' : isNext ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: isNext && !revealed ? '0 0 12px rgba(255,255,255,0.12)' : 'none',
        transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        transform: revealed ? 'scale(1)' : 'scale(0.88)',
      }}
    >
      {revealed ? (
        <>
          <div style={{ fontSize: 38, marginBottom: 8, lineHeight: 1 }}>
            <EmojiSprite id={reward.type} emoji={info.emoji} size={38} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{info.title}</div>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, lineHeight: 1.3 }}>{info.sub}</div>
        </>
      ) : (
        <div style={{ fontSize: 30, opacity: isNext ? 0.6 : 0.3, lineHeight: 1, paddingTop: 4 }}>?</div>
      )}
    </div>
  )
}

export function LevelUpScreen({ level, rewards, onDismiss }: {
  level: number
  rewards: LevelReward[]
  onDismiss: () => void
}) {
  const [revealed, setRevealed] = useState(0)
  const [burst, setBurst] = useState<{ key: number; cx: number; cy: number } | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const allRevealed = revealed >= rewards.length

  function revealNextAt(idx: number) {
    const card = cardRefs.current[idx]
    if (card) {
      const r = card.getBoundingClientRect()
      setBurst({ key: Date.now(), cx: r.left + r.width / 2, cy: r.top + r.height / 2 })
    }
    setRevealed(idx + 1)
  }

  // Auto-reveal first reward after a short pause so the level number can land first.
  useEffect(() => {
    if (rewards.length === 0) return
    const t = setTimeout(() => revealNextAt(0), 1200)
    return () => clearTimeout(t)
  }, [])

  function handleTap() {
    if (!allRevealed) {
      revealNextAt(revealed)
    } else {
      onDismiss()
    }
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,8,30,0.93)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20,
        userSelect: 'none',
      }}
    >
      {burst && <ParticleBurst key={burst.key} cx={burst.cx} cy={burst.cy} />}

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 5,
          color: '#c4b5fd', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Level Up!
        </div>
        <AnimatedLevel level={level} />
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, fontWeight: 500 }}>
          You are now a Level {level} Explorer
        </div>
      </div>

      {rewards.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
            Rewards
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
            {rewards.map((r, i) => (
              <RewardCard
                key={i}
                reward={r}
                revealed={i < revealed}
                isNext={i === revealed}
                cardRef={(el) => { cardRefs.current[i] = el }}
              />
            ))}
          </div>
        </>
      )}

      <div style={{
        fontSize: 11, color: allRevealed ? '#34d399' : '#475569',
        fontWeight: allRevealed ? 700 : 400,
        marginTop: 4,
        transition: 'color 0.3s ease, font-weight 0.3s ease',
      }}>
        {allRevealed ? 'Tap anywhere to continue' : 'Tap to reveal your rewards'}
      </div>
    </div>
  )
}
