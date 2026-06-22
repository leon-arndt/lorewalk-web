import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'

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

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadCode(), loadFriends()])
    setLoading(false)
  }

  async function loadCode() {
    const { data } = await supabase
      .from('friend_codes')
      .select('code, expires_at')
      .eq('player_id', playerId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (data?.[0]) {
      setFriendCode({ code: data[0].code, expiresAt: data[0].expires_at })
    } else {
      await insertCode()
    }
  }

  async function insertCode(): Promise<FriendCode | null> {
    const code = makeCode()
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
    const { error } = await supabase
      .from('friend_codes')
      .insert({ player_id: playerId, display_name: displayName, code, expires_at: expiresAt })
    if (error) return null
    const fc = { code, expiresAt }
    setFriendCode(fc)
    return fc
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
    await supabase.from('friend_codes').delete().eq('player_id', playerId)
    await insertCode()
  }, [playerId, displayName, offline])

  const addFriend = useCallback(
    async (raw: string): Promise<{ ok: boolean; message: string }> => {
      const code = raw.trim().toUpperCase()

      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
        return { ok: false, message: 'Format should be XXXX-XXXX' }
      }

      if (offline) {
        if (code === friendCode?.code) return { ok: false, message: "That's your own code!" }
        setFriends((prev) => [
          ...prev,
          { playerId: `stub-${Date.now()}`, displayName: 'Test Friend', addedAt: new Date().toISOString() },
        ])
        return { ok: true, message: 'Friend added (test mode)' }
      }

      const { data: codeRows } = await supabase
        .from('friend_codes')
        .select('player_id, display_name')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .limit(1)

      if (!codeRows?.length) return { ok: false, message: 'Code not found or expired' }
      const { player_id: friendId, display_name: friendName } = codeRows[0]

      if (friendId === playerId) return { ok: false, message: "That's your own code!" }

      const [pA, pB] = [playerId, friendId].sort()
      const nameA = pA === playerId ? displayName : friendName
      const nameB = pB === playerId ? displayName : friendName

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('player_a', pA)
        .eq('player_b', pB)
        .limit(1)

      if (existing?.length) return { ok: false, message: 'Already friends!' }

      const { error } = await supabase
        .from('friendships')
        .insert({ player_a: pA, player_b: pB, name_a: nameA, name_b: nameB })

      if (error) return { ok: false, message: 'Failed to add friend' }

      await loadFriends()
      return { ok: true, message: `Added ${friendName}!` }
    },
    [playerId, displayName, offline, friendCode],
  )

  return { friendCode, friends, loading, addFriend, regenerate }
}
