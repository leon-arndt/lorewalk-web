import type { Soundbank, SoundEvent } from '../types/soundbank'

// Matches useBackgroundMusic.ts's SFX_STORAGE_KEY - same volume slider in Settings.
const SFX_STORAGE_KEY = 'sfx-volume'
const BANK_URL = '/sounds/soundbank.json'

// Fallback so sfx still works if the bank is missing or malformed - a broken
// edit in the soundbank editor must not take the click sound down with it.
const FALLBACK_BANK: Soundbank = {
  version: 1,
  pack: 'default',
  masterGain: 0.4,
  events: {
    'ui/click': { samples: [{ file: 'click.mp3', weight: 1 }], gain: 1, rate: [0.85, 0.85], lowpassHz: 3800 },
    'ui/close': { samples: [{ file: 'close.mp3', weight: 1 }], gain: 1, rate: [0.72, 0.72], lowpassHz: 2600 },
    'music/town-theme': { samples: [{ file: 'town-theme.mp3', weight: 1 }], gain: 1, bus: 'music', loop: true },
  },
}

function sfxVolume(): number {
  const saved = localStorage.getItem(SFX_STORAGE_KEY)
  return saved !== null ? Number(saved) : 1
}

let ctx: AudioContext | null = null
const bufferCache = new Map<string, Promise<AudioBuffer>>()

let bank: Soundbank = FALLBACK_BANK
let bankLoad: Promise<Soundbank> | null = null

function loadBank(): Promise<Soundbank> {
  if (!bankLoad) {
    bankLoad = fetch(BANK_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Soundbank) => {
        if (json && json.events) bank = json
        return bank
      })
      .catch(() => bank)
  }
  return bankLoad
}

export function sampleUrl(pack: string, file: string): string {
  return `/sounds/packs/${pack}/${file}`
}

// Music streams through an <audio> element instead of the Web Audio graph below,
// so useBackgroundMusic only needs the file and the gain that the bank holds.
export async function resolveEvent(eventId: string): Promise<{ event: SoundEvent; url: string } | null> {
  const loaded = await loadBank()
  const event = loaded.events[eventId]
  const file = event && pickSample(event)
  if (!event || !file) return null
  return { event, url: sampleUrl(loaded.pack, file) }
}

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function loadBuffer(src: string): Promise<AudioBuffer> {
  let p = bufferCache.get(src)
  if (!p) {
    p = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => getContext().decodeAudioData(data))
    bufferCache.set(src, p)
  }
  return p
}

function pickSample(event: SoundEvent): string | null {
  const samples = event.samples ?? []
  if (samples.length === 0) return null
  const total = samples.reduce((sum, s) => sum + (s.weight ?? 1), 0)
  let roll = Math.random() * total
  for (const s of samples) {
    roll -= s.weight ?? 1
    if (roll <= 0) return s.file
  }
  return samples[samples.length - 1].file
}

const lastPlayed = new Map<string, number>()
const activeVoices = new Map<string, number>()

// Web Audio (not a plain <audio> element) so we can round off the sample with a
// lowpass filter and a soft attack, instead of just volume/pitch - a raw click
// sample plays back sharp and bright otherwise.
export async function playSfx(eventId: string) {
  const volume = sfxVolume()
  if (volume <= 0) return
  try {
    const loaded = await loadBank()
    const event = loaded.events[eventId]
    if (!event) return

    const now = performance.now()
    const cooldown = event.cooldownMs ?? 0
    if (cooldown > 0 && now - (lastPlayed.get(eventId) ?? -Infinity) < cooldown) return

    const maxVoices = event.maxVoices ?? 8
    if ((activeVoices.get(eventId) ?? 0) >= maxVoices) return

    const file = pickSample(event)
    if (!file) return

    const context = getContext()
    const buffer = await loadBuffer(sampleUrl(loaded.pack, file))

    const [rateMin, rateMax] = event.rate ?? [1, 1]
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rateMin + Math.random() * (rateMax - rateMin)

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = event.lowpassHz ?? 20000

    const gain = context.createGain()
    const t = context.currentTime
    const peak = (loaded.masterGain ?? 1) * (event.gain ?? 1) * volume
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(peak, t + 0.008)

    source.connect(filter).connect(gain).connect(context.destination)

    lastPlayed.set(eventId, now)
    activeVoices.set(eventId, (activeVoices.get(eventId) ?? 0) + 1)
    source.onended = () => activeVoices.set(eventId, Math.max(0, (activeVoices.get(eventId) ?? 1) - 1))
    source.start(t)
  } catch {
    // Autoplay-blocked context, decode failure, etc. - sfx is non-critical.
  }
}

export function playClickSfx() {
  playSfx('ui/click')
}

export function playCloseSfx() {
  playSfx('ui/close')
}
