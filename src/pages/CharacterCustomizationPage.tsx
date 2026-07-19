import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { buildProceduralAvatar } from '@/lib/mapPlayerAvatar'
import {
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, cosmeticItemsBySlot, toCssColor,
  type ColorSwatch, type CosmeticSlot,
} from '@/data/cosmetics'
import type { PlayerAppearance } from '@/types'

function ColorSwatchRow({ swatches, selectedId, onSelect }: {
  swatches: ColorSwatch[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {swatches.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          aria-label={s.label}
          data-sfx="click"
          style={{
            width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
            background: toCssColor(s.color),
            border: selectedId === s.id ? '3px solid #059669' : '3px solid white',
            boxShadow: selectedId === s.id ? '0 0 0 2px #059669' : '0 1px 4px rgba(0,0,0,0.15)',
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
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          data-sfx="click"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 10px', borderRadius: 12, cursor: 'pointer', flexShrink: 0,
            background: selectedId === item.id ? '#ecfdf5' : 'white',
            border: selectedId === item.id ? '2px solid #059669' : '2px solid transparent',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: 8,
            background: item.id === 'none' ? '#e2e8f0' : toCssColor(item.color),
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}

function AvatarPreview({ appearance }: { appearance: PlayerAppearance }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rebuildRef = useRef<((next: PlayerAppearance) => void) | null>(null)

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
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      scene.add(new THREE.AmbientLight(0xffffff, 1.4))
      const sun = new THREE.DirectionalLight(0xffffff, 2.2)
      sun.position.set(0.6, 1, 0.6)
      scene.add(sun)

      const camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 10)
      camera.position.set(0, 0.85, 2.4)
      camera.lookAt(0, 0.7, 0)

      let avatar = buildProceduralAvatar(THREE, appearance)
      scene.add(avatar)

      rebuildRef.current = (next) => {
        scene.remove(avatar)
        avatar = buildProceduralAvatar(THREE, next)
        scene.add(avatar)
      }

      const animate = () => {
        if (disposed) return
        avatar.rotation.y += 0.012
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(animate)
      }
      animate()
      cleanup = () => {
        cancelAnimationFrame(frameId)
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
      style={{ width: '100%', height: 260, display: 'block' }}
    />
  )
}

export function CharacterCustomizationPage() {
  const { t } = useLocale()
  const { profile, updateAppearance } = useProfile()
  const navigate = useNavigate()
  const { appearance } = profile

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc',
        padding: '20px 16px 14px', borderBottom: '1px solid #eef2f7',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/profile')}
          data-sfx="close"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: '#1e293b', padding: 0, lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{t('customize_title')}</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <AvatarPreview appearance={appearance} />
        </div>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_skin_tone')}</h2>
          <ColorSwatchRow swatches={SKIN_TONES} selectedId={appearance.skinToneId} onSelect={(id) => updateAppearance({ skinToneId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_hair_color')}</h2>
          <ColorSwatchRow swatches={HAIR_COLORS} selectedId={appearance.hairColorId} onSelect={(id) => updateAppearance({ hairColorId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_eye_color')}</h2>
          <ColorSwatchRow swatches={EYE_COLORS} selectedId={appearance.eyeColorId} onSelect={(id) => updateAppearance({ eyeColorId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_top')}</h2>
          <ItemRow slot="top" selectedId={appearance.topId} onSelect={(id) => updateAppearance({ topId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_bottom')}</h2>
          <ItemRow slot="bottom" selectedId={appearance.bottomId} onSelect={(id) => updateAppearance({ bottomId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_shoes')}</h2>
          <ItemRow slot="shoes" selectedId={appearance.shoesId} onSelect={(id) => updateAppearance({ shoesId: id })} />
        </section>

        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t('customize_head_item')}</h2>
          <ItemRow slot="headItem" selectedId={appearance.headItemId} onSelect={(id) => updateAppearance({ headItemId: id })} />
        </section>
      </div>
    </div>
  )
}
