import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'
import { accent } from '@/lib/theme'

export function LevelCapsule({ level }: { level: number }) {
  const navigate = useNavigate()
  const { t } = useLocale()

  return (
    <button
      onClick={() => navigate('/profile')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        ...glassChrome,
        borderRadius: 999,
        padding: '7px 14px',
        fontSize: 14, fontWeight: 700, color: accent,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ⭐ {t('level_badge', { level })}
    </button>
  )
}
