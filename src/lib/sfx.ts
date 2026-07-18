// Matches useBackgroundMusic.ts's SFX_STORAGE_KEY - same on/off toggle in Settings.
const SFX_STORAGE_KEY = 'sfx-enabled'
const SFX_VOLUME = 0.4 // was 0.5 - 20% quieter

function sfxEnabled(): boolean {
  const saved = localStorage.getItem(SFX_STORAGE_KEY)
  return saved !== null ? saved === 'true' : true
}

let ctx: AudioContext | null = null
const bufferCache = new Map<string, Promise<AudioBuffer>>()

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

// Web Audio (not a plain <audio> element) so we can round off the sample with a
// lowpass filter and a soft attack, instead of just volume/pitch - a raw click
// sample plays back sharp and bright otherwise.
async function play(src: string, { rate = 1, lowpassHz = 4000 }: { rate?: number; lowpassHz?: number } = {}) {
  if (!sfxEnabled()) return
  try {
    const context = getContext()
    const buffer = await loadBuffer(src)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpassHz

    const gain = context.createGain()
    const now = context.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(SFX_VOLUME, now + 0.008)

    source.connect(filter).connect(gain).connect(context.destination)
    source.start(now)
  } catch {
    // Autoplay-blocked context, decode failure, etc. - sfx is non-critical.
  }
}

export function playClickSfx() {
  play('/sounds/click.mp3', { rate: 0.85, lowpassHz: 3800 })
}

// Pitched and filtered down further from the same "plop" sample so close/back
// reads as a distinct, heavier "settling down" compared to the open click.
export function playCloseSfx() {
  play('/sounds/close.mp3', { rate: 0.72, lowpassHz: 2600 })
}
