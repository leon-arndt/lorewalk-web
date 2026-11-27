import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { createPlayerAvatar, type PlayerAvatar } from '@/lib/playerAvatar'
import { appearanceKey, getAvatarCropURL, type AvatarCrop } from '@/lib/creaturePreview'
import {
  AVATAR_BODIES, COSMETIC_SLOTS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, ITEM_COLORS, SLOT_FIELD,
  cosmeticItemById, cosmeticItemsBySlot, chosenItemColor, toCssColor,
  type ColorSwatch, type CosmeticSlot,
} from '@/data/cosmetics'
import type { PlayerAppearance } from '@/types'
import type { Translations } from '@/i18n/types'
import { Mono, PageHeader } from '@/components/UI/Journal'
import { Icon, type IconName } from '@/components/UI/Icons'
import { LoadingDot } from '@/components/UI/LoadingDot'
import { ink, inkSoft, line, paperCard, paperLight, paperShade, edge } from '@/lib/theme'
import { paperPage, RADIUS } from '@/lib/paper'

// Every tab shows its choices in one grid, so nothing scrolls sideways. An item
// tab has five columns. The hair tab has one column for each hairstyle.
const gridOf = (n: number) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: 8, width: '100%' }) as const
const ITEM_COLUMNS = 5
const DOT_ROW = 36
// The height of an item tab: a row of square cards with a name, then the colour dots.
// Every tab gets it, so the photo above does not jump. 100cqw is the width of the tab panel.
const PANEL_HEIGHT = `calc((100cqw - ${(ITEM_COLUMNS - 1) * 8}px) / ${ITEM_COLUMNS} + ${21 + 8 + DOT_ROW}px)`

function ColorSwatches({ swatches, selectedId, onSelect, columns }: {
  swatches: ColorSwatch[]
  selectedId: string
  onSelect: (id: string) => void
  columns: number
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8, justifyItems: 'center', alignItems: 'center' }}>
      {swatches.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          aria-label={s.label}
          aria-pressed={selectedId === s.id}
          data-sfx="click"
          style={{
            width: 44, height: 44, padding: 0, borderRadius: '50%', cursor: 'pointer',
            background: toCssColor(s.color),
            border: `1px solid ${edge}`,
            boxShadow: selectedId === s.id ? `0 0 0 2px ${paperLight}, 0 0 0 4px ${ink}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// One choice as a card: a close-up of the avatar with that choice on, and its name.
// A compact card is too narrow for the name, so it shows the picture only.
function ChoiceCard({ look, crop, label, selected, onSelect, compact }: {
  look: PlayerAppearance
  crop: AvatarCrop
  label: string
  selected: boolean
  onSelect: () => void
  compact?: boolean
}) {
  const [src, setSrc] = useState<string | null>(null)
  // The caller builds `look` on each render, so the effect follows its key.
  const lookKey = appearanceKey(look)
  useEffect(() => {
    let cancelled = false
    getAvatarCropURL(look, crop).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [lookKey, crop]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={compact ? label : undefined}
      aria-pressed={selected}
      data-sfx="click"
      style={{
        minWidth: 0, padding: 3, cursor: 'pointer', fontFamily: 'inherit', color: ink,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3,
        background: paperCard, borderRadius: RADIUS,
        border: `1px solid ${selected ? ink : line}`,
        boxShadow: selected ? `0 0 0 1px ${ink}` : '1px 2px 0 rgba(51,40,30,0.14)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        aspectRatio: '1', borderRadius: RADIUS - 3, overflow: 'hidden', background: `${paperShade}80`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {src
          ? <img src={src} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
          : <LoadingDot size={32} />}
      </span>
      {!compact && (
        <span style={{
          fontSize: 12, fontWeight: 500, lineHeight: '16px', color: selected ? ink : inkSoft, textAlign: 'center',
          padding: '0 1px 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

const SLOT_CROP: Record<CosmeticSlot, AvatarCrop> = { top: 'top', bottom: 'bottom', shoes: 'shoes', headItem: 'head', glasses: 'head' }

// The items of a slot, then the colours for the item that the avatar has on.
// Each item keeps its own colour, so a card shows the item as the player left it.
function ItemGrid({ slot, appearance, onChange }: {
  slot: CosmeticSlot
  appearance: PlayerAppearance
  onChange: (patch: Partial<PlayerAppearance>) => void
}) {
  const { t } = useLocale()
  const field = SLOT_FIELD[slot]
  const worn = cosmeticItemById(appearance[field])
  const chosenId = chosenItemColor(appearance, slot)?.id ?? ''
  const tintable = !!worn && !worn.empty
  const dots: ColorSwatch[] = [{ id: '', label: t('customize_color_original'), color: worn?.color ?? 0 }, ...ITEM_COLORS]
  const setColor = (id: string) => {
    if (!worn) return
    const itemColors = { ...appearance.itemColors }
    if (id) itemColors[worn.id] = id
    else delete itemColors[worn.id]
    onChange({ itemColors })
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={gridOf(ITEM_COLUMNS)}>
        {cosmeticItemsBySlot(slot).map((item) => (
          <ChoiceCard
            key={item.id}
            look={{ ...appearance, [field]: item.id }}
            crop={SLOT_CROP[slot]}
            label={item.label}
            selected={appearance[field] === item.id}
            onSelect={() => onChange({ [field]: item.id })}
          />
        ))}
      </div>
      <div
        role="group"
        aria-label={t('customize_color')}
        style={{
          display: 'grid', gridTemplateColumns: `repeat(${dots.length}, minmax(0, 1fr))`,
          visibility: tintable ? 'visible' : 'hidden',
        }}
      >
        {dots.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColor(c.id)}
            aria-label={c.label}
            aria-pressed={chosenId === c.id}
            data-sfx="click"
            style={{
              height: DOT_ROW, padding: 0, cursor: 'pointer', background: 'transparent', border: 'none',
              display: 'grid', placeItems: 'center', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: '50%', boxSizing: 'border-box',
              background: toCssColor(c.color), border: `1px solid ${edge}`,
              boxShadow: chosenId === c.id ? `0 0 0 2px ${paperLight}, 0 0 0 4px ${ink}` : undefined,
            }} />
          </button>
        ))}
      </div>
    </div>
  )
}

const BODY_LABEL_KEYS: Record<string, keyof Translations> = {
  shortHair: 'customize_style_short_hair',
  longHair: 'customize_style_long_hair',
  spiky: 'customize_style_spiky',
  bob: 'customize_style_bob',
  ponytail: 'customize_style_ponytail',
  pigtails: 'customize_style_pigtails',
}

// The hairstyles in one row, the hair colours below them.
function HairPanel({ appearance, onBody, onColor }: {
  appearance: PlayerAppearance
  onBody: (id: string) => void
  onColor: (id: string) => void
}) {
  const { t } = useLocale()
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={gridOf(AVATAR_BODIES.length)}>
        {AVATAR_BODIES.map((body) => (
          <ChoiceCard
            key={body.id}
            compact
            look={{ ...appearance, bodyId: body.id, headItemId: 'none' }}
            crop="head"
            label={t(BODY_LABEL_KEYS[body.id])}
            selected={appearance.bodyId === body.id}
            onSelect={() => onBody(body.id)}
          />
        ))}
      </div>
      <ColorSwatches swatches={HAIR_COLORS} selectedId={appearance.hairColorId} onSelect={onColor} columns={6} />
    </div>
  )
}

type Focus = 'body' | 'head' | 'legs' | 'feet'

// What the camera frames per focus, in avatar units: the height to look at, and
// the height and width that must fit in view. The avatar is 1.4 tall, its idle
// arms span about 1.3, and a turn or a sun hat needs room on top of that.
const FRAMES: Record<Focus, { y: number; h: number; w: number }> = {
  body: { y: 0.72, h: 2.0, w: 1.9 },
  head: { y: 1.12, h: 0.95, w: 1.15 },
  legs: { y: 0.36, h: 1.05, w: 1.2 },
  feet: { y: 0.28, h: 0.8, w: 0.9 },
}
const FOV = 35
// After a drag, the avatar eases back to a gentle sway around the front view.
const REST_AFTER_MS = 2500

function AvatarPreview({ appearance, focus }: { appearance: PlayerAppearance; focus: Focus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rebuildRef = useRef<((next: PlayerAppearance) => void) | null>(null)
  const focusRef = useRef(focus)
  useEffect(() => { focusRef.current = focus }, [focus])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let frameId = 0
    let cleanup: (() => void) | null = null

    ;(async () => {
      const THREE = await import('three')
      if (disposed) return

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      scene.add(new THREE.AmbientLight(0xffffff, 1.4))
      const sun = new THREE.DirectionalLight(0xffffff, 2.2)
      sun.position.set(0.6, 1, 0.6)
      scene.add(sun)

      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20)
      const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)

      let avatar: PlayerAvatar | null = null
      let buildToken = 0
      const build = async (next: PlayerAppearance, greet: boolean) => {
        const token = ++buildToken
        const built = await createPlayerAvatar(next)
        if (disposed || token !== buildToken) { built.dispose(); return }
        avatar?.dispose()
        avatar = built
        scene.add(built.root)
        if (greet) built.wave()
      }
      rebuildRef.current = (next) => { build(next, true) }
      await build(appearance, false)

      let yaw = 0
      let dragX: number | null = null
      let lastDragMs = -Infinity
      const onDown = (e: PointerEvent) => { dragX = e.clientX; canvas.setPointerCapture(e.pointerId) }
      const onMove = (e: PointerEvent) => {
        if (dragX === null) return
        yaw += (e.clientX - dragX) * 0.012
        dragX = e.clientX
        lastDragMs = performance.now()
      }
      const onUp = () => { dragX = null; lastDragMs = performance.now() }
      canvas.addEventListener('pointerdown', onDown)
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerup', onUp)
      canvas.addEventListener('pointercancel', onUp)

      const tanHalf = Math.tan((FOV * Math.PI) / 360)
      let lookY = FRAMES.body.y
      let dist = 3.2
      let lastMs = performance.now()
      const animate = (nowMs: number) => {
        if (disposed) return
        const dt = Math.min((nowMs - lastMs) / 1000, 0.1)
        lastMs = nowMs
        const ease = 1 - Math.exp(-dt * 6)

        const frame = FRAMES[focusRef.current]
        const want = Math.max(frame.h / 2 / tanHalf, frame.w / 2 / (tanHalf * camera.aspect))
        lookY += (frame.y - lookY) * ease
        dist += (want - dist) * ease
        camera.position.set(0, lookY + dist * 0.12, dist)
        camera.lookAt(0, lookY, 0)

        if (dragX === null && nowMs - lastDragMs > REST_AFTER_MS) {
          const rest = 0.3 * Math.sin(nowMs / 1600)
          yaw += Math.atan2(Math.sin(rest - yaw), Math.cos(rest - yaw)) * ease * 0.5
        }
        if (avatar) {
          avatar.root.rotation.y = yaw
          avatar.update(dt)
        }
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(animate)
      }
      frameId = requestAnimationFrame(animate)
      cleanup = () => {
        cancelAnimationFrame(frameId)
        observer.disconnect()
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerup', onUp)
        canvas.removeEventListener('pointercancel', onUp)
        avatar?.dispose()
        renderer.dispose()
      }
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      cleanup?.()
      rebuildRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    rebuildRef.current?.(appearance)
  }, [appearance])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab' }}
    />
  )
}

type Tab = 'skin' | 'hair' | 'eyes' | CosmeticSlot
const isSlot = (tab: Tab): tab is CosmeticSlot => (COSMETIC_SLOTS as Tab[]).includes(tab)

const TABS: { id: Tab; label: keyof Translations; icon: IconName; focus: Focus }[] = [
  { id: 'skin', label: 'customize_skin_tone', icon: 'face', focus: 'body' },
  { id: 'hair', label: 'customize_hair', icon: 'hair', focus: 'head' },
  { id: 'eyes', label: 'customize_eye_color', icon: 'eye', focus: 'head' },
  { id: 'glasses', label: 'customize_glasses', icon: 'glasses', focus: 'head' },
  { id: 'top', label: 'customize_top', icon: 'top', focus: 'body' },
  { id: 'bottom', label: 'customize_bottom', icon: 'bottom', focus: 'legs' },
  { id: 'shoes', label: 'customize_shoes', icon: 'shoes', focus: 'feet' },
  { id: 'headItem', label: 'customize_head_item', icon: 'hat', focus: 'head' },
]

// The name of what the avatar has on in a tab, for the caption above the choices.
function chosenLabel(tab: Tab, a: PlayerAppearance, t: (key: keyof Translations) => string): string {
  const swatch = (list: ColorSwatch[], id: string) => list.find((x) => x.id === id)?.label ?? ''
  if (tab === 'skin') return swatch(SKIN_TONES, a.skinToneId)
  if (tab === 'eyes') return swatch(EYE_COLORS, a.eyeColorId)
  if (tab === 'hair') return `${BODY_LABEL_KEYS[a.bodyId] ? t(BODY_LABEL_KEYS[a.bodyId]) : ''} · ${swatch(HAIR_COLORS, a.hairColorId)}`
  if (!isSlot(tab)) return ''
  const item = cosmeticItemById(a[SLOT_FIELD[tab]])?.label ?? ''
  const color = chosenItemColor(a, tab)?.label
  return color ? `${item} · ${color}` : item
}

export function CharacterCustomizationPage() {
  const { t } = useLocale()
  const { profile, updateAppearance } = useProfile()
  const navigate = useNavigate()
  const { appearance } = profile
  const [tab, setTab] = useState<Tab>('skin')
  const active = TABS.find((x) => x.id === tab) ?? TABS[0]

  // Only the options change per tab. The page never scrolls, so the character
  // stays in view while the player picks.
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ flexShrink: 0 }}>
        <PageHeader back={() => navigate('/profile')} title={t('customize_title')} />
      </div>

      {/* The avatar is a large photo glued on the page */}
      <div style={{
        flex: 1, minHeight: 140, margin: '14px 20px 12px', padding: 8, boxSizing: 'border-box',
        background: paperCard, border: `1px solid ${line}`, borderRadius: 6,
        boxShadow: '1px 2px 0 rgba(51,40,30,0.22)', transform: 'rotate(-0.6deg)',
        display: 'flex',
      }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, borderRadius: 2, background: `${paperShade}99`, overflow: 'hidden' }}>
          <AvatarPreview appearance={appearance} focus={active.focus} />
        </div>
      </div>

      <div style={{
        flexShrink: 0, margin: '0 12px 8px', borderRadius: RADIUS,
        background: paperLight, border: `1px solid ${edge}`,
      }}>
        {/* Eight tabs of one width: they fit a narrow phone without a scroll. */}
        <div role="tablist" style={{
          display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))`, gap: 3, padding: 5,
          borderBottom: `1px solid ${line}`,
        }}>
          {TABS.map((x) => {
            const on = x.id === tab
            return (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={t(x.label)}
                onClick={() => setTab(x.id)}
                data-sfx="click"
                style={{
                  height: 44, padding: 0, cursor: 'pointer', borderRadius: RADIUS - 2,
                  display: 'grid', placeItems: 'center',
                  background: on ? ink : 'transparent', color: on ? paperLight : inkSoft,
                  border: 'none', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon name={x.icon} size={24} />
              </button>
            )
          })}
        </div>

        <div role="tabpanel" style={{ padding: '8px 10px 10px', containerType: 'inline-size' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: '20px', color: ink }}>{t(active.label)}</span>
            <Mono style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {chosenLabel(tab, appearance, t)}
            </Mono>
          </div>
          {/* One height for every tab, so the photo above does not jump. */}
          <div style={{ minHeight: PANEL_HEIGHT, display: 'flex', alignItems: 'center' }}>
            {tab === 'skin' && <div style={{ width: '100%' }}><ColorSwatches swatches={SKIN_TONES} selectedId={appearance.skinToneId} onSelect={(id) => updateAppearance({ skinToneId: id })} columns={6} /></div>}
            {tab === 'hair' && <HairPanel appearance={appearance} onBody={(id) => updateAppearance({ bodyId: id })} onColor={(id) => updateAppearance({ hairColorId: id })} />}
            {tab === 'eyes' && <div style={{ width: '100%' }}><ColorSwatches swatches={EYE_COLORS} selectedId={appearance.eyeColorId} onSelect={(id) => updateAppearance({ eyeColorId: id })} columns={6} /></div>}
            {isSlot(tab) && <ItemGrid slot={tab} appearance={appearance} onChange={updateAppearance} />}
          </div>
        </div>
      </div>
    </div>
  )
}
