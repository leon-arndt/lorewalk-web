import type { CSSProperties, ReactNode } from 'react'
import { categoryCss, edge, ink } from '@/lib/theme'

// The app's line icons: one pen, like the tab bar. Each icon is a 24 px drawing
// in the current text colour. Use an icon for a control or a label. A reward or
// an item keeps its 3D render (EmojiSprite).
const PATHS = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,

  // POI categories, which are also the creature types.
  heritage: <path d="M3.5 9.5 12 4l8.5 5.5zM6.5 10v7M10.2 10v7M13.8 10v7M17.5 10v7M5 17.5h14M3.5 20.5h17" />,
  landmark: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </>
  ),
  arts: <path d="M5.5 4.5c4 1.3 9 1.3 13 0v7c0 4.4-3 8-6.5 8s-6.5-3.6-6.5-8zM8.2 9.7c.8-.9 2-.9 2.8 0M13 9.7c.8-.9 2-.9 2.8 0M8.8 13.5c1.6 2.3 4.8 2.3 6.4 0z" />,
  religious: <path d="M12 2.5v3M6 12a6 6 0 0 1 12 0M4.5 12h15M5.5 12v8.5h13V12M10.3 20.5V17a1.7 1.7 0 0 1 3.4 0v3.5" />,
  museum: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 16l4.5-4.5 3.5 3.5 2.5-2.5 6.5 5" />
      <circle cx="15.5" cy="9.3" r="1.3" />
    </>
  ),
  nature: <path d="M4.5 19.5C4.5 10 10 4.5 19.5 4.5c0 9.5-5.5 15-15 15zM4.5 19.5 13 11" />,

  // POI tiers.
  flag: <path d="M6 21V4M6 5h11.5l-2.5 3.5 2.5 3.5H6" />,
  plaque: <path d="M12 21v-7.5M5 5h11.5l3 4.25-3 4.25H5z" />,
  spot: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </>
  ),
  trail: (
    <>
      <circle cx="6" cy="18.5" r="2" />
      <circle cx="18" cy="5.5" r="2" />
      <path d="M8 18.5h6.5a3.25 3.25 0 0 0 0-6.5h-5a3.25 3.25 0 0 1 0-6.5H16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),

  star: <path d="M12 3.8l2.4 5 5.5.7-4 3.8 1 5.4-4.9-2.7-4.9 2.7 1-5.4-4-3.8 5.5-.7z" />,
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="M9 21.5l2.3-6.5-1.8-2.5 1-4.5 3 .5 1.5 3 3 1.5M11.3 15l3.2 2.5 1 4" />
    </>
  ),
  check: <path d="M5 13l4 4 10-11" />,
  edit: <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 19zM14.5 6l3 3" />,
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),

  // The character designer.
  face: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.3v.7M15 10.3v.7M8.8 14.3c1.8 2 4.6 2 6.4 0" />
    </>
  ),
  hair: <path d="M4 5.5h16v5H4zM6.5 10.5v8M9.25 10.5v8M12 10.5v8M14.75 10.5v8M17.5 10.5v8" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  top: <path d="M8.5 4l-5.5 3 2 3.8L8 9.5V20h8V9.5l3 1.3 2-3.8-5.5-3c-.5 1.5-1.8 2.3-3.5 2.3S9 5.5 8.5 4z" />,
  bottom: <path d="M7 4h10l1.5 16.5h-4.7L12 10l-1.8 10.5H5.5zM6.7 7.5h10.6" />,
  shoes: <path d="M3.5 9.5v9h17c0-2.2-1.5-3.3-4-3.9l-4.5-1.1-2.3-3.8-2 1.3c-1.4.4-2.8 0-4.2-1.5zM3.5 15.8h16.3" />,
  hat: <path d="M4 16.5V14a7 7 0 0 1 14 0v2.5M4 16.5h14.5c1.7 0 3 .9 3.5 2.5H4zM11 5.5V7" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, strokeWidth = 1.75, style }: { name: IconName; size?: number; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg
      aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  )
}

const CATEGORY_ICONS: Record<string, IconName> = {
  heritage: 'heritage', landmark: 'landmark', arts: 'arts', religious: 'religious', museum: 'museum', nature: 'nature',
}

// A type as a round sticker: its icon in ink on a wash of its colour, with a
// ring of the full colour. The wash keeps the icon readable on every colour.
export function CategoryBadge({ category, size = 28, style }: { category: string; size?: number; style?: CSSProperties }) {
  const color = categoryCss(category)
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0, boxSizing: 'border-box', borderRadius: '50%',
        background: `color-mix(in srgb, ${color} 34%, #fff)`, border: `1.5px solid ${color}`,
        boxShadow: `0 0 0 1px ${edge}`, color: ink,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style,
      }}
    >
      <Icon name={CATEGORY_ICONS[category] ?? 'landmark'} size={Math.round(size * 0.62)} />
    </span>
  )
}
