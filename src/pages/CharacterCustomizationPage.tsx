import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { createPlayerAvatar, type PlayerAvatar } from '@/lib/playerAvatar'
import {
  AVATAR_BODIES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, cosmeticItemsBySlot, toCssColor,
  type ColorSwatch, type CosmeticSlot,
} from '@/data/cosmetics'
import type { PlayerAppearance } from '@/types'
import type { Translations } from '@/i18n/types'
import { Mono, PageHeader } from '@/components/UI/Journal'
import { ink, line, paperCard, paperLight, paperShade, edge } from '@/lib/theme'
import { paperCardStyle, paperPage, paperTag } from '@/lib/paper'

// A choice in the options panel: a paper tag, filled with ink when selected.
function choiceStyle(selected: boolean) {
  return {
    ...paperTag, minHeight: 44, flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
    background: selected ? ink : paperCard, color: selected ? paperLight : ink,
  } as const
}

function ColorSwatchRow({ swatches, selectedId, onSelect }: {
  swatches: ColorSwatch[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 4 }}>
      {swatches.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          aria-label={s.label}
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

function ItemRow({ slot, selectedId, onSelect }: {
  slot: CosmeticSlot
  selectedId: string
  onSelect: (id: string) => void
}) {
  const items = cosmeticItemsBySlot(slot)
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 6px', scrollbarWidth: 'none' }}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          data-sfx="click"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            padding: '7px 9px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            ...paperCardStyle,
            ...(selectedId === item.id ? { border: `1.5px solid ${ink}`, background: paperShade } : { margin: 0.5 }),
          }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 6, boxSizing: 'border-box',
            ...(item.id === 'none'
              ? { border: '1.5px dashed #8C7A5C' }
              : { background: toCssColor(item.color), border: `1px solid ${edge}` }),
          }} />
          <Mono style={{ fontWeight: 500, color: ink, whiteSpace: 'nowrap' }}>
            {item.label}
          </Mono>
        </button>
      ))}
    </div>
  )
}

const BODY_LABEL_KEYS: Record<string, 'customize_style_short_hair' | 'customize_style_long_hair'> = {
  shortHair: 'customize_style_short_hair',
  longHair: 'customize_style_long_hair',
}

function BodyRow({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const { t } = useLocale()
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {AVATAR_BODIES.map((body) => (
        <button
          key={body.id}
          onClick={() => onSelect(body.id)}
          data-sfx="click"
          style={{ ...choiceStyle(selectedId === body.id), padding: '0 16px', fontSize: 15, fontWeight: 500 }}
        >
          {t(BODY_LABEL_KEYS[body.id])}
        </button>
      ))}
    </div>
  )
}

type Focus = 'body' | 'head' | 'feet'

// What the camera frames per focus, in avatar units: the height to look at, and
// the height and width that must fit in view. The avatar is 1.4 tall, its idle
// arms span about 1.3, and a turn or a sun hat needs room on top of that.
const FRAMES: Record<Focus, { y: number; h: number; w: number }> = {
  body: { y: 0.72, h: 2.0, w: 1.9 },
  head: { y: 1.12, h: 0.95, w: 1.15 },
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

type Tab = 'style' | 'skin' | 'hair' | 'eyes' | 'top' | 'bottom' | 'shoes' | 'headItem'

const TABS: { id: Tab; label: keyof Translations; focus: Focus }[] = [
  { id: 'style', label: 'customize_style', focus: 'body' },
  { id: 'skin', label: 'customize_skin_tone', focus: 'body' },
  { id: 'hair', label: 'customize_hair_color', focus: 'head' },
  { id: 'eyes', label: 'customize_eye_color', focus: 'head' },
  { id: 'top', label: 'customize_top', focus: 'body' },
  { id: 'bottom', label: 'customize_bottom', focus: 'body' },
  { id: 'shoes', label: 'customize_shoes', focus: 'feet' },
  { id: 'headItem', label: 'customize_head_item', focus: 'head' },
]

export function CharacterCustomizationPage() {
  const { t } = useLocale()
  const { profile, updateAppearance } = useProfile()
  const navigate = useNavigate()
  const { appearance } = profile
  const [tab, setTab] = useState<Tab>('style')
  const active = TABS.find((x) => x.id === tab) ?? TABS[0]

  // Only the options change per tab. The page never scrolls, so the character
  // stays in view while the player picks.
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      ...paperPage, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ flexShrink: 0 }}>
        <PageHeader
          kicker={
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <button
                onClick={() => navigate('/profile')}
                data-sfx="close"
                style={{
                  ...paperTag, width: 44, height: 44, flexShrink: 0, padding: 0, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 22, lineHeight: 1,
                }}
              >
                ←
              </button>
              {t('journal_kicker')}
            </span>
          }
          title={t('customize_title')}
        />
      </div>

      {/* The avatar is a large photo glued on the page */}
      <div style={{
        flex: 1, minHeight: 160, margin: '16px 20px 14px', padding: 8, boxSizing: 'border-box',
        background: paperCard, border: `1px solid ${line}`, borderRadius: 6,
        boxShadow: '1px 2px 0 rgba(51,40,30,0.22)', transform: 'rotate(-0.6deg)',
        display: 'flex',
      }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, borderRadius: 2, background: `${paperShade}99`, overflow: 'hidden' }}>
          <AvatarPreview appearance={appearance} focus={active.focus} />
        </div>
      </div>

      <div style={{
        flexShrink: 0, margin: '0 16px 10px', padding: '12px 0', borderRadius: 10,
        background: paperLight, border: `1px solid ${edge}`,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div role="tablist" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px', scrollbarWidth: 'none' }}>
          {TABS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === tab}
              onClick={() => setTab(x.id)}
              data-sfx="click"
              style={{ ...choiceStyle(x.id === tab), padding: '0 12px', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              {t(x.label)}
            </button>
          ))}
        </div>

        <div role="tabpanel" style={{ padding: '10px 12px 0', minHeight: 70, display: 'flex', alignItems: 'center', borderTop: `1px solid ${line}` }}>
          {tab === 'style' && <BodyRow selectedId={appearance.bodyId} onSelect={(id) => updateAppearance({ bodyId: id })} />}
          {tab === 'skin' && <ColorSwatchRow swatches={SKIN_TONES} selectedId={appearance.skinToneId} onSelect={(id) => updateAppearance({ skinToneId: id })} />}
          {tab === 'hair' && <ColorSwatchRow swatches={HAIR_COLORS} selectedId={appearance.hairColorId} onSelect={(id) => updateAppearance({ hairColorId: id })} />}
          {tab === 'eyes' && <ColorSwatchRow swatches={EYE_COLORS} selectedId={appearance.eyeColorId} onSelect={(id) => updateAppearance({ eyeColorId: id })} />}
          {tab === 'top' && <ItemRow slot="top" selectedId={appearance.topId} onSelect={(id) => updateAppearance({ topId: id })} />}
          {tab === 'bottom' && <ItemRow slot="bottom" selectedId={appearance.bottomId} onSelect={(id) => updateAppearance({ bottomId: id })} />}
          {tab === 'shoes' && <ItemRow slot="shoes" selectedId={appearance.shoesId} onSelect={(id) => updateAppearance({ shoesId: id })} />}
          {tab === 'headItem' && <ItemRow slot="headItem" selectedId={appearance.headItemId} onSelect={(id) => updateAppearance({ headItemId: id })} />}
        </div>
      </div>
    </div>
  )
}
