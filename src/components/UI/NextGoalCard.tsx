import { useLocale } from '@/contexts/LocaleContext'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { formatDistance, type NextGoal } from '@/lib/nextGoal'
import { MONO, hudTag } from '@/lib/paper'
import { ink, inkHint, paperLight, stamp } from '@/lib/theme'
import { motion } from 'motion/react'
import { popSpring } from '@/lib/motion'

// One slim line near the bottom of the map: the next thing to do. The whole
// bar is the button. A ready reward shows in red ink, a landmark in plain ink.
export function NextGoalCard({ goal, onAct }: { goal: NextGoal; onAct: () => void }) {
  const { t } = useLocale()

  let sprite: string, emoji: string, title: string, detail: string | null, action: string
  if (goal.kind === 'egg') {
    sprite = 'item_egg'; emoji = '🥚'; title = t('goal_egg_title'); detail = null; action = t('goal_hatch')
  } else if (goal.kind === 'squad') {
    sprite = 'item_compass'; emoji = '🧭'; title = t('goal_squad_title', { name: goal.name }); detail = null; action = t('goal_collect')
  } else if (goal.kind === 'chest') {
    sprite = 'item_chest'; emoji = '🎁'; title = t('goal_chest_title'); detail = null; action = t('goal_open')
  } else {
    sprite = 'item_pin'; emoji = '📍'; title = goal.poi.name; action = t('goal_go')
    detail = goal.distanceM != null ? formatDistance(goal.distanceM) : null
  }
  const ready = goal.kind !== 'poi'

  return (
    <motion.button
      type="button"
      data-testid="next-goal"
      onClick={onAct}
      initial={{ scale: 0.9, y: 8 }}
      animate={{ scale: 1, y: 0 }}
      transition={popSpring}
      style={{
        ...hudTag,
        width: '100%', minHeight: 46, padding: '0 0 0 9px', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
        borderColor: ready ? stamp : undefined,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <EmojiSprite id={sprite} emoji={emoji} size={26} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: ready ? stamp : ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>
      {detail && <span style={{ flexShrink: 0, fontFamily: MONO, fontSize: 12, color: inkHint }}>{detail}</span>}
      {/* The action sits in a red cap at the end of the bar. */}
      <span style={{
        flexShrink: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 14px', marginLeft: 2,
        background: stamp, color: paperLight, fontSize: 14, fontWeight: 600,
      }}>
        {action}
      </span>
    </motion.button>
  )
}
