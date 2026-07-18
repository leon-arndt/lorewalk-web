import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useReward } from '@/contexts/RewardContext'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import type { RewardItem } from '@/types'

const ITEM_META: Record<string, { icon: string; color: string; label: (item: RewardItem) => string }> = {
  xp:       { icon: '⭐', color: '#f59e0b', label: (i) => `+${i.amount} XP` },
  coins:    { icon: '🪙', color: '#b45309', label: (i) => `+${i.amount} coins` },
  egg:      { icon: '🥚', color: '#16a34a', label: () => 'New egg - ready to hatch!' },
  level_up: { icon: '✨', color: '#7c3aed', label: (i) => `${i.label} reached Lv. ${i.amount}!` },
  badge:    { icon: '🏅', color: '#ca8a04', label: (i) => i.label ?? 'New badge!' },
  food:     { icon: '🍽️', color: '#f59e0b', label: (i) => `${i.label} added to pantry` },
}

const FW_COLORS = ['#818cf8', '#c084fc', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c']

// A screen full of celebratory bursts that fire on mount. Each burst is a ring of
// particles flung outward via a shared CSS keyframe (per-particle target set with
// --dx/--dy custom properties), staggered so they pop off one after another.
function Fireworks() {
  const bursts = useMemo(() => {
    const N = 7
    return Array.from({ length: N }, (_, b) => {
      const count = 14
      const particles = Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i + (Math.random() - 0.5) * 22
        const dist = 55 + Math.random() * 75
        return {
          dx: Math.cos((angle * Math.PI) / 180) * dist,
          dy: Math.sin((angle * Math.PI) / 180) * dist,
          size: 5 + Math.random() * 6,
          color: FW_COLORS[(b + i) % FW_COLORS.length],
          dur: 700 + Math.random() * 500,
        }
      })
      return {
        cx: 12 + Math.random() * 76,   // vw %
        cy: 10 + Math.random() * 55,   // vh %
        delay: b * 240 + Math.random() * 140,
        particles,
      }
    })
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {bursts.map((burst, bi) => (
        <div key={bi} style={{ position: 'absolute', left: `${burst.cx}%`, top: `${burst.cy}%` }}>
          {burst.particles.map((p, pi) => (
            <div
              key={pi}
              style={{
                position: 'absolute',
                width: p.size, height: p.size, borderRadius: '50%',
                marginLeft: -p.size / 2, marginTop: -p.size / 2,
                background: p.color,
                boxShadow: `0 0 7px ${p.color}`,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                animation: `fwFly ${p.dur}ms ease-out ${burst.delay}ms both`,
              } as CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function RewardScreen() {
  const { pendingReward, dismissReward } = useReward()
  if (!pendingReward) return null

  const { emoji, title, subtitle, items } = pendingReward

  return (
    <div
      onClick={dismissReward}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,10,30,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <Fireworks />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: 360,
          background: 'white', borderRadius: 28,
          padding: '36px 28px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          animation: 'rewardPop 0.38s cubic-bezier(0.16,1,0.3,1)',
          textAlign: 'center',
        }}
      >
        {/* Big icon */}
        <div style={{
          fontSize: 72, lineHeight: 1, marginBottom: 16,
          animation: 'rewardBounce 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
          display: 'inline-block',
        }}>
          <EmojiSprite id={emoji} emoji={emoji} size={72} />
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94a3b8' }}>
            {subtitle}
          </p>
        )}
        {!subtitle && <div style={{ height: 16 }} />}

        {/* Reward rows - each slides in on a stagger so items feel added one by one */}
        {items.length > 0 && (
          <div style={{
            background: '#f8fafc', borderRadius: 16, padding: '4px 0', marginBottom: 24,
          }}>
            {items.map((item, i) => {
              const meta = ITEM_META[item.type]
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                  animation: `rewardRowIn 0.42s cubic-bezier(0.16,1,0.3,1) ${0.35 + i * 0.14}s both`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${meta.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    <EmojiSprite id={item.emoji ?? item.type} emoji={item.emoji ?? meta.icon} size={22} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', textAlign: 'left' }}>
                    {meta.label(item)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={dismissReward}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #818cf8, #c084fc)',
            color: 'white', fontSize: 17, fontWeight: 800,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(129,140,248,0.4)',
            letterSpacing: '0.01em',
          }}
        >
          Collect!
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rewardPop {
          from { opacity: 0; transform: scale(0.85) translateY(20px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
        @keyframes rewardBounce {
          0%   { transform: scale(0.5) rotate(-8deg) }
          60%  { transform: scale(1.15) rotate(4deg) }
          80%  { transform: scale(0.95) rotate(-2deg) }
          100% { transform: scale(1) rotate(0deg) }
        }
        @keyframes rewardRowIn {
          from { opacity: 0; transform: translateY(14px) scale(0.94) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes fwFly {
          0%   { transform: translate(0,0) scale(1); opacity: 1 }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0 }
        }
      `}</style>
    </div>
  )
}
