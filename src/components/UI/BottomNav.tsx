import { NavLink, useLocation } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { isEggReady } from '@/lib/profile'
import { ink, paperLight, paperShade, stamp } from '@/lib/theme'
import { motion, AnimatePresence } from 'motion/react'
import { popSpring, tapScale } from '@/lib/motion'

const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
)

const CreaturesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="9" r="1.8" />
    <circle cx="12" cy="6.5" r="1.8" />
    <circle cx="17" cy="9" r="1.8" />
    <path d="M8 17c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 1.5-1.2 2.3-2.5 2-1-.3-2-.3-3 0-1.3.3-2.5-.5-2.5-2z" />
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

// The tabs of a notebook index. They rise from the bottom edge of the screen, and
// the open one stands taller, on lighter paper, under a red stripe.
const TAB_H = 56
const ACTIVE_H = 66

export function BottomNav() {
  const { t } = useLocale()
  const { profile } = useProfile()
  const hasReadyEgg = profile.eggs.some(isEggReady)
  const { pathname } = useLocation()

  const tabs = [
    { to: '/', icon: <MapIcon />, label: t('nav_map'), dot: false },
    { to: '/creatures', icon: <CreaturesIcon />, label: t('nav_creatures'), dot: hasReadyEgg },
    { to: '/squads', icon: <SquadsIcon />, label: t('nav_squads'), dot: false },
    { to: '/profile', icon: <ProfileIcon />, label: t('nav_profile'), dot: profile.pendingStreakChest },
  ]
  const activeIndex = tabs.findIndex(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)))

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6,
      alignItems: 'end', padding: '0 12px', maxWidth: 480, margin: '0 auto',
      pointerEvents: 'none',
    }}>
      {tabs.map(({ to, icon, label, dot }, i) => {
        const active = i === activeIndex
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              height: `calc(${active ? ACTIVE_H : TAB_H}px + env(safe-area-inset-bottom))`,
              paddingBottom: 'env(safe-area-inset-bottom)',
              background: active ? paperLight : paperShade,
              border: `1.5px solid ${ink}`, borderBottom: 'none',
              borderTop: active ? `5px solid ${stamp}` : `1.5px solid ${ink}`,
              borderRadius: '10px 10px 0 0',
              textDecoration: 'none', color: ink,
              fontSize: 12, fontWeight: active ? 600 : 500, lineHeight: '14px',
              transition: 'height 0.22s cubic-bezier(0.34,1.4,0.64,1), background 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
              pointerEvents: 'auto',
            }}
          >
            <AnimatePresence>
              {dot && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ scale: { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 } }}
                  style={{
                    position: 'absolute', top: 7, right: 12, width: 10, height: 10,
                    borderRadius: '50%', background: stamp, border: `1.5px solid ${paperLight}`,
                  }}
                />
              )}
            </AnimatePresence>
            <motion.span
              whileTap={tapScale}
              animate={active ? { y: [0, -5, 0], rotate: [0, -8, 0] } : { y: 0, rotate: 0 }}
              transition={active ? { duration: 0.45, ease: 'easeOut' } : popSpring}
              style={{ display: 'flex' }}
            >
              {icon}
            </motion.span>
            <span style={{ maxWidth: '100%', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
