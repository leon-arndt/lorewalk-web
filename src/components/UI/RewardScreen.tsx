import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useReward } from '@/contexts/RewardContext'
import { useLocale } from '@/contexts/LocaleContext'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { MedalSvg } from '@/components/UI/MedalSvg'
import { getMedalConfig } from '@/data/medals'
import type { RewardItem, RewardItemType } from '@/types'
import type { Translations } from '@/i18n/types'
import { InkButton, Mono, NoteCard } from '@/components/UI/Journal'
import { SCRIM_DEEP, monoLabel } from '@/lib/paper'
import { forest, indigo, ink, inkSoft, line, ochre, paper, paperCard, paperLight, stamp } from '@/lib/theme'

// Header emojis that have a 3D icon, for callers that pass no spriteId.
const HEADER_SPRITES: Record<string, string> = {
  '🎁': 'item_chest', '🧭': 'item_compass', '📍': 'item_pin', '🎉': 'item_trophy',
  '🏅': 'item_badge', '⛩️': 'item_shrine', '🪙': 'item_coins', '⭐': 'item_xp', '🥚': 'item_egg',
}

const ITEM_ICON: Record<RewardItemType, string> = {
  xp: '⭐', coins: '🪙', egg: '🥚', level_up: '✨', badge: '🏅', food: '🍽️',
}

function itemLabel(item: RewardItem, t: (key: keyof Translations, vars?: Record<string, string | number>) => string): string {
  switch (item.type) {
    case 'xp': return t('reward_item_xp', { n: item.amount ?? 0 })
    case 'coins': return t('reward_item_coins', { n: item.amount ?? 0 })
    case 'egg': return t('reward_item_egg')
    case 'level_up': return t('reward_item_level_up', { name: item.label ?? '', level: item.amount ?? 0 })
    case 'badge': return item.label ?? t('reward_item_badge')
    case 'food': return t('reward_item_food', { name: item.label ?? '' })
  }
}

// Ink bursts in the journal palette. The light inks lead, because the scrim is dark.
const FW_COLORS = [paperLight, ochre, stamp, paperLight, ochre, forest, indigo]

// A screen full of celebratory bursts that fire on mount. Each burst is a ring of
// particles flung outward via a shared CSS keyframe (per-particle target set with
// --dx/--dy custom properties), staggered so they pop off one after another.
function Fireworks() {
  const [bursts] = useState(() => {
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
  })

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

const DUST_COLORS = [paperLight, paperCard, paper]

// Paper dust and gold flecks that drift up the screen for as long as it is open.
// Negative delays start each mote part-way through its rise, so the screen opens
// already full.
function RisingMotes() {
  const [motes] = useState(() => Array.from({ length: 36 }, () => {
    const dur = 6 + Math.random() * 7
    const fleck = Math.random() < 0.35
    return {
      fleck,
      left: Math.random() * 100,
      size: 3 + Math.random() * 5,
      color: fleck ? ochre : DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
      dur,
      delay: -Math.random() * dur,
      sway: 14 + Math.random() * 26,
      swayDur: 2.4 + Math.random() * 2.6,
      peak: 0.35 + Math.random() * 0.6,
    }
  }))

  return (
    <div className="reward-motes" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {motes.map((m, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', left: `${m.left}%`, bottom: -12,
            '--peak': m.peak,
            animation: `moteRise ${m.dur}s linear ${m.delay}s infinite`,
          } as CSSProperties}
        >
          <span style={{
            display: 'block', width: m.size, height: m.size, borderRadius: m.fleck ? 1 : '50%',
            background: m.color,
            rotate: m.fleck ? '45deg' : undefined,
            '--sway': `${m.sway}px`,
            animation: `moteSway ${m.swayDur}s ease-in-out ${m.delay}s infinite alternate`,
          } as CSSProperties} />
        </span>
      ))}
    </div>
  )
}

// Ignore taps for a moment after the screen opens, so the tap that triggered the
// reward (or a quick double tap) does not skip it before the player sees it.
const TAP_GUARD_MS = 600

export function RewardScreen() {
  const { pendingReward, dismissReward } = useReward()
  const { t } = useLocale()
  const openedAt = useRef(0)
  useEffect(() => {
    if (pendingReward) openedAt.current = performance.now()
  }, [pendingReward])
  if (!pendingReward) return null

  function handleTap() {
    if (performance.now() - openedAt.current < TAP_GUARD_MS) return
    dismissReward()
  }

  const { emoji, spriteId, title, subtitle, items, medalMonthKey } = pendingReward
  const medalConfig = medalMonthKey ? getMedalConfig(medalMonthKey) : null

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: SCRIM_DEEP,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <RisingMotes />
      <Fireworks />

      {/* A note taped over the page. rewardPop ends on the same tilt as the note. */}
      <NoteCard
        taped
        tilt={-0.6}
        style={{
          zIndex: 10,
          width: '100%', maxWidth: 360,
          padding: '34px 22px 22px',
          boxShadow: '3px 4px 0 rgba(51,40,30,0.35)',
          animation: 'rewardPop 0.38s cubic-bezier(0.16,1,0.3,1)',
          textAlign: 'center',
        }}
      >
        {/* Big icon: the medal SVG if there is one, otherwise the sprite */}
        <div style={{
          lineHeight: 1, marginBottom: 14,
          animation: 'rewardBounce 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
          display: 'inline-block',
        }}>
          {medalConfig
            ? <MedalSvg config={medalConfig} size={140} />
            : <EmojiSprite id={spriteId ?? HEADER_SPRITES[emoji] ?? emoji} emoji={emoji} size={72} />
          }
        </div>

        {/* Title */}
        <h2 className="reward-title" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: '20px', color: inkSoft }}>
            {subtitle}
          </p>
        )}
        {!subtitle && <div style={{ height: 14 }} />}

        {/* Reward rows: ledger lines. Each slides in on a stagger, so items feel added one by one */}
        {items.length > 0 && (
          <div style={{
            borderTop: `1.5px dashed ${line}`, borderBottom: `1.5px dashed ${line}`, marginBottom: 20,
          }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 4px',
                borderTop: i > 0 ? `1.5px dashed ${line}` : 'none',
                animation: `rewardRowIn 0.42s cubic-bezier(0.16,1,0.3,1) ${0.35 + i * 0.14}s both`,
              }}>
                <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EmojiSprite id={item.spriteId ?? `item_${item.type}`} emoji={item.emoji ?? ITEM_ICON[item.type]} size={24} />
                </div>
                <Mono style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: ink, textAlign: 'left' }}>
                  {itemLabel(item, t)}
                </Mono>
              </div>
            ))}
          </div>
        )}

        <InkButton style={{ width: '100%', minHeight: 48, fontSize: 17 }}>
          {t('reward_collect')}
        </InkButton>
      </NoteCard>

      <div className="reward-tap-hint" style={{
        ...monoLabel,
        position: 'relative', zIndex: 10, marginTop: 18, padding: '5px 10px',
        background: ink, borderRadius: 6,
        color: paperLight, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}>
        {t('levelup_tap_continue')}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rewardPop {
          from { opacity: 0; transform: scale(0.85) translateY(20px) rotate(-0.6deg) }
          to   { opacity: 1; transform: scale(1) translateY(0) rotate(-0.6deg) }
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
        .reward-title {
          background: linear-gradient(100deg, ${stamp} 0%, ${stamp} 38%, ${ochre} 50%, ${stamp} 62%, ${stamp} 100%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation:
            rewardTitleIn 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.18s both,
            rewardTitleShimmer 3.2s ease-in-out 0.7s infinite,
            rewardTitleGlow 2.4s ease-in-out 0.7s infinite;
        }
        @keyframes rewardTitleIn {
          0%   { transform: scale(0.4); opacity: 0; letter-spacing: 0.2em }
          100% { transform: scale(1); opacity: 1; letter-spacing: -0.01em }
        }
        @keyframes rewardTitleShimmer {
          0%, 15%  { background-position: 100% 0 }
          65%, 100% { background-position: 0% 0 }
        }
        @keyframes rewardTitleGlow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(201,138,30,0.3)) }
          50%      { filter: drop-shadow(0 0 12px rgba(201,138,30,0.7)) }
        }
        .reward-tap-hint {
          animation: rewardHintIn 0.5s ease 1.1s both, rewardHintPulse 2.4s ease-in-out 1.6s infinite;
        }
        @keyframes rewardHintIn {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes rewardHintPulse {
          0%, 100% { opacity: 1 }
          50%      { opacity: 0.45 }
        }
        @keyframes moteRise {
          0%   { transform: translateY(0); opacity: 0 }
          12%  { opacity: var(--peak) }
          80%  { opacity: var(--peak) }
          100% { transform: translateY(-110vh); opacity: 0 }
        }
        @keyframes moteSway {
          from { transform: translateX(calc(var(--sway) * -1)) }
          to   { transform: translateX(var(--sway)) }
        }
        @media (prefers-reduced-motion: reduce) {
          .reward-motes { display: none }
          .reward-title { animation: none }
          .reward-tap-hint { animation: none }
        }
        @keyframes fwFly {
          0%   { transform: translate(0,0) scale(1); opacity: 1 }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0 }
        }
      `}</style>
    </div>
  )
}
