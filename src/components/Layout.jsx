import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'

const NAV = [
  { to: '/', icon: '🏠', key: 'home' },
  { to: '/feed', icon: '✨', key: 'floor' },
  { to: '/matches', icon: '💫', key: 'matches', badge: true },
  { to: '/profile', icon: '👤', key: 'profile' },
]

export default function Layout({ children }) {
  const { lang, isRTL, newMatchCount } = useApp()
  const loc = useLocation()
  const hideNav = loc.pathname.startsWith('/chat') || loc.pathname === '/onboarding'

  return (
    <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Status bar spacer on real phones (safe-area-inset-top) */}
      <div className="shrink-0 safe-top" />

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      {!hideNav && (
        <nav className="shrink-0 glass-card border-t border-white/10 rounded-none"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
          <div className="flex items-center justify-around py-2">
            {NAV.map(({ to, icon, key, badge }) => {
              const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 group">
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className={`relative text-2xl transition-all duration-200 ${active ? 'drop-shadow-lg' : 'opacity-40 group-hover:opacity-70'}`}
                    style={active ? { filter: 'drop-shadow(0 0 8px hsl(290,100%,65%))' } : {}}
                  >
                    {icon}
                    {badge && newMatchCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center rounded-full text-white px-1"
                        style={{ background: 'hsl(320,100%,60%)', boxShadow: '0 0 8px hsl(320,100%,60%)' }}
                      >
                        {newMatchCount > 9 ? '9+' : newMatchCount}
                      </motion.span>
                    )}
                  </motion.div>
                  <span className={`text-[10px] font-medium transition-all ${active ? 'text-[hsl(290,100%,65%)]' : 'text-white/30'}`}>
                    {t(lang, key)}
                  </span>
                  {active && (
                    <motion.div layoutId="nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full"
                      style={{ background: 'hsl(290,100%,65%)', boxShadow: '0 0 6px hsl(290,100%,65%)' }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
