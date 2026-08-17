import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useNews } from '@/hooks/useNews'
import { newsText } from '@/data/news'
import { accent, accentAlpha } from '@/lib/theme'
import { pageBackground } from '@/lib/glass'
import type { NewsCategory, NewsPost } from '@/types'
import type { Translations } from '@/i18n/types'

const CATEGORY_KEY: Record<NewsCategory, keyof Translations> = {
  update: 'news_category_update',
  event: 'news_category_event',
  community: 'news_category_community',
}

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  update: '#166534',
  event: '#a855f7',
  community: '#f59e0b',
}

function CategoryTag({ category }: { category: NewsCategory }) {
  const { t } = useLocale()
  const color = CATEGORY_COLOR[category]
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4,
      color, background: `${color}1a`, padding: '3px 8px', borderRadius: 999,
    }}>
      {t(CATEGORY_KEY[category])}
    </span>
  )
}

function PostDetail({ post, onClose }: { post: NewsPost; onClose: () => void }) {
  const { t, locale } = useLocale()
  const body = newsText(post.body, locale)

  return (
    <div
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(15,10,30,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '82dvh', overflowY: 'auto',
          background: 'white', borderRadius: '24px 24px 0 0',
          padding: '20px 20px calc(env(safe-area-inset-bottom) + 24px)',
          animation: 'panelSlideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 16px' }} />

        {post.heroUrl && (
          <img
            src={post.heroUrl}
            alt=""
            style={{
              width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
              borderRadius: 14, display: 'block', marginBottom: 14, background: '#f1f5f9',
            }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <CategoryTag category={post.category} />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {new Date(post.publishedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <h2 style={{ margin: '0 0 12px', fontSize: 19, fontWeight: 800, color: accent }}>
          {newsText(post.title, locale)}
        </h2>

        {body.split('\n\n').map((para, i) => (
          <p key={i} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6, color: '#334155' }}>
            {para}
          </p>
        ))}

        <button
          onClick={onClose}
          data-sfx="close"
          style={{
            width: '100%', marginTop: 8, padding: '12px 0', borderRadius: 14,
            border: 'none', background: accentAlpha(0.10), color: accent,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {t('common_close')}
        </button>
      </div>
    </div>
  )
}

export function NewsOverlay({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLocale()
  const { profile, markNewsRead } = useProfile()
  const { posts, loading, error } = useNews()
  const [selected, setSelected] = useState<NewsPost | null>(null)

  const sorted = useMemo(
    () => [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [posts],
  )

  // Snapshot the unread set on mount, before marking everything read, so the
  // "New" badges stay visible for this viewing instead of vanishing instantly.
  const [unreadIds] = useState(() => {
    const since = profile.lastReadNewsAt
    return new Set(posts.filter((p) => !since || p.publishedAt > since).map((p) => p.id))
  })

  useEffect(() => {
    if (sorted.length > 0) markNewsRead(sorted[0].publishedAt)
  }, [sorted]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto',
      background: pageBackground,
      animation: 'panelSlideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 20px 12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: accent }}>{t('news_title')}</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{t('news_subtitle')}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'white', color: '#64748b', fontSize: 18, cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label={t('news_close')}
          data-sfx="close"
        >×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 16px' }}>
        {loading && sorted.length === 0 && (
          <p style={{ margin: 0, padding: '32px 4px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
            {t('news_loading')}
          </p>
        )}

        {error && sorted.length === 0 && (
          <p style={{ margin: 0, padding: '32px 4px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
            {t('news_error')}
          </p>
        )}

        {!loading && !error && sorted.length === 0 && (
          <p style={{ margin: 0, padding: '32px 4px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
            {t('news_empty')}
          </p>
        )}

        {sorted.map((post) => (
          <button
            key={post.id}
            onClick={() => setSelected(post)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: 0, border: 'none', borderRadius: 16, overflow: 'hidden',
              background: 'white', cursor: 'pointer',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {post.heroUrl && (
              <img
                src={post.heroUrl}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: '#f1f5f9' }}
              />
            )}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CategoryTag category={post.category} />
                {unreadIds.has(post.id) && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4,
                    color: 'white', background: '#ef4444', padding: '3px 8px', borderRadius: 999,
                  }}>
                    {t('news_new_badge')}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                  {new Date(post.publishedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                {newsText(post.title, locale)}
              </div>
              <div style={{
                fontSize: 12.5, lineHeight: 1.5, color: '#64748b',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {newsText(post.body, locale)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && <PostDetail post={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
