import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import { checkIn as fbCheckIn } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { seedTestCheckins, clearUserLikesForSession, TEST_USERS_AS_FEED, TEST_VENUE_ID } from '../utils/seedTestData'
import { setDemoFeedPeople } from '../utils/storage'

const NAV = [
  { to: '/', icon: '🏠', key: 'home' },
  { to: '/feed', icon: '✨', key: 'floor' },
  { to: '/matches', icon: '💘', key: 'matches', badge: true },
  { to: '/profile', icon: '👤', key: 'profile' },
]

export default function Layout({ children }) {
  const { lang, isRTL, newMatchCount, user, checkin, refreshCheckin } = useApp()
  const loc = useLocation()
  const navigate = useNavigate()
  const hideNav = loc.pathname.startsWith('/chat')
    || loc.pathname === '/onboarding'
    || loc.pathname === '/terms'

  const isTestMode = checkin?.venue_id === TEST_VENUE_ID && user?.is_admin

  async function handleTestReset() {
    if (!user) return
    try {
      const isDemo = user.id === 'demo-user'
      if (isDemo) {
        setDemoFeedPeople(TEST_USERS_AS_FEED)
      } else {
        await clearUserLikesForSession(user.id, TEST_VENUE_ID)
        if (FIREBASE_CONFIGURED) await fbCheckIn(TEST_VENUE_ID, user)
        refreshCheckin()
        await seedTestCheckins(TEST_VENUE_ID)
      }
      navigate('/feed')
    } catch (e) {
      console.error('Test reset failed', e)
    }
  }

  function handleTestExit() {
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="shrink-0 safe-top" />

      {/* Test mode banner */}
      <AnimatePresence>
        {isTestMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-1.5 text-xs font-bold"
              style={{ background: 'linear-gradient(90deg, hsl(280,100%,30%), hsl(320,100%,28%))' }}>
              <span className="text-white/90">🧪 מצב טסט — רוטשילד 26</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestReset}
                  className="px-2.5 py-1 rounded-lg text-white/80 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  🔄 אפס
                </button>
                <button
                  onClick={handleTestExit}
                  className="px-2.5 py-1 rounded-lg text-white/80 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  ✕ צא
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
