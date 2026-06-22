import { NavLink } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'

export function BottomNav() {
  const { t } = useLocale()

  const tabs = [
    { to: '/', icon: '🗺️', label: t('nav_map') },
    { to: '/creatures', icon: '🌿', label: t('nav_creatures') },
    { to: '/squads', icon: '🛡️', label: t('nav_squads') },
    { to: '/profile', icon: '👤', label: t('nav_profile') },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex',
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderTop: '1px solid rgba(255,255,255,0.6)',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '10px 0 12px',
            textDecoration: 'none',
            fontSize: 11,
            fontWeight: 500,
            color: isActive ? '#6366f1' : '#94a3b8',
            transition: 'color 0.15s ease',
          })}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
