import { useEffect, useState } from 'react'

const memo = new Map<string, string>()
const STORAGE_PREFIX = 'wiki-extract:'

function articleTitle(url: string) {
  const m = url.match(/wikipedia\.org\/wiki\/([^?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

const MAX_SENTENCES = 2
// Words that end in a period without ending the sentence ("St. Andrew's", "Sir T. S. Raffles").
const ABBREVIATION = /(?:^|\s)(?:St|Mt|Mr|Mrs|Dr|Jr|Sr|Ft|No|c|ca|approx|[A-Z])\.$/

function firstSentences(text: string, max: number) {
  const parts = text.split(/(?<=[.!?])\s+(?=["'(\p{Lu}\d])/u)
  const sentences: string[] = []
  for (const part of parts) {
    const last = sentences.length - 1
    if (last >= 0 && ABBREVIATION.test(sentences[last])) sentences[last] += ` ${part}`
    else sentences.push(part)
  }
  return sentences.slice(0, max).join(' ')
}

// The first sentences of a Wikipedia article's lead summary, cached per title.
// Returns null while loading or when the fetch fails, so the caller can render nothing.
export function useWikipediaExtract(url: string | undefined) {
  const title = url ? articleTitle(url) : null
  const [, setLoaded] = useState(0)

  useEffect(() => {
    if (!title || readCache(title)) return
    let cancelled = false
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { extract?: string } | null) => {
        const text = data?.extract?.trim()
        if (!text) return
        memo.set(title, text)
        try { localStorage.setItem(STORAGE_PREFIX + title, text) } catch { /* storage full or blocked */ }
        if (!cancelled) setLoaded((n) => n + 1)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [title])

  const extract = title ? readCache(title) : null
  return extract ? firstSentences(extract, MAX_SENTENCES) : null
}

function readCache(title: string) {
  if (memo.has(title)) return memo.get(title)!
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + title)
    if (stored) memo.set(title, stored)
    return stored
  } catch {
    return null
  }
}
