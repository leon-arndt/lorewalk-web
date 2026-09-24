import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_APPEARANCE } from '@/data/cosmetics'
import { addPlayerAvatarLayer } from '@/lib/mapPlayerAvatar'
import { addVfxLayer } from '@/lib/mapVfx'
import { normalizeEffect, type VfxEffect } from '@/lib/vfx'

// Dev-only preview for the Particle Editor VSCode extension
// (tools/vscode-particles). The extension shows this page in an iframe and posts
// the effect under edit. The page plays it with the game's own particle code on
// the game's map, so the preview matches the game.

const REPEAT_MS = 3200
// Merlion Park: open ground with water behind it, so an effect reads clearly.
const START: [number, number] = [103.8545, 1.2868]

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: START,
  zoom: 17.5,
  pitch: 60,
  maxPitch: 80,
})

let spot = START
let effect: VfxEffect | null = null
let repeat = true
let repeatTimer = 0

map.on('load', async () => {
  const [vfx] = await Promise.all([
    addVfxLayer(map),
    // The avatar stands at the start spot for scale, like the player on the game map.
    addPlayerAvatarLayer(map, { position: START, appearance: DEFAULT_APPEARANCE, modelScale: 4 }),
  ])

  const play = () => {
    vfx.clear()
    if (effect) vfx.play(effect, spot)
  }
  const schedule = () => {
    clearInterval(repeatTimer)
    if (repeat && effect && !effect.loop) repeatTimer = window.setInterval(play, REPEAT_MS)
  }

  map.on('click', (e) => {
    spot = [e.lngLat.lng, e.lngLat.lat]
    play()
    schedule()
  })

  window.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data
    if (msg?.type === 'play') {
      effect = normalizeEffect(msg.effect ?? {})
      repeat = msg.repeat !== false
      play()
      schedule()
    } else if (msg?.type === 'clear') {
      effect = null
      clearInterval(repeatTimer)
      vfx.clear()
    } else if (msg?.type === 'resetSpot') {
      spot = START
      map.easeTo({ center: START })
      play()
    }
  })

  setInterval(() => window.parent.postMessage({ type: 'stats', particles: vfx.particleCount() }, '*'), 250)
  window.parent.postMessage({ type: 'previewReady' }, '*')
})
