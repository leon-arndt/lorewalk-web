import { line } from '@/lib/theme'

// What a 3D render shows while it loads: a pulsing pencil dot in the middle of
// the render's box, not an emoji. An emoji only stands in when the render fails.
export function LoadingDot({ size }: { size: number }) {
  const dot = Math.max(6, Math.round(size * 0.36))
  return (
    <span
      aria-hidden
      className="animate-pulse"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}
    >
      <span style={{ display: 'block', width: dot, height: dot, borderRadius: '50%', background: line }} />
    </span>
  )
}
