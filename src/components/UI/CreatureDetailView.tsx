import { useEffect, useRef, useState } from 'react'
import { getFoodDef } from '@/data/foods'
import { getCreaturePreviewURL } from '@/lib/creaturePreview'
import { creatureName, xpForCreatureLevel } from '@/lib/profile'
import type { FoodItem, HatchedCreature } from '@/types'
import { pageBackground } from '@/lib/glass'
import { rewardGradient, rewardGradientHorizontal } from '@/lib/theme'

const DROPZONE = 'creature'

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
  const emojiSize = large ? 96 : 44
  const groundW = large ? 160 : 84
  const groundH = large ? 46 : 24
  const shadowW = large ? 70 : 36
  const shadowH = large ? 14 : 7

  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getCreaturePreviewURL(creature.species, creature.isShiny).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [creature.species, creature.isShiny])

  return (
    <div
      data-dropzone={large ? DROPZONE : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        userSelect: 'none',
        padding: large ? '12px 32px 12px' : undefined,
        borderRadius: large ? 20 : undefined,
        background: highlight ? 'rgba(99,102,241,0.08)' : undefined,
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        fontSize: emojiSize,
        lineHeight: 1,
        display: 'block',
        animation: nomming
          ? 'creatureNom 0.55s ease forwards'
          : `creatureBob 2.2s ease-in-out infinite`,
        animationDelay: nomming ? '0s' : bobDelay(creature.id),
        filter: creature.isShiny ? 'drop-shadow(0 0 10px rgba(245,158,11,0.75))' : undefined,
      }}>
        {src
          ? <img src={src} width={emojiSize} height={emojiSize} alt={creature.species} style={{ display: 'block' }} />
          : creature.emoji}
      </span>

      <div style={{
        width: shadowW, height: shadowH,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.22)',
        marginTop: large ? -10 : -5,
        animation: nomming ? undefined : `shadowPulse 2.2s ease-in-out infinite`,
        animationDelay: bobDelay(creature.id),
      }} />

      <div style={{
        width: groundW, height: groundH,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 42% 32%, #4ade80 0%, #22c55e 40%, #16a34a 68%, #166534 100%)',
        boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.28), inset 0 3px 6px rgba(255,255,255,0.18), 0 5px 12px rgba(0,0,0,0.18)',
        marginTop: large ? -16 : -8,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: large ? '2px 18px 0' : '1px 10px 0',
      }}>
        <span style={{ fontSize: large ? 13 : 7, lineHeight: 1 }}>🌱</span>
        <span style={{ fontSize: large ? 11 : 6, lineHeight: 1 }}>🌱</span>
      </div>
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
          background: pageBackground,
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
                background: creature.isShiny ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : rewardGradient,
                color: 'white',
              }}>
                Lv. {creature.level}
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
                <span>Next level</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#818cf8', marginTop: 4 }}>MAX LEVEL</div>
          )}

          <div style={{ textAlign: 'center', padding: '8px 24px 0', fontSize: 12, color: '#94a3b8' }}>
            Found at {creature.poiOriginName}
          </div>

          <div style={{ height: 1, background: '#e2e8f0', margin: '20px 24px' }} />

          {feedQueue.length > 0 ? (
            <div style={{ padding: '0 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Feed</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Drag a food onto the creature</div>
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
