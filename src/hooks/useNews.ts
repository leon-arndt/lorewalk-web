import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SEED_NEWS } from '@/data/news'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import type { NewsCategory, NewsPost } from '@/types'

const NEWS_LIMIT = 30

interface NewsRow {
  id: string
  published_at: string
  category: NewsCategory
  hero_url: string | null
  title: Record<string, string> | null
  body: Record<string, string> | null
}

export function useNews() {
  const { mode } = useConnectionMode()
  const [fetched, setFetched] = useState<NewsPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'offline') return

    let cancelled = false

    async function fetchNews() {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, published_at, category, hero_url, title, body')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(NEWS_LIMIT)

      if (cancelled) return
      if (error) { setError(error.message); return }

      setError(null)
      setFetched((((data ?? []) as unknown) as NewsRow[]).map((row) => ({
        id: row.id,
        publishedAt: row.published_at,
        category: row.category,
        heroUrl: row.hero_url ?? null,
        title: row.title ?? {},
        body: row.body ?? {},
      })))
    }

    fetchNews()
    return () => { cancelled = true }
  }, [mode])

  // Offline is the default mode, so it falls back to the bundled seed the same
  // way usePois falls back to SINGAPORE_POIS.
  const posts = mode === 'offline' ? SEED_NEWS : (fetched ?? [])
  const loading = mode === 'online' && fetched === null && error === null

  return { posts, loading, error }
}

// A post counts as unread until the player has opened the overlay at or after
// its publish time. lastReadNewsAt stores the newest publishedAt already seen.
export function unreadCount(posts: NewsPost[], lastReadNewsAt: string | null): number {
  if (!lastReadNewsAt) return posts.length
  return posts.filter((p) => p.publishedAt > lastReadNewsAt).length
}
