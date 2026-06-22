import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Map', icon: '🗺️' },
  { to: '/creatures', label: 'Creatures', icon: '🌿' },
  { to: '/squads', label: 'Squads', icon: '🛡️' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav style={{
      display: 'flex',
      background: '#ffffff',
      borderTop: '1px solid #f1f5f9',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
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
