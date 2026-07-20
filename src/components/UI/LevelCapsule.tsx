import { useNavigate } from 'react-router-dom'
import { glassChrome } from '@/lib/glass'

export function LevelCapsule({ level }: { level: number }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/profile')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        ...glassChrome,
        borderRadius: 999,
        padding: '7px 14px',
        fontSize: 14, fontWeight: 700, color: '#6366f1',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ⭐ Lv {level}
    </button>
  )
}
