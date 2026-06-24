import { NavLink } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { glassNav } from '@/lib/glass'

const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
)

const CreaturesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const SquadsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
  </svg>
)

export function BottomNav() {
  const { t } = useLocale()

  const tabs = [
    { to: '/', icon: <MapIcon />, label: t('nav_map') },
    { to: '/creatures', icon: <CreaturesIcon />, label: t('nav_creatures') },
    { to: '/squads', icon: <SquadsIcon />, label: t('nav_squads') },
    { to: '/profile', icon: <ProfileIcon />, label: t('nav_profile') },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex',
      gap: 2,
      padding: 6,
      ...glassNav,
      whiteSpace: 'nowrap',
    }}>
      {tabs.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            width: 64,
            height: 52,
            borderRadius: 999,
            textDecoration: 'none',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            color: isActive ? '#6366f1' : 'rgba(100,116,139,0.70)',
            background: isActive
              ? 'rgba(99,102,241,0.12)'
              : 'transparent',
            boxShadow: isActive
              ? 'inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -0.5px 0 rgba(99,102,241,0.10)'
              : 'none',
            transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
          })}
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
