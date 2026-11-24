import { NavLink, useLocation } from 'react-router-dom'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { isEggReady } from '@/lib/profile'
import { glassNav } from '@/lib/glass'
import { accent, accentAlpha } from '@/lib/theme'
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

const TAB_W = 64
const TAB_GAP = 2

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
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex',
      gap: TAB_GAP,
      padding: 6,
      ...glassNav,
      whiteSpace: 'nowrap',
    }}>
      <motion.span
        aria-hidden
        initial={false}
        animate={{
          x: Math.max(0, activeIndex) * (TAB_W + TAB_GAP),
          scaleX: [1.18, 1],
          opacity: activeIndex < 0 ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.8 }}
        style={{
          position: 'absolute', top: 6, left: 6, width: TAB_W, height: 52,
          borderRadius: 999, pointerEvents: 'none',
          background: accentAlpha(0.12),
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -0.5px 0 ${accentAlpha(0.10)}`,
        }}
      />
      {tabs.map(({ to, icon, label, dot }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            width: TAB_W,
            height: 52,
            borderRadius: 999,
            textDecoration: 'none',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            color: isActive ? accent : 'rgba(100,116,139,0.70)',
            transition: 'color 0.25s ease',
            WebkitTapHighlightColor: 'transparent',
          })}
        >
          {({ isActive }) => (
            <>
              <AnimatePresence>
                {dot && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.25, 1] }}
                    exit={{ scale: 0 }}
                    transition={{ scale: { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 } }}
                    style={{
                      position: 'absolute', top: 6, right: 14, width: 9, height: 9,
                      borderRadius: '50%', background: '#ef4444', border: '1.5px solid white',
                    }}
                  />
                )}
              </AnimatePresence>
              <motion.span
                whileTap={tapScale}
                animate={isActive ? { y: [0, -5, 0], rotate: [0, -8, 0] } : { y: 0, rotate: 0 }}
                transition={isActive ? { duration: 0.45, ease: 'easeOut' } : popSpring}
                style={{ display: 'flex' }}
              >
                {icon}
              </motion.span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
