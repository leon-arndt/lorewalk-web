import { AnimatePresence, motion } from 'motion/react'
import { popSpring } from '@/lib/motion'

// A number that pops when it changes, such as the coin count after a reward.
// It stays still on the first render, so a page that opens does not bounce.
export function CountBump({ value }: { value: string | number }) {
  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={value}
        initial={{ scale: 1.5, y: -4 }}
        animate={{ scale: 1, y: 0 }}
        transition={popSpring}
        style={{ display: 'inline-block' }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}
