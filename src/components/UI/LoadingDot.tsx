// What a 3D render shows while it loads: a soft pulsing dot the size of the
// render, not an emoji. An emoji only stands in when the render fails.
export function LoadingDot({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="animate-pulse"
      style={{
        display: 'block', width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(148,163,184,0.35) 0%, rgba(148,163,184,0) 70%)',
      }}
    />
  )
}
