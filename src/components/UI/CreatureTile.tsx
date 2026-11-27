import { useLocale } from '@/contexts/LocaleContext'
import { creatureName } from '@/lib/profile'
import { CreatureSceneCard } from '@/components/UI/CreatureDetailView'
import { Mono } from '@/components/UI/Journal'
import type { HatchedCreature } from '@/types'
import { categoryCss, ink, inkSoft, pencil } from '@/lib/theme'
import { paperCardStyle } from '@/lib/paper'
import { motion } from 'motion/react'
import { popSpring } from '@/lib/motion'


const clip = { width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

// A small specimen card: the creature on a wash of its type colour, then its
// name and a typed level. Squad slots and the creature picker share it.
export function CreatureTile({ creature, onTap, disabled, note }: {
  creature: HatchedCreature
  onTap: () => void
  disabled?: boolean
  note?: string
}) {
  const { t } = useLocale()
  return (
    <motion.button
      type="button"
      onClick={onTap}
      disabled={disabled}
      initial={{ scale: 0.8, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      whileTap={disabled ? undefined : { rotate: -4 }}
      transition={popSpring}
      className="flex min-w-0 flex-col items-stretch disabled:opacity-45"
      style={{
        ...paperCardStyle, borderRadius: 3, padding: 4, gap: 2,
        color: ink, fontFamily: 'inherit', textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        height: 70, background: `${categoryCss(creature.poiCategory)}40`, borderRadius: 2, overflow: 'hidden',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <CreatureSceneCard creature={creature} />
      </span>
      <span style={{ ...clip, fontSize: 12, fontWeight: 500, lineHeight: '15px' }}>
        {creatureName(creature)}
      </span>
      <Mono style={{ ...clip, fontVariantNumeric: 'tabular-nums' }}>
        {t('level_badge', { level: creature.level })}
      </Mono>
      {note && <Mono style={{ color: inkSoft, overflowWrap: 'anywhere' }}>{note}</Mono>}
    </motion.button>
  )
}

// A free slot: a dashed pencil outline where a specimen card would go. With
// onTap it becomes an add button with a plus in the middle.
export function EmptyPad({ onTap, disabled }: { onTap?: () => void; disabled?: boolean }) {
  const { t } = useLocale()
  const slot = { minHeight: 112, border: `1.5px dashed ${pencil}`, borderRadius: 3 } as const
  if (!onTap) {
    return <div aria-hidden style={slot} />
  }
  return (
    <motion.button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={t('squads_add_creature')}
      className="flex min-w-0 items-center justify-center disabled:opacity-40"
      style={{
        ...slot, background: 'transparent', color: inkSoft, fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span aria-hidden style={{ fontSize: 24, fontWeight: 400, lineHeight: 1 }}>+</span>
    </motion.button>
  )
}
