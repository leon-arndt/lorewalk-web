import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'
import { accent } from '@/lib/theme'
import { motion } from 'motion/react'
import { CountBump } from '@/components/UI/CountBump'
import { tapScale } from '@/lib/motion'

export function LevelCapsule({ level }: { level: number }) {
  const navigate = useNavigate()
  const { t } = useLocale()

  return (
    <motion.button
      whileTap={tapScale}
      onClick={() => navigate('/profile')}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        ...glassChrome,
        borderRadius: 999,
        padding: '6px 13px',
        fontSize: 13, fontWeight: 700, color: accent,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <EmojiSprite id="item_xp" emoji="⭐" size={18} /> <CountBump value={t('level_badge', { level })} />
    </motion.button>
  )
}
