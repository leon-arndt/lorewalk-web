import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { MONO, monoLabel, tape } from '@/lib/paper'
import { ink, inkSoft, paperCard, paperLight, stamp } from '@/lib/theme'

// The building blocks of the field journal look. Use these before you write a
// new inline style: a screen that mixes its own cards and buttons stops looking
// like one notebook.

// Small caps caption in the typewriter font: counters, labels, footnotes.
export function Mono({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...monoLabel, ...style }}>{children}</span>
}

// The top of a full page: a typed kicker, the title, and a red ink underline.
export function PageHeader({ title, right, kicker }: { title: ReactNode; right?: ReactNode; kicker?: ReactNode }) {
  const { t } = useLocale()
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '20px 16px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Mono style={{ fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: inkSoft }}>
          {kicker ?? t('journal_kicker')}
        </Mono>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, lineHeight: '42px', letterSpacing: '-0.01em', color: ink }}>{title}</h1>
        <svg aria-hidden width="150" height="8" viewBox="0 0 150 8" fill="none" style={{ display: 'block', marginTop: -2 }}>
          <path d="M2 5c12-5 22 4 34 0s22-4 34 0 22 4 34 0 28-4 44 1" stroke={stamp} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
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

// A note on the page: lighter paper with an ink edge. `taped` adds two strips of
// tape on the top edge, and `tilt` turns the note a little, in degrees.
export function NoteCard({ children, taped, tilt = 0, style }: { children: ReactNode; taped?: boolean; tilt?: number; style?: CSSProperties }) {
  return (
    <div style={{
      position: 'relative', background: paperLight, border: `1.5px solid ${ink}`, borderRadius: 6,
      padding: 12, transform: tilt ? `rotate(${tilt}deg)` : undefined, ...style,
    }}>
      {taped && (
        <>
          <span aria-hidden style={{ ...tape, top: -9, left: 18, transform: 'rotate(-5deg)' }} />
          <span aria-hidden style={{ ...tape, top: -9, right: 18, transform: 'rotate(4deg)' }} />
        </>
      )}
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

type InkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // ink: the main action. paper: a secondary action. danger: a red, destructive action.
  variant?: 'ink' | 'paper' | 'danger'
}

// The app's button. 44 px tall, so it is a full touch target.
export function InkButton({ variant = 'ink', style, disabled, children, ...rest }: InkButtonProps) {
  const look: CSSProperties =
    variant === 'ink' ? { background: ink, color: paperLight, border: `1.5px solid ${ink}` }
    : variant === 'danger' ? { background: paperCard, color: stamp, border: `1.5px solid ${stamp}` }
    : { background: paperCard, color: ink, border: `1.5px solid ${ink}` }
  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      style={{
        minHeight: 44, padding: '0 16px', borderRadius: 6, fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: 'transparent', ...look, ...style,
      }}
    >
      {children}
    </button>
  )
}
