import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getFoodDef } from '@/data/foods'
import { getCreaturePreviewURL, getCreatureSpinFrames } from '@/lib/creaturePreview'
import { LoadingDot } from '@/components/UI/LoadingDot'
import { creatureName, xpForCreatureLevel } from '@/lib/profile'
import { CREATURES, creatureDefBySpecies } from '@/data/creatures'
import type { FoodItem, HatchedCreature } from '@/types'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { InkButton, Mono, SectionTitle, Stamp } from '@/components/UI/Journal'
import { SCRIM, paperSheet } from '@/lib/paper'
import { accentAlpha, categoryCss, forest, ink, inkSoft, line, ochre, paperLight, ochreInk, pencil } from '@/lib/theme'
import { useLocale } from '@/contexts/LocaleContext'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

const DROPZONE = 'creature'


// A shiny creature has a gold ink outline, drawn as four hard shadows.
const SHINY_OUTLINE = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]
  .map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${ochre})`).join(' ')

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
  const boxSize = large ? 120 : 60
  // Pokedex-style size variety: the wild and mythic cats stand taller than strays.
  const type = creatureDefBySpecies(creature.species)?.type
  const emojiSize = Math.round(boxSize * (type === 'wild' || type === 'mythic' ? 1 : 0.84))
  const groundW = large ? 184 : 64
  const groundH = large ? 46 : 18
  const shadowW = large ? 88 : 34
  const shadowH = large ? 17 : 7
  const typeColor = categoryCss(creature.poiCategory)

  // undefined while the render loads, null when it failed.
  const [src, setSrc] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(creature.species, creature.isShiny)
      .catch(() => null)
      .then((url) => { if (!cancelled) setSrc(url) })
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
    filter: creature.isShiny ? SHINY_OUTLINE : undefined,
  }
  const shown = spinSrc ?? src
  const figure = shown
    ? <img src={shown} width={emojiSize} height={emojiSize} alt={creature.species} style={{ display: 'block' }} />
    : shown === undefined ? <LoadingDot size={Math.round(emojiSize * 0.7)} /> : creature.emoji

  return (
    <div
      data-dropzone={large ? DROPZONE : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        userSelect: 'none', isolation: 'isolate',
        padding: large ? '8px 32px 4px' : undefined,
        borderRadius: large ? 6 : undefined,
        background: highlight ? accentAlpha(0.08) : undefined,
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
        background: 'rgba(51,40,30,0.18)',
        marginTop: large ? -10 : -5,
        animation: nomming ? undefined : `shadowPulse 2.2s ease-in-out infinite`,
        animationDelay: bobDelay(creature.id),
      }} />

      {/* Flat pad in the creature's type colour, under the contact shadow. */}
      <div style={{
        width: groundW, height: groundH,
        borderRadius: '50%',
        background: `${typeColor}4d`,
        transform: 'scale(0.7)',
        marginTop: large ? -30 : -12,
        position: 'relative', zIndex: -1,
      }} />
    </div>
  )
}

const TAG_SHADOW = '1px 2px 0 rgba(51,40,30,0.18)'
const TAG_LIFTED = '3px 5px 0 rgba(51,40,30,0.22)'

function buildGhostStyle(w: number, h: number): string {
  return [
    'position:fixed', 'pointer-events:none', `width:${w}px`, `height:${h}px`,
    'z-index:9999', 'display:flex', 'flex-direction:column', 'align-items:center',
    'gap:3px', 'padding:8px 10px 7px', `background:${paperLight}`, 'border-radius:6px',
    `box-shadow:${TAG_LIFTED}`, `border:1.5px solid ${ink}`,
    'transform:rotate(-3deg)', 'transition:none',
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
    g.style.boxShadow = onZone ? `0 0 0 2.5px ${forest}` : TAG_LIFTED
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
        minWidth: 76, padding: '8px 10px 7px', background: paperLight, borderRadius: 6,
        boxShadow: TAG_SHADOW,
        border: `1.5px solid ${overZone ? forest : ink}`,
        cursor: 'grab', userSelect: 'none', touchAction: 'none', flexShrink: 0,
      }}
    >
      {/* The hole for the tag's string. */}
      <span aria-hidden style={{ width: 7, height: 7, border: `1.5px solid ${ink}`, borderRadius: '50%', marginBottom: 1 }} />
      <EmojiSprite id={`food_${item.foodId}`} emoji={def.emoji} size={32} />
      <span style={{ fontSize: 12, fontWeight: 500, color: ink, textAlign: 'center', maxWidth: 76, lineHeight: '14px' }}>
        {def.name}
      </span>
      <Mono style={{ color: forest }}>
        +{def.xp} XP
      </Mono>
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
  const typeColor = categoryCss(creature.poiCategory)
  const no = CREATURES.findIndex((c) => c.species === creature.species) + 1

  function handleFed(foodItemId: string) {
    onFeed(creature.id, foodItemId)
    setFeedQueue((q) => q.filter((f) => f.id !== foodItemId))
    setHighlight(false)
    setNomming(true)
    setTimeout(() => setNomming(false), 600)
  }

  return createPortal(
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '88vh',
          ...paperSheet,
          borderRadius: '10px 10px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: line }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 16px calc(24px + env(safe-area-inset-bottom))' }}>

          {/* The plate: the creature on a wash of its type colour. The scene is the drop zone */}
          <div style={{
            position: 'relative', display: 'flex', justifyContent: 'center', padding: '14px 0 4px',
            background: `${typeColor}40`, border: `1px solid ${line}`, borderRadius: 3,
          }}>
            {creature.isShiny && (
              <Stamp color={ochreInk} tilt={-4} style={{ position: 'absolute', top: 10, left: 10 }}>
                ✨ Shiny
              </Stamp>
            )}
            <CreatureScene creature={creature} size="lg" nomming={nomming} highlight={highlight} />
          </div>

          <div style={{ padding: '14px 0 0' }}>
            <div style={{ fontSize: 28, fontWeight: 600, lineHeight: '34px', letterSpacing: '-0.01em', color: ink, overflowWrap: 'anywhere' }}>
              {creatureName(creature)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              <Mono style={{ fontSize: 12, fontWeight: 500, color: creature.isShiny ? ochreInk : inkSoft }}>
                {no > 0 && <>{t('creatures_specimen_no', { n: String(no).padStart(2, '0') })} · </>}
                {t('level_badge', { level: creature.level })}
              </Mono>
              <span aria-hidden style={{
                width: 10, height: 10, marginLeft: 6, flexShrink: 0,
                background: typeColor, border: `1.5px solid ${ink}`, borderRadius: '50%',
              }} />
              <Mono style={{ fontSize: 12 }}>{creature.poiCategory}</Mono>
            </div>
          </div>

          {!atCap ? (
            <div style={{ padding: '12px 0 0' }}>
              <div style={{ height: 12, border: `1.5px solid ${ink}`, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: creature.isShiny ? ochre : forest,
                  width: `${xpPct}%`, transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                <Mono>{creature.xp} / {xpNeeded} XP</Mono>
                <Mono>{t('creature_next_level')}</Mono>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <Stamp color={forest} tilt={-2}>{t('creature_max_level')}</Stamp>
            </div>
          )}

          <Mono style={{ display: 'block', marginTop: 10 }}>
            Found at {creature.poiOriginName}
          </Mono>

          <div style={{ borderTop: `1.5px dashed ${line}`, margin: '18px 0' }} />

          {feedQueue.length > 0 ? (
            <div>
              <SectionTitle style={{ marginBottom: 2 }}>
                Feed
              </SectionTitle>
              <Mono style={{ display: 'block', marginBottom: 12 }}>{t('creature_drag_food')}</Mono>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 4px 8px 0' }}>
                {feedQueue.map((item) => (
                  <FoodChip key={item.id} item={item} onFed={() => handleFed(item.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', border: `1.5px dashed ${pencil}`, borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: inkSoft }}>
                No food yet. Send a squad on an expedition to bring some back.
              </p>
            </div>
          )}

          <div style={{ borderTop: `1.5px dashed ${line}`, margin: '18px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InkButton variant="danger" onClick={onRelease} style={{ width: '100%' }}>
              Release {creature.species}
            </InkButton>
            <InkButton variant="paper" onClick={onClose} data-sfx="close" style={{ width: '100%' }}>
              Close
            </InkButton>
          </div>

        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export function CreatureSceneCard({ creature }: { creature: HatchedCreature }) {
  return <CreatureScene creature={creature} size="sm" />
}
