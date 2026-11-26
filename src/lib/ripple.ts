import { animate } from 'motion'

// Press feedback for every button in the app, from one delegated listener: the
// button squishes, and a Material-style ink ripple spreads from the finger.
// The squish animates the CSS `scale` property, which composes with any
// transform the button already has, and does not touch its inline transition.
// The ink sits in its own clipped layer, so the button keeps its overflow and a
// badge that sticks out of it is not cut off. Opt out with data-no-ripple.
const TARGETS = 'button, [role="button"], [data-ripple]'

export function installPressFeedback(): () => void {
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const found = (e.target as HTMLElement).closest<HTMLElement>(TARGETS)
    if (!found) return
    const el = found
    if (el.matches(':disabled, [aria-disabled="true"]') || el.closest('[data-no-ripple]')) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))

    // Big cards dip less than small icon buttons, so both feel the same.
    const squish = 1 - Math.min(0.06, 10 / Math.max(rect.width, rect.height))
    const press = el.animate([{ scale: '1' }, { scale: String(squish) }], { duration: 90, easing: 'ease-out', fill: 'forwards' })

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'

    const layer = document.createElement('span')
    layer.setAttribute('aria-hidden', 'true')
    Object.assign(layer.style, {
      position: 'absolute', inset: '0', borderRadius: 'inherit',
      overflow: 'hidden', pointerEvents: 'none', zIndex: '0',
    })
    const ink = document.createElement('span')
    Object.assign(ink.style, {
      position: 'absolute', left: `${x - radius}px`, top: `${y - radius}px`,
      width: `${radius * 2}px`, height: `${radius * 2}px`, borderRadius: '50%',
      background: 'currentColor', opacity: '0.16', transform: 'scale(0)',
    })
    layer.appendChild(ink)
    el.appendChild(layer)

    const grow = animate(ink, { scale: [0, 1] }, { duration: 0.42, ease: [0.2, 0, 0, 1] })
    let released = false
    function release() {
      if (released) return
      released = true
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      press.cancel()
      el.animate([{ scale: String(squish) }, { scale: '1' }], { duration: 420, easing: 'cubic-bezier(0.34, 1.9, 0.64, 1)' })
      // Let the ink reach the edge before it fades, so a quick tap still shows it.
      grow.then(() => animate(ink, { opacity: 0 }, { duration: 0.3 })).then(() => layer.remove())
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
}
