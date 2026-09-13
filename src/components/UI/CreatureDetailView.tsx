import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getFoodDef } from '@/data/foods'
import { getCreaturePreviewURL, getCreatureSpinFrames } from '@/lib/creaturePreview'
import { creatureName, xpForCreatureLevel } from '@/lib/profile'
import { creatureDefBySpecies } from '@/data/creatures'
import type { FoodItem, HatchedCreature } from '@/types'
import { glassSheet } from '@/lib/glass'
import { accent, categoryCss, rewardGradientHorizontal } from '@/lib/theme'
import { useLocale } from '@/contexts/LocaleContext'

const DROPZONE = 'creature'

// Tapping the creature in the detail view spins it SPIN_TURNS times with a hop.
const SPIN_MS = 900
const SPIN_TURNS = 2

function bobDelay(id: string) {
  return `-${(id.charCodeAt(id.length - 1) % 20) / 10}s`
}

function CreatureScene({ creature, size, nomming, highlight }: {
  creature: HatchedCreature
  size: 'sm' | 'lg'
  nomming?: boolean
  highlight?: boolean
}) {
  const large = size === 'lg'
  const boxSize = large ? 96 : 60
  // Pokedex-style size variety: the wild and mythic cats stand taller than strays.
  const type = creatureDefBySpecies(creature.species)?.type
  const emojiSize = Math.round(boxSize * (type === 'wild' || type === 'mythic' ? 1 : 0.84))
  const groundW = large ? 150 : 64
  const groundH = large ? 38 : 18
  const shadowW = large ? 70 : 34
  const shadowH = large ? 14 : 7
  const typeColor = categoryCss(creature.poiCategory)

  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(creature.species, creature.isShiny).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [creature.species, creature.isShiny])

  const [spinSrc, setSpinSrc] = useState<string | null>(null)
  const spinningRef = useRef(false)
  const rafRef = useRef(0)
  const spinning = spinSrc !== null

  // Warm the turntable frames after the sheet has slid in, so the first tap
  // spins at once without stalling the slide animation.
  useEffect(() => {
    if (!large) return
    const id = setTimeout(() => { getCreatureSpinFrames(creature.species, creature.isShiny).catch(() => {}) }, 400)
    return () => clearTimeout(id)
  }, [large, creature.species, creature.isShiny])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  async function spin() {
    if (spinningRef.current) return
    spinningRef.current = true
    const frames = await getCreatureSpinFrames(creature.species, creature.isShiny).catch(() => [])
    if (!frames.length) { spinningRef.current = false; return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SPIN_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      setSpinSrc(frames[Math.round(eased * SPIN_TURNS * frames.length) % frames.length])
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); return }
      setSpinSrc(null)
      spinningRef.current = false
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const figureStyle: CSSProperties = {
    fontSize: emojiSize,
    lineHeight: 1,
    display: 'block',
    transformOrigin: spinning ? '50% 100%' : undefined,
    animation: spinning
      ? `creatureSpinHop ${SPIN_MS}ms ease-in-out`
      : nomming
      ? 'creatureNom 0.55s ease forwards'
      : `creatureBob 2.2s ease-in-out infinite`,
    animationDelay: spinning || nomming ? '0s' : bobDelay(creature.id),
    filter: creature.isShiny ? 'drop-shadow(0 0 10px rgba(245,158,11,0.75))' : undefined,
  }
  const shown = spinSrc ?? src
  const figure = shown
    ? <img src={shown} width={emojiSize} height={emojiSize} alt={creature.species} style={{ display: 'block' }} />
    : creature.emoji

  return (
    <div
      data-dropzone={large ? DROPZONE : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        userSelect: 'none', isolation: 'isolate',
        padding: large ? '12px 32px 12px' : undefined,
        borderRadius: large ? 20 : undefined,
        background: highlight ? 'rgba(99,102,241,0.08)' : undefined,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ height: boxSize, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {large
        ? (
          <button
            type="button"
            onClick={spin}
            style={{
              ...figureStyle,
              background: 'none', border: 0, padding: 0, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {figure}
          </button>
        )
        : <span style={figureStyle}>{figure}</span>}
      </div>

      <div style={{
        width: shadowW, height: shadowH,
        borderRadius: '50%',
        background: 'rgba(15,23,42,0.18)',
        marginTop: large ? -10 : -5,
        animation: nomming ? undefined : `shadowPulse 2.2s ease-in-out infinite`,
        animationDelay: bobDelay(creature.id),
      }} />

      {/* Flat pad in the creature's type colour, under the contact shadow. */}
      <div style={{
        width: groundW, height: groundH,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${typeColor}59 0%, ${typeColor}2e 55%, ${typeColor}00 72%)`,
        marginTop: large ? -24 : -12,
        position: 'relative', zIndex: -1,
      }} />
    </div>
  )
}

function buildGhostStyle(w: number, h: number): string {
  return [
    'position:fixed', 'pointer-events:none', `width:${w}px`, `height:${h}px`,
    'z-index:9999', 'display:flex', 'flex-direction:column', 'align-items:center',
    'gap:3px', 'padding:10px 14px', 'background:white', 'border-radius:18px',
    'box-shadow:0 8px 28px rgba(0,0,0,0.22)', 'border:1.5px solid #f1f5f9',
    'opacity:0.95', 'transition:none',
  ].join(';')
}

function FoodChip({ item, onFed }: { item: FoodItem; onFed: () => void }) {
  const def = getFoodDef(item.foodId)
  const chipRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<'idle' | 'done'>('idle')
  const [overZone, setOverZone] = useState(false)

  if (!def || state === 'done') return null

  function getZoneEl(cx: number, cy: number) {
    // ghost is pointer-events:none so elementFromPoint finds what's underneath
    const el = document.elementFromPoint(cx, cy)
    return el?.closest(`[data-dropzone="${DROPZONE}"]`) ?? null
  }

  function spawnGhost(cx: number, cy: number) {
    const src = chipRef.current
    if (!src) return
    const r = src.getBoundingClientRect()
    const g = document.createElement('div')
    g.style.cssText = buildGhostStyle(r.width, r.height)
    g.style.left = `${cx - r.width / 2}px`
    g.style.top = `${cy - r.height / 2}px`
    g.innerHTML = src.innerHTML
    document.body.appendChild(g)
    ghostRef.current = g
  }

  function moveGhost(cx: number, cy: number) {
    const g = ghostRef.current
    const src = chipRef.current
    if (!g || !src) return
    const r = src.getBoundingClientRect()
    g.style.left = `${cx - r.width / 2}px`
    g.style.top = `${cy - r.height / 2}px`
    const onZone = !!getZoneEl(cx, cy)
    setOverZone(onZone)
    g.style.boxShadow = onZone
      ? '0 0 0 3px #818cf8, 0 8px 28px rgba(99,102,241,0.35)'
      : '0 8px 28px rgba(0,0,0,0.22)'
  }

  function dropGhost(cx: number, cy: number) {
    ghostRef.current?.remove()
    ghostRef.current = null
    setOverZone(false)
    if (getZoneEl(cx, cy)) {
      setState('done')
      onFed()
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    spawnGhost(e.clientX, e.clientY)
    const move = (ev: MouseEvent) => moveGhost(ev.clientX, ev.clientY)
    const up = (ev: MouseEvent) => {
      dropGhost(ev.clientX, ev.clientY)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    spawnGhost(t.clientX, t.clientY)
  }
  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]
    moveGhost(t.clientX, t.clientY)
  }
  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0]
    dropGhost(t.clientX, t.clientY)
  }

  return (
    <div
      ref={chipRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '10px 14px', background: 'white', borderRadius: 18,
        boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
        border: `1.5px solid ${overZone ? '#818cf8' : '#f1f5f9'}`,
        cursor: 'grab', userSelect: 'none', touchAction: 'none', flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 34, lineHeight: 1 }}>{def.emoji}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', textAlign: 'center', maxWidth: 72, lineHeight: 1.2 }}>
        {def.name}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 20, padding: '1px 7px' }}>
        +{def.xp} XP
      </span>
    </div>
  )
}

export function CreatureDetailView({ creature, foodInventory, onFeed, onRelease, onClose }: {
  creature: HatchedCreature
  foodInventory: FoodItem[]
  onFeed: (creatureId: string, foodItemId: string) => void
  onRelease: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [nomming, setNomming] = useState(false)
  const [highlight, setHighlight] = useState(false)
  const [feedQueue, setFeedQueue] = useState(foodInventory)
  const xpNeeded = xpForCreatureLevel(creature.level)
  const xpPct = Math.min(1, creature.xp / xpNeeded) * 100
  const atCap = creature.level >= 20

  function handleFed(foodItemId: string) {
    onFeed(creature.id, foodItemId)
    setFeedQueue((q) => q.filter((f) => f.id !== foodItemId))
    setHighlight(false)
    setNomming(true)
    setTimeout(() => setNomming(false), 600)
  }

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '88vh',
          ...glassSheet,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'panelSlideUp 0.28s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 0 calc(24px + env(safe-area-inset-bottom))' }}>

          {/* Scene — this is the drop zone */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 24px 8px' }}>
            {creature.isShiny && (
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, color: '#d97706', textTransform: 'uppercase', marginBottom: 8 }}>
                ✨ Shiny
              </div>
            )}
            <CreatureScene creature={creature} size="lg" nomming={nomming} highlight={highlight} />
          </div>

          <div style={{ textAlign: 'center', padding: '8px 24px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{creatureName(creature)}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: creature.isShiny ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : accent,
                color: 'white',
              }}>
                {t('level_badge', { level: creature.level })}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{creature.poiCategory}</span>
            </div>
          </div>

          {!atCap ? (
            <div style={{ padding: '4px 32px 0' }}>
              <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: creature.isShiny ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : rewardGradientHorizontal,
                  width: `${xpPct}%`, transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                <span>{creature.xp} / {xpNeeded} XP</span>
                <span>{t('creature_next_level')}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#818cf8', marginTop: 4 }}>{t('creature_max_level')}</div>
          )}

          <div style={{ textAlign: 'center', padding: '8px 24px 0', fontSize: 12, color: '#94a3b8' }}>
            Found at {creature.poiOriginName}
          </div>

          <div style={{ height: 1, background: '#e2e8f0', margin: '20px 24px' }} />

          {feedQueue.length > 0 ? (
            <div style={{ padding: '0 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Feed</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>{t('creature_drag_food')}</div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {feedQueue.map((item) => (
                  <FoodChip key={item.id} item={item} onFed={() => handleFed(item.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '0 24px' }}>
              <div style={{ padding: '12px 16px', background: '#eef2ff', borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#6366f1' }}>
                  No food yet. Send a squad on an expedition to bring some back.
                </p>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: '#e2e8f0', margin: '20px 24px' }} />

          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onRelease} style={{
              width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
              background: '#fff1f2', color: '#e11d48', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              Release {creature.species}
            </button>
            <button onClick={onClose} data-sfx="close" style={{
              width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
              background: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export function CreatureSceneCard({ creature }: { creature: HatchedCreature }) {
  return <CreatureScene creature={creature} size="sm" />
}
