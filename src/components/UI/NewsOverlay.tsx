import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useNews } from '@/hooks/useNews'
import { newsText } from '@/data/news'
import { forest, indigo, ink, inkHint, inkSoft, ochre, paperCard, paperShade, stamp, line } from '@/lib/theme'
import { paperCardStyle, paperPage, paperSheet, paperTag, SCRIM } from '@/lib/paper'
import { InkButton, Mono, PageHeader, Stamp } from '@/components/UI/Journal'
import type { NewsCategory, NewsPost } from '@/types'
import type { Translations } from '@/i18n/types'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

const CATEGORY_KEY: Record<NewsCategory, keyof Translations> = {
  update: 'news_category_update',
  event: 'news_category_event',
  community: 'news_category_community',
}

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  update: forest,
  event: indigo,
  community: ochre,
}

// A typed category line with a swatch of the category colour.
function CategoryTag({ category }: { category: NewsCategory }) {
  const { t } = useLocale()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span aria-hidden style={{
        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
        background: CATEGORY_COLOR[category], border: `1.5px solid ${ink}`,
      }} />
      <Mono style={{ fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink }}>
        {t(CATEGORY_KEY[category])}
      </Mono>
    </span>
  )
}

function PostDetail({ post, onClose }: { post: NewsPost; onClose: () => void }) {
  const { t, locale } = useLocale()
  const body = newsText(post.body, locale)

  return (
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '82dvh', overflowY: 'auto',
          ...paperSheet, borderRadius: '10px 10px 0 0',
          padding: '10px 20px calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: ink, margin: '0 auto 16px' }} />

        {post.heroUrl && (
          <img
            src={post.heroUrl}
            alt=""
            style={{
              width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', boxSizing: 'border-box',
              display: 'block', marginBottom: 14, background: paperShade,
              border: `5px solid ${paperCard}`, outline: `1px solid ${line}`, borderRadius: 2,
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)',
            }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <CategoryTag category={post.category} />
          <Mono style={{ fontSize: 12 }}>
            {new Date(post.publishedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
          </Mono>
        </div>

        <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 600, lineHeight: '30px', letterSpacing: '-0.01em', color: ink }}>
          {newsText(post.title, locale)}
        </h2>

        {body.split('\n\n').map((para, i) => (
          <p key={i} style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.6, color: ink }}>
            {para}
          </p>
        ))}

        <InkButton
          variant="paper"
          onClick={onClose}
          data-sfx="close"
          style={{ width: '100%', marginTop: 8, minHeight: 48 }}
        >
          {t('common_close')}
        </InkButton>
      </motion.div>
    </motion.div>
  )
}

const emptyNote = { margin: 0, padding: '32px 4px', textAlign: 'center', fontSize: 14, color: inkHint } as const

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
    <motion.div {...sheetIn} style={{
      position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto',
      ...paperPage,
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    }}>
      <PageHeader
        title={t('news_title')}
        right={
          <button
            onClick={onClose}
            style={{
              ...paperTag, width: 44, height: 44, borderRadius: '50%', padding: 0,
              fontSize: 22, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={t('news_close')}
            data-sfx="close"
          >×</button>
        }
      />
      <p style={{ margin: 0, padding: '8px 16px 4px', fontSize: 14, color: inkSoft }}>{t('news_subtitle')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 18px 8px' }}>
        {loading && sorted.length === 0 && (
          <p style={emptyNote}>
            {t('news_loading')}
          </p>
        )}

        {error && sorted.length === 0 && (
          <p style={emptyNote}>
            {t('news_error')}
          </p>
        )}

        {!loading && !error && sorted.length === 0 && (
          <p style={emptyNote}>
            {t('news_empty')}
          </p>
        )}

        {sorted.map((post, i) => (
          <button
            key={post.id}
            onClick={() => setSelected(post)}
            style={{
              ...paperCardStyle,
              position: 'relative', display: 'block', width: '100%', textAlign: 'left',
              padding: post.heroUrl ? 6 : 0, cursor: 'pointer',
              color: ink, fontFamily: 'inherit',
              transform: `rotate(${i % 2 === 0 ? -0.5 : 0.6}deg)`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* The pin that holds the note on the board. */}
            <span aria-hidden style={{
              position: 'absolute', top: -7, left: '50%', marginLeft: -7, zIndex: 1,
              width: 14, height: 14, borderRadius: '50%',
              background: stamp, border: `1.5px solid ${ink}`,
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)',
            }} />
            {post.heroUrl && (
              <img
                src={post.heroUrl}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: paperShade, borderRadius: 2 }}
              />
            )}
            <div style={{ padding: post.heroUrl ? '10px 8px 6px' : '16px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <CategoryTag category={post.category} />
                {unreadIds.has(post.id) && (
                  <Stamp tilt={-3} style={{ padding: '1px 6px' }}>
                    {t('news_new_badge')}
                  </Stamp>
                )}
                <Mono style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  {new Date(post.publishedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </Mono>
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, lineHeight: '23px', color: ink, marginBottom: 4 }}>
                {newsText(post.title, locale)}
              </div>
              <div style={{
                fontSize: 14, lineHeight: 1.5, color: inkSoft,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {newsText(post.body, locale)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && <PostDetail post={selected} onClose={() => setSelected(null)} />}
    </motion.div>
  )
}
