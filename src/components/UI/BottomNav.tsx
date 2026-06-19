import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Map', icon: '🗺️' },
  { to: '/creatures', label: 'Creatures', icon: '🌿' },
  { to: '/expeditions', label: 'Expeditions', icon: '🧭' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav className="flex-shrink-0 flex bg-[#1a0a2e] border-t border-white/10 pb-safe">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-indigo-400' : 'text-white/40'
            }`
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
