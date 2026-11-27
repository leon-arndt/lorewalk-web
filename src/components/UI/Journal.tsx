import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { MONO, monoLabel, RADIUS, tape } from '@/lib/paper'
import { edge, ink, paperCard, paperLight, stamp } from '@/lib/theme'
import { Icon, type IconName } from '@/components/UI/Icons'

// The building blocks of the field journal look. Use these before you write a
// new inline style: a screen that mixes its own cards and buttons stops looking
// like one notebook.

// Small caps caption in the typewriter font: counters, labels, footnotes.
export function Mono({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...monoLabel, ...style }}>{children}</span>
}

// The top of a full page: the title and a short red bar. `back` adds the back
// button before the title, for a page that has a parent page.
export function PageHeader({ title, right, back }: { title: ReactNode; right?: ReactNode; back?: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: 'calc(env(safe-area-inset-top) + 20px) 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {back && <BackButton onClick={back} style={{ marginLeft: -4 }} />}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, lineHeight: '36px', letterSpacing: '-0.01em', color: ink }}>{title}</h1>
          <span aria-hidden style={{ width: 44, height: 3, borderRadius: 2, background: stamp, marginTop: 2 }} />
        </div>
      </div>
      {right && <div style={{ flexShrink: 0, marginBottom: 10 }}>{right}</div>}
    </header>
  )
}

// A section heading with an optional typed note on the right.
export function SectionTitle({ children, note, style }: { children: ReactNode; note?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '0 0 10px', ...style }}>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 500, lineHeight: '26px', color: ink }}>{children}</h2>
      {note != null && <Mono>{note}</Mono>}
    </div>
  )
}

// A note on the page: a translucent white panel with a hairline edge. `taped`
// adds a strip of tape on the top edge, and `tilt` turns the note a little, in degrees.
export function NoteCard({ children, taped, tilt = 0, style }: { children: ReactNode; taped?: boolean; tilt?: number; style?: CSSProperties }) {
  return (
    <div style={{
      position: 'relative', background: 'rgba(255,255,255,0.6)', border: `1px solid ${edge}`, borderRadius: 12,
      padding: 14, transform: tilt ? `rotate(${tilt}deg)` : undefined, ...style,
    }}>
      {taped && <span aria-hidden style={{ ...tape, top: -8, left: 22, transform: 'rotate(-5deg)' }} />}
      {children}
    </div>
  )
}

// An ink stamp: a tilted outline in the typewriter font. Red by default.
export function Stamp({ children, color = stamp, tilt = 4, style }: { children: ReactNode; color?: string; tilt?: number; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', border: `2px solid ${color}`, borderRadius: 4, color,
      fontFamily: MONO, fontWeight: 500, fontSize: 11, lineHeight: '14px', letterSpacing: '0.08em',
      textTransform: 'uppercase', textAlign: 'center', transform: `rotate(${tilt}deg)`, ...style,
    }}>
      {children}
    </span>
  )
}

// A round postmark: a big figure over a small word, in red ink.
export function Postmark({ figure, word, tilt = 10 }: { figure: ReactNode; word: ReactNode; tilt?: number }) {
  return (
    <div style={{
      width: 78, height: 78, flexShrink: 0, border: `2px solid ${stamp}`, borderRadius: '50%', padding: 4,
      transform: `rotate(${tilt}deg)`,
    }}>
      <div style={{
        width: '100%', height: '100%', border: `1px solid ${stamp}`, borderRadius: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: stamp, fontFamily: MONO, fontWeight: 500, lineHeight: 1.1, textAlign: 'center',
      }}>
        <span style={{ fontSize: 15 }}>{figure}</span>
        <span style={{ fontSize: 11, textTransform: 'uppercase', maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{word}</span>
      </div>
    </div>
  )
}

type InkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // ink: the main action. paper: a secondary action. danger: a red, destructive action.
  variant?: 'ink' | 'paper' | 'danger'
}

// The app's button. 44 px tall, so it is a full touch target.
export function InkButton({ variant = 'ink', style, disabled, children, ...rest }: InkButtonProps) {
  const look: CSSProperties =
    variant === 'ink' ? { background: ink, color: paperLight, border: `1px solid ${ink}` }
    : variant === 'danger' ? { background: paperCard, color: stamp, border: `1px solid ${stamp}` }
    : { background: paperCard, color: ink, border: `1px solid ${edge}` }
  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      style={{
        minHeight: 44, padding: '0 16px', borderRadius: RADIUS, fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: 'transparent', ...look, ...style,
      }}
    >
      {children}
    </button>
  )
}

// The frame of the back and the close button. The button is 44 px for the
// finger, and the paper tag inside it is the part that shows.
function TagButton({ icon, label, onClick, style }: { icon: IconName; label: string; onClick: () => void; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-sfx="close"
      style={{
        width: 44, height: 44, flexShrink: 0, padding: 0, border: 'none', borderRadius: 14, background: 'none',
        display: 'grid', placeItems: 'center', cursor: 'pointer', color: ink,
        WebkitTapHighlightColor: 'transparent', ...style,
      }}
    >
      <span style={{
        width: 36, height: 36, boxSizing: 'border-box', display: 'grid', placeItems: 'center',
        background: paperCard, border: `1px solid ${edge}`, borderRadius: RADIUS,
        boxShadow: '0 1.5px 0 rgba(51,40,30,0.16)',
      }}>
        <Icon name={icon} size={18} strokeWidth={2} />
      </span>
    </button>
  )
}

// The one close button of the app: it puts a sheet, a panel, or an overlay away.
export function CloseButton({ onClick, label, style }: { onClick: () => void; label?: string; style?: CSSProperties }) {
  const { t } = useLocale()
  return <TagButton icon="close" label={label ?? t('common_close')} onClick={onClick} style={style} />
}

// The one back button of the app: it goes from a page to the page before it.
export function BackButton({ onClick, label, style }: { onClick: () => void; label?: string; style?: CSSProperties }) {
  const { t } = useLocale()
  return <TagButton icon="back" label={label ?? t('common_back')} onClick={onClick} style={style} />
}

// A small paper tag for one fact about a thing: an icon and a short typed word.
// `tone` is the ink of the icon and the word.
export function Chip({ icon, children, tone = ink, style }: { icon?: ReactNode; children: ReactNode; tone?: string; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 26, boxSizing: 'border-box',
      padding: icon ? '0 9px 0 6px' : '0 9px', background: paperCard, border: `1px solid ${edge}`, borderRadius: RADIUS,
      color: tone, fontFamily: MONO, fontSize: 11, fontWeight: 500, lineHeight: '14px', letterSpacing: '0.06em',
      textTransform: 'uppercase', whiteSpace: 'nowrap', ...style,
    }}>
      {icon}
      {children}
    </span>
  )
}
