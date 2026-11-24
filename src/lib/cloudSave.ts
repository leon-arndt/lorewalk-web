import type { PlayerProfile } from '@/types'
import { supabase } from '@/lib/supabase'
import { isFreshProfile, normalizeProfile } from '@/lib/profile'

// The cloud save is the whole profile as one JSON row in player_saves, guarded
// by a revision number. See supabase/migrations/20261124000000_player_saves.sql.

const META_KEY = 'lorewalk.cloudSave'

// What this device knows about the server copy. It lives beside the profile
// in localStorage, not inside it, because it describes the device, not the player.
export interface CloudSaveMeta {
  userId: string            // the account this device last synced with
  revision: number          // the server revision this device last read or wrote
  dirty: boolean            // the local profile changed after that revision
  syncedAt: string | null
}

export function loadMeta(): CloudSaveMeta | null {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as CloudSaveMeta | null
  } catch {
    return null
  }
}

export function saveMeta(meta: CloudSaveMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    // ignore quota / private-mode failures
  }
}

export function markDirty() {
  const meta = loadMeta()
  if (meta && !meta.dirty) saveMeta({ ...meta, dirty: true })
}

export type SyncDecision = 'none' | 'push' | 'pull' | 'conflict'

// serverRevision is null when the account has no save yet.
export function decideSync(
  meta: CloudSaveMeta | null,
  userId: string,
  serverRevision: number | null,
  localIsFresh: boolean,
): SyncDecision {
  if (serverRevision === null) return 'push'
  // First sync of this account on this device: the two saves share no history.
  if (meta?.userId !== userId) return localIsFresh ? 'pull' : 'conflict'
  if (serverRevision === meta.revision) return meta.dirty ? 'push' : 'none'
  // Another device saved after this one last synced.
  return meta.dirty ? 'conflict' : 'pull'
}

export interface CloudSave {
  profile: unknown
  revision: number
  updatedAt: string
}

// undefined = the request failed, null = the account has no save.
export async function fetchRevision(userId: string): Promise<number | null | undefined> {
  const { data, error } = await supabase
    .from('player_saves')
    .select('revision')
    .eq('player_id', userId)
    .maybeSingle()
  if (error) { console.warn('cloud save check failed', error.message); return undefined }
  return data ? Number(data.revision) : null
}

export async function fetchSave(userId: string): Promise<CloudSave | null | undefined> {
  const { data, error } = await supabase
    .from('player_saves')
    .select('profile, revision, updated_at')
    .eq('player_id', userId)
    .maybeSingle()
  if (error) { console.warn('cloud save read failed', error.message); return undefined }
  if (!data) return null
  return { profile: data.profile, revision: Number(data.revision), updatedAt: data.updated_at as string }
}

export type PushResult =
  | { status: 'saved'; revision: number }
  | { status: 'conflict' }
  | { status: 'error' }

export async function pushSave(profile: PlayerProfile, baseRevision: number): Promise<PushResult> {
  const { data, error } = await supabase.rpc('save_profile', {
    p_profile: profile,
    p_base_revision: baseRevision,
  })
  const row = (data as { status: string; revision: number }[] | null)?.[0]
  if (error || !row) {
    console.warn('cloud save write failed', error?.message)
    return { status: 'error' }
  }
  if (row.status !== 'saved') return { status: 'conflict' }
  return { status: 'saved', revision: Number(row.revision) }
}

// ─── Sync engine ─────────────────────────────────────────────────────────────

export type CloudSyncStatus = 'off' | 'syncing' | 'synced' | 'error'

// Two saves that share no common history. The player picks one, because a
// merge of two whole profiles could duplicate creatures or coins.
export interface CloudConflict {
  cloud: PlayerProfile
  revision: number
  updatedAt: string
}

export interface CloudSaveState {
  status: CloudSyncStatus
  conflict: CloudConflict | null
  // False after the player put the choice off. Settings opens it again.
  conflictOpen: boolean
}

// A change waits this long before it uploads, so a burst of changes is one write.
const PUSH_DELAY_MS = 2_000
// Steps change the profile every few seconds on a walk. This caps the uploads.
const PUSH_INTERVAL_MS = 30_000

// Lives outside React on purpose: its timers and in-flight requests must
// survive re-renders, and a render must never see half of a sync.
export class CloudSaveEngine {
  // Called with a cloud save that replaces the local profile.
  onAdopt: (profile: PlayerProfile) => void = () => {}

  private userId: string | null = null
  private profile: PlayerProfile
  private adopted: PlayerProfile | null = null
  private busy = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastPushAt = 0
  private state: CloudSaveState = { status: 'off', conflict: null, conflictOpen: false }
  private listeners = new Set<() => void>()

  constructor(profile: PlayerProfile) {
    this.profile = profile
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getState = () => this.state

  private setState(patch: Partial<CloudSaveState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  // null = no linked account: signed out, anonymous, or offline mode.
  setUser(userId: string | null) {
    if (userId === this.userId) return
    this.userId = userId
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.setState({ status: userId ? 'syncing' : 'off', conflict: null, conflictOpen: false })
    if (userId) void this.sync()
  }

  // housekeeping = a change the player did not make, such as the map spawning
  // food nodes at every start. It uploads with the next real change. If it
  // counted as progress, a device that only opened the app would look as if
  // it held unsaved play, and a newer cloud save would raise a false conflict.
  profileChanged(profile: PlayerProfile, housekeeping = false) {
    if (profile === this.profile) return
    this.profile = profile
    if (housekeeping || profile === this.adopted) return
    markDirty()
    this.schedulePush()
  }

  // Compares this device with the server and uploads, downloads, or asks.
  async sync() {
    const uid = this.userId
    if (!uid || this.busy || this.state.conflict) return
    this.busy = true
    this.setState({ status: 'syncing' })
    try {
      // Read before the request: a change that lands while it is in flight
      // must not turn a plain download into a conflict.
      const meta = loadMeta()
      const serverRevision = await fetchRevision(uid)
      if (this.userId !== uid) return
      if (serverRevision === undefined) { this.setState({ status: 'error' }); return }

      const decision = decideSync(meta, uid, serverRevision, isFreshProfile(this.profile))
      if (decision === 'none') {
        this.setState({ status: 'synced' })
      } else if (decision === 'push') {
        await this.push(uid, serverRevision ?? 0)
      } else {
        const save = await fetchSave(uid)
        if (this.userId !== uid) return
        if (!save) { this.setState({ status: 'error' }); return }
        if (decision === 'pull') this.adopt(uid, save)
        else this.raiseConflict(uid, save)
      }
    } finally {
      this.busy = false
    }
  }

  // Uploads now if this device holds changes. Runs when the app goes to the
  // background, because the timer may never fire there.
  async flush() {
    const uid = this.userId
    if (!uid || this.state.conflict) return
    if (this.busy) { this.schedulePush(); return }
    const meta = loadMeta()
    if (meta?.userId !== uid) { await this.sync(); return }
    if (!meta.dirty) return
    this.busy = true
    try {
      await this.push(uid, meta.revision)
    } finally {
      this.busy = false
    }
  }

  async resolveConflict(keep: 'device' | 'cloud') {
    const uid = this.userId
    const conflict = this.state.conflict
    if (!uid || !conflict || this.busy) return
    this.busy = true
    this.setState({ conflict: null, conflictOpen: false })
    try {
      if (keep === 'cloud') this.adopt(uid, { profile: conflict.cloud, revision: conflict.revision, updatedAt: conflict.updatedAt })
      else await this.push(uid, conflict.revision)
    } finally {
      this.busy = false
    }
  }

  setConflictOpen(open: boolean) {
    if (this.state.conflict) this.setState({ conflictOpen: open })
  }

  private schedulePush() {
    if (!this.userId || this.timer) return
    const wait = Math.max(PUSH_DELAY_MS, PUSH_INTERVAL_MS - (Date.now() - this.lastPushAt))
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, wait)
  }

  private async push(uid: string, baseRevision: number) {
    const snapshot = this.profile
    const result = await pushSave({ ...snapshot, id: uid }, baseRevision)
    this.lastPushAt = Date.now()
    if (this.userId !== uid) return
    if (result.status === 'saved') {
      const changed = this.profile !== snapshot
      saveMeta({ userId: uid, revision: result.revision, dirty: changed, syncedAt: new Date().toISOString() })
      this.setState({ status: 'synced' })
      if (changed) this.schedulePush()
    } else if (result.status === 'conflict') {
      const save = await fetchSave(uid)
      if (this.userId !== uid) return
      if (save) this.raiseConflict(uid, save)
      else this.setState({ status: 'error' })
    } else {
      this.setState({ status: 'error' })
    }
  }

  private adopt(uid: string, save: CloudSave) {
    const profile = this.readProfile(uid, save)
    if (!profile) { this.setState({ status: 'error' }); return }
    this.adopted = profile
    this.profile = profile
    saveMeta({ userId: uid, revision: save.revision, dirty: false, syncedAt: new Date().toISOString() })
    this.onAdopt(profile)
    this.setState({ status: 'synced' })
  }

  private raiseConflict(uid: string, save: CloudSave) {
    const cloud = this.readProfile(uid, save)
    if (!cloud) { this.setState({ status: 'error' }); return }
    this.setState({ status: 'synced', conflict: { cloud, revision: save.revision, updatedAt: save.updatedAt }, conflictOpen: true })
  }

  private readProfile(uid: string, save: CloudSave): PlayerProfile | null {
    try {
      return { ...normalizeProfile(save.profile), id: uid }
    } catch (err) {
      console.warn('cloud save is unreadable', err)
      return null
    }
  }
}
