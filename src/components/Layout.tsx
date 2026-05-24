import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'

const NAV = [
  { to: '/', icon: '🏠', key: 'home' },
  { to: '/feed', icon: '✨', key: 'floor' },
  { to: '/matches', icon: '💘', key: 'matches', badge: true },
  { to: '/profile', icon: '👤', key: 'profile' },
]

export default function Layout({ children }) {
  const { lang, isRTL, newMatchCount } = useApp()
  const loc = useLocation()
  const hideNav = loc.pathname.startsWith('/chat')
    || loc.pathname === '/onboarding'
    || loc.pathname === '/terms'

  return (
    <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="shrink-0 safe-top" />

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      {!hideNav && (
        <nav className="shrink-0 border-t border-white/8"
          style={{
            background: 'rgba(7,7,15,0.92)',
            backdropFilter: 'blur(20px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
          }}>
          <div className="flex items-center justify-around py-1.5">
            {NAV.map(({ to, icon, key, badge }) => {
              const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to}
                  className="relative flex flex-col items-center gap-0.5 px-5 py-1.5 group min-w-[60px]">

                  {/* Active pill background */}
                  {active && (
                    <motion.div layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: 'hsl(290,100%,65%,0.12)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}

                  <motion.div whileTap={{ scale: 0.82 }} className="relative z-10">
                    <span className={`text-2xl block transition-all duration-200 ${active ? '' : 'opacity-35 group-hover:opacity-60'}`}
                      style={active ? { filter: 'drop-shadow(0 0 8px hsl(290,100%,65%))' } : {}}>
                      {icon}
                    </span>

                    {/* Badge */}
                    {badge && newMatchCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] text-[10px] font-black flex items-center justify-center rounded-full text-white px-1"
                        style={{ background: 'hsl(320,100%,60%)', boxShadow: '0 0 8px hsl(320,100%,60%)' }}>
                        {newMatchCount > 9 ? '9+' : newMatchCount}
                      </motion.span>
                    )}
                  </motion.div>

                  <span className={`text-[10px] font-semibold z-10 relative transition-all ${active ? 'text-[hsl(290,100%,70%)]' : 'text-white/25'}`}>
                    {t(lang, key)}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
