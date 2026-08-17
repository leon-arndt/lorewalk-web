import type { NewsPost } from '@/types'

// Offline fallback for the News overlay, mirroring how SINGAPORE_POIS backs
// usePois. Offline is the default connection mode, so without this the feature
// would look broken on a first run.
//
// These carry English only on purpose. Real posts are authored in the
// news_posts table with whatever locales the author supplies, and newsText()
// falls back to English either way, so translating demo copy into all eight
// languages would buy nothing.
export const SEED_NEWS: NewsPost[] = [
  {
    id: 'seed_welcome',
    publishedAt: '2026-08-01T09:00:00.000Z',
    category: 'update',
    heroUrl: null,
    title: { en: 'Welcome to Lorewalk' },
    body: {
      en: 'Walk to a real landmark, check in within 50 m, and earn XP and an egg. Keep walking and the egg hatches into a creature whose type matches the place you found it.\n\nBuild a squad of four, keep it with you for a check-in boost, or send it on an expedition to claim a landmark you have already visited. Held landmarks earn coins over time.',
    },
  },
  {
    id: 'seed_medal_event',
    publishedAt: '2026-08-12T02:30:00.000Z',
    category: 'event',
    heroUrl: null,
    title: { en: 'Monthly medal walk' },
    body: {
      en: 'Premium members finish a monthly challenge to earn a real physical medal. Medals are not mailed. You pick yours up in person at the Singapore community meetup: a 5k walk through heritage and nature landmarks, free drinks afterwards, then medal pickup by QR code.\n\nThe venue and the first date are not fixed yet. This post updates when they are.',
    },
  },
]

// A post may carry fewer locales than the UI, so every read goes through here.
export function newsText(field: Record<string, string>, locale: string): string {
  return field[locale] ?? field.en ?? ''
}
