export type SoundSample = {
  file: string
  weight?: number
}

export type SoundEvent = {
  label?: string
  /** Which volume slider the event obeys. Defaults to 'sfx'. */
  bus?: 'sfx' | 'music'
  /** Loops until stopped. Music events set this. */
  loop?: boolean
  samples: SoundSample[]
  gain?: number
  /** [min, max] playback rate; randomised per play. */
  rate?: [number, number]
  lowpassHz?: number
  cooldownMs?: number
  maxVoices?: number
}

export type Soundbank = {
  version: number
  /** Active pack id; samples resolve to /sounds/packs/<pack>/<file>. */
  pack: string
  masterGain?: number
  events: Record<string, SoundEvent>
}

export type SoundPack = {
  id: string
  name: string
  author?: string
  license?: string
  attribution?: string
  samples: { file: string; label?: string }[]
}
