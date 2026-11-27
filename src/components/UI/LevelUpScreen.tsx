import { useEffect, useMemo, useRef, useState } from 'react'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { useLocale } from '@/contexts/LocaleContext'
import type { LevelReward } from '@/lib/profile'
import type { Translations } from '@/i18n/types'
import { motion } from 'motion/react'
import { popIn, popSpring } from '@/lib/motion'
import { Mono, NoteCard } from '@/components/UI/Journal'
import { SCRIM_DEEP } from '@/lib/paper'
import { forest, indigo, ink, inkHint, inkSoft, line, ochre, paperCard, stamp, pencil } from '@/lib/theme'

const BURST_COLORS = [stamp, ochre, forest, ochre, indigo]


function rewardInfo(
  r: LevelReward,
  t: (key: keyof Translations, vars?: Record<string, string | number>) => string,
): { emoji: string; title: string; sub: string } {
  if (r.type === 'coins')          return { emoji: '🪙', title: t('levelup_coins_title', { amount: r.amount }), sub: t('levelup_coins_sub') }
  if (r.type === 'egg_slot')       return { emoji: '🥚', title: t('levelup_egg_slot_title'),                    sub: t('levelup_egg_slot_sub') }
  return                                  { emoji: '🐾', title: t('levelup_creature_slots_title', { amount: r.amount }), sub: t('levelup_creature_slots_sub') }
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

// The new level as a round red stamp. It starts large above the page and slams
// down after the note has popped in.
function AnimatedLevel({ level }: { level: number }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{
      position: 'relative',
      width: 148, height: 148, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `4px solid ${stamp}`, borderRadius: '50%',
      color: stamp,
      transform: ready ? 'scale(1) rotate(-7deg)' : 'scale(2.6) rotate(-18deg)',
      opacity: ready ? 1 : 0,
      transition: 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.3s, opacity 0.12s ease-in 0.3s',
    }}>
      <span aria-hidden style={{ position: 'absolute', inset: 6, border: `1.5px solid ${stamp}`, borderRadius: '50%' }} />
      <span style={{ fontSize: level >= 100 ? 54 : 78, fontWeight: 600, lineHeight: 1 }}>{level}</span>
    </div>
  )
}

function RewardCard({
  reward,
  index,
  revealed,
  isNext,
  cardRef,
}: {
  reward: LevelReward
  index: number
  revealed: boolean
  isNext: boolean
  cardRef: (el: HTMLDivElement | null) => void
}) {
  const { t } = useLocale()
  const info = rewardInfo(reward, t)
  return (
    <motion.div {...popIn(index + 2)}
      ref={cardRef}
      style={{
        flex: '1 1 0', minWidth: 84, maxWidth: 112, minHeight: 112,
        borderRadius: 6,
        padding: '14px 6px 10px',
        textAlign: 'center',
        background: revealed ? paperCard : 'rgba(255,253,246,0)',
        border: revealed ? `1.5px solid ${line}` : `1.5px dashed ${isNext ? ink : pencil}`,
        boxShadow: revealed ? '1px 2px 0 rgba(51,40,30,0.18)' : '1px 2px 0 rgba(51,40,30,0)',
        transition: 'background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease',
      }}
    >
      {revealed ? (
        <motion.div initial={{ rotateY: 90, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={popSpring}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, lineHeight: 1 }}>
            <EmojiSprite id={`item_${reward.type}`} emoji={info.emoji} size={38} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: ink, lineHeight: '16px' }}>{info.title}</div>
          <Mono style={{ display: 'block', marginTop: 3 }}>{info.sub}</Mono>
        </motion.div>
      ) : (
        <div style={{ fontSize: 28, fontWeight: 500, color: isNext ? ink : inkHint, lineHeight: 1, paddingTop: 24 }}>?</div>
      )}
    </motion.div>
  )
}

export function LevelUpScreen({ level, rewards, onDismiss }: {
  level: number
  rewards: LevelReward[]
  onDismiss: () => void
}) {
  const { t } = useLocale()
  const [revealed, setRevealed] = useState(0)
  const [burst, setBurst] = useState<{ key: number; cx: number; cy: number } | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const allRevealed = revealed >= rewards.length

  // Keep the next slot to reveal in view, so a tap never reveals a hidden one.
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    const card = cardRefs.current[Math.min(revealed, rewards.length - 1)]
    if (!list || !card) return
    const bottom = card.offsetTop + card.offsetHeight + 6
    if (bottom > list.scrollTop + list.clientHeight) list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' })
  }, [revealed, rewards.length])

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: SCRIM_DEEP,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 20px', overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {burst && <ParticleBurst key={burst.key} cx={burst.cx} cy={burst.cy} />}

      <motion.div
        initial={{ scale: 0.5, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ ...popSpring, delay: 0.1 }}
        style={{ width: '100%', maxWidth: 340, margin: 'auto 0' }}
      >
        <NoteCard taped style={{ padding: '28px 16px 16px', textAlign: 'center', boxShadow: '3px 4px 0 rgba(51,40,30,0.35)' }}>
          <Mono style={{
            display: 'block', marginBottom: 14,
            fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', color: stamp, textTransform: 'uppercase',
          }}>
            {t('levelup_title')}
          </Mono>
          <AnimatedLevel level={level} />
          <div style={{ fontSize: 15, lineHeight: '20px', color: ink, marginTop: 14, fontWeight: 500 }}>
            {t('levelup_subtitle', { level })}
          </div>

          {rewards.length > 0 && (
            <>
              <div style={{ borderTop: `1px solid ${line}`, margin: '16px 0 10px' }} />
              <Mono style={{ display: 'block', marginBottom: 10, color: inkSoft, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {t('levelup_rewards')}
              </Mono>
              {/* Many rewards scroll inside this window, and it follows each reveal. */}
              <div ref={listRef} style={{
                position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                maxHeight: 'min(32dvh, 236px)', overflowY: 'auto', overscrollBehavior: 'contain', padding: '2px 2px 6px',
              }}>
                {rewards.map((r, i) => (
                  <RewardCard
                    key={i}
                    reward={r}
                    index={i}
                    revealed={i < revealed}
                    isNext={i === revealed}
                    cardRef={(el) => { cardRefs.current[i] = el }}
                  />
                ))}
              </div>
            </>
          )}

          <Mono style={{
            display: 'block', marginTop: 16,
            color: allRevealed ? forest : inkHint,
            fontWeight: allRevealed ? 500 : 400,
            transition: 'color 0.3s ease',
          }}>
            {allRevealed ? t('levelup_tap_continue') : t('levelup_tap_reveal')}
          </Mono>
        </NoteCard>
      </motion.div>
    </motion.div>
  )
}
