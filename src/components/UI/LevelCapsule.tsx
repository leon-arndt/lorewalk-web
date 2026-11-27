import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { paperTag } from '@/lib/paper'
import { CountBump } from '@/components/UI/CountBump'

export function LevelCapsule({ level }: { level: number }) {
  const navigate = useNavigate()
  const { t } = useLocale()

  return (
    <button
     
      onClick={() => navigate('/profile')}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        ...paperTag,
        minHeight: 40, padding: '0 11px 0 7px',
        fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <EmojiSprite id="item_xp" emoji="⭐" size={22} /> <CountBump value={t('level_badge', { level })} />
    </button>
  )
}
