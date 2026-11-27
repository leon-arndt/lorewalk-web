import type { Transition } from 'motion/react'

// Shared motion vocabulary, so every surface moves with the same feel.

export const sheetSpring: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }
export const popSpring: Transition = { type: 'spring', stiffness: 520, damping: 22 }
export const softSpring: Transition = { type: 'spring', stiffness: 300, damping: 30 }

export const tapScale = { scale: 0.94 }

// Bottom sheet that mounts open. The bounce comes from the spring.
export const sheetIn = {
  initial: { y: '100%' },
  animate: { y: 0 },
  transition: sheetSpring,
}

// Bottom sheet whose parent delays the unmount while `closing` is true.
export function panelMotion(closing: boolean) {
  return {
    initial: { y: '110%' },
    animate: { y: closing ? '110%' : 0 },
    transition: closing ? { duration: 0.26, ease: [0.36, 0, 0.66, 0] as const } : sheetSpring,
  }
}

// Dimmed backdrop: fades its colour in, and the sheet inside stays opaque.
export function backdropIn(color: string) {
  return {
    initial: { backgroundColor: 'rgba(15,23,42,0)' },
    animate: { backgroundColor: color },
    transition: { duration: 0.2 },
  }
}

// Card or tile that pops in, with a small stagger by list position.
export function popIn(index = 0) {
  return {
    initial: { opacity: 0, scale: 0.9, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { ...popSpring, delay: Math.min(index, 12) * 0.03 },
  }
}
