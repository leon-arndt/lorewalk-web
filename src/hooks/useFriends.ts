import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import type { Translations } from '@/i18n/types'

export interface AddFriendResult {
  ok: boolean
  key: keyof Translations
  vars?: Record<string, string | number>
}

export interface Friend {
  playerId: string
  displayName: string
  addedAt: string
}

export interface FriendCode {
  code: string
  expiresAt: string
}

// Alphanumeric without ambiguous chars (0/O, 1/I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeCode(): string {
  const pick = () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  const part = (n: number) => Array.from({ length: n }, pick).join('')
  return `${part(4)}-${part(4)}`
}

const TTL_MS = 72 * 3_600_000

const OFFLINE_CODE: FriendCode = {
  code: 'TEST-0000',
  expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
}

const OFFLINE_FRIENDS: Friend[] = [
  { playerId: 'stub-1', displayName: 'Aria Tanaka', addedAt: new Date().toISOString() },
  { playerId: 'stub-2', displayName: 'Marcus Chen', addedAt: new Date().toISOString() },
]

export function useFriends(playerId: string, displayName: string) {
  const { mode } = useConnectionMode()
  const offline = mode === 'offline'

  const [friendCode, setFriendCode] = useState<FriendCode | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (offline) {
      setFriendCode(OFFLINE_CODE)
      setFriends(OFFLINE_FRIENDS)
      setLoading(false)
      return
    }
    void loadAll()
  }, [playerId, offline])

  // Keep the stored display_name current: an existing code snapshots the name at
  // insert time, so a later rename would otherwise show stale to anyone adding you.
  useEffect(() => {
    if (offline || !playerId) return
    void supabase.from('friend_codes').update({ display_name: displayName }).eq('player_id', playerId)
  }, [playerId, displayName, offline])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadCode(), loadFriends()])
    setLoading(false)
  }

  async function loadCode() {
    // Server-time filter (RPC compares against now()) so a skewed client clock
    // can't mislabel a code as expired or valid.
    const { data, error } = await supabase.rpc('get_active_friend_code', { p_player_id: playerId })

    // A read failure is not "no code" — bailing avoids inserting a duplicate row.
    if (error) return
    if (data?.[0]) {
      setFriendCode({ code: data[0].code, expiresAt: data[0].expires_at })
    } else {
      await insertCode()
    }
  }

  // Postgres unique-violation — collides on the UNIQUE(code) constraint.
  const UNIQUE_VIOLATION = '23505'

  async function insertCode(): Promise<FriendCode | null> {
    // Let the table default (now() + 72h) stamp expires_at server-side; read it
    // back rather than trusting the client clock.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = makeCode()
      const { data, error } = await supabase
        .from('friend_codes')
        .insert({ player_id: playerId, display_name: displayName, code })
        .select('expires_at')
        .single()
      if (!error && data) {
        const fc = { code, expiresAt: data.expires_at }
        setFriendCode(fc)
        return fc
      }
      if (error?.code !== UNIQUE_VIOLATION) break
    }
    return null
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('player_a, player_b, name_a, name_b, created_at')
      .or(`player_a.eq.${playerId},player_b.eq.${playerId}`)
    if (data) {
      setFriends(
        data.map((row) => ({
          playerId: row.player_a === playerId ? row.player_b : row.player_a,
          displayName: row.player_a === playerId ? row.name_b : row.name_a,
          addedAt: row.created_at,
        })),
      )
    }
  }

  const regenerate = useCallback(async () => {
    if (offline) {
      setFriendCode({ code: makeCode(), expiresAt: new Date(Date.now() + TTL_MS).toISOString() })
      return
    }
    // Insert first; only drop the old codes once the new one is live, so a failed
    // insert never leaves the user pointing at a deleted code.
    const fc = await insertCode()
    if (!fc) return
    await supabase.from('friend_codes').delete().eq('player_id', playerId).neq('code', fc.code)
  }, [playerId, displayName, offline])

  const addFriend = useCallback(
    async (raw: string): Promise<AddFriendResult> => {
      const code = raw.trim().toUpperCase()

      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
        return { ok: false, key: 'friends_format_error' }
      }

      if (offline) {
        if (code === friendCode?.code) return { ok: false, key: 'friends_own_code' }
        setFriends((prev) => [
          ...prev,
          { playerId: `stub-${Date.now()}`, displayName: 'Test Friend', addedAt: new Date().toISOString() },
        ])
        return { ok: true, key: 'friends_added_test' }
      }

      const { data: codeRows } = await supabase.rpc('lookup_friend_code', { p_code: code })

      if (!codeRows?.length) return { ok: false, key: 'friends_not_found' }
      const { player_id: friendId, display_name: friendName } = codeRows[0]

      if (friendId === playerId) return { ok: false, key: 'friends_own_code' }

      const [pA, pB] = [playerId, friendId].sort()
      const nameA = pA === playerId ? displayName : friendName
      const nameB = pB === playerId ? displayName : friendName

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('player_a', pA)
        .eq('player_b', pB)
        .limit(1)

      if (existing?.length) return { ok: false, key: 'friends_already' }

      const { error } = await supabase
        .from('friendships')
        .insert({ player_a: pA, player_b: pB, name_a: nameA, name_b: nameB })

      if (error) {
        // Concurrent/duplicate add races past the existence check; the unique
        // index is the real guard, so treat its violation as "already friends".
        if (error.code === UNIQUE_VIOLATION) return { ok: false, key: 'friends_already' }
        return { ok: false, key: 'friends_failed' }
      }

      await loadFriends()
      return { ok: true, key: 'friends_added', vars: { name: friendName } }
    },
    [playerId, displayName, offline, friendCode],
  )

  return { friendCode, friends, loading, addFriend, regenerate }
}
