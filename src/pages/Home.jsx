import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import CountdownTimer, { CountdownTimerCompact } from '../components/CountdownTimer'
import { getLiveStats, getVenueById, startDemo, checkOut } from '../utils/storage'

function StatCard({ label, value, color }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} className="glass-card border border-white/10 rounded-2xl p-4 text-center flex-1">
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
        className="text-3xl font-black mb-1" style={{ color, textShadow: `0 0 12px ${color}` }}>
        {value.toLocaleString()}
      </motion.div>
      <div className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</div>
    </motion.div>
  )
}

const FEATURES = [
  { icon: '📍', key: 'featureRealtime', descKey: 'featureRealtimeDesc', color: 'hsl(290,100%,65%)' },
  { icon: '⚡', key: 'featureMatch', descKey: 'featureMatchDesc', color: 'hsl(320,100%,60%)' },
  { icon: '🔒', key: 'featurePrivacy', descKey: 'featurePrivacyDesc', color: 'hsl(185,100%,55%)' },
]

export default function Home() {
  const { lang, checkin, user, refreshCheckin, updateUser } = useApp()
  const navigate = useNavigate()

  function handleDemo() {
    const { user: demoUser } = startDemo()
    updateUser(demoUser)
    refreshCheckin()
    navigate('/feed')
  }
  const [stats, setStats] = useState({ active_checkins: 847, active_matches: 203 })

  useEffect(() => {
    const id = setInterval(() => setStats(getLiveStats()), 5000)
    setStats(getLiveStats())
    return () => clearInterval(id)
  }, [])

  const venue = checkin ? getVenueById(checkin.venue_id) : null

  return (
    <div className="h-full overflow-y-auto scroll-area scrollbar-hide">
      <div className="min-h-full px-4 py-6 space-y-6 pb-8">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center pt-4 pb-2">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-4xl mb-3">✨</motion.div>
          <h1 className="text-4xl font-black tracking-tight mb-1"
            style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%), hsl(185,100%,55%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t(lang, 'appName')}
          </h1>
          <p className="text-white/40 text-sm">{t(lang, 'appTagline')}</p>
        </motion.div>

        {/* Live Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex gap-3">
          <StatCard label={t(lang, 'nowOut')} value={stats.active_checkins} color="hsl(290,100%,65%)" />
          <StatCard label={t(lang, 'matchesTonight')} value={stats.active_matches} color="hsl(320,100%,60%)" />
        </motion.div>

        {/* Active venue card OR big CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {venue ? (
            <div className="glass-card border border-[hsl(290,100%,65%,0.3)] rounded-2xl p-5"
              style={{ boxShadow: '0 0 24px hsl(290,100%,65%,0.15)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-white/50 uppercase tracking-wider">{t(lang, 'activeVenue')}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{venue.name}</h3>
              <p className="text-sm text-white/40 mb-4">{venue.city} · {venue.active_count} {t(lang, 'activeCheckins')}</p>
              <NeonButton variant="purple" size="lg" fullWidth onClick={() => navigate('/feed')}>
                ✨ {t(lang, 'enterFloor')}
              </NeonButton>
              <div className="mt-3 pt-3 border-t border-white/8 flex gap-2">
                <button onClick={() => navigate('/checkin')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white glass-card border border-white/10 hover:border-white/25 transition-colors">
                  📷 {lang === 'he' ? 'סרוק QR' : 'Scan QR'}
                </button>
                <button onClick={() => { checkOut(); refreshCheckin() }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-red-400/70 hover:text-red-400 glass-card border border-red-400/10 hover:border-red-400/30 transition-colors">
                  🚪 {lang === 'he' ? 'עזוב מקום' : 'Leave Venue'}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-white mb-1">{t(lang, 'noVenue')}</h3>
              <p className="text-sm text-white/40 mb-4">{t(lang, 'noVenueDesc')}</p>
              <NeonButton variant="cyan" size="lg" fullWidth onClick={() => navigate('/checkin')}>
                📍 {t(lang, 'checkin')}
              </NeonButton>

              {/* Demo button */}
              <div className="mt-3 pt-3 border-t border-white/8">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDemo}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, hsl(290,100%,65%,0.15), hsl(320,100%,60%,0.15))',
                    border: '1px solid hsl(290,100%,65%,0.3)',
                    color: 'hsl(290,100%,75%)',
                  }}>
                  🎮 {lang === 'he' ? 'נסה דמו — החלק קלפים' : 'Try Demo — Swipe Cards'}
                </motion.button>
                <p className="text-[10px] text-white/20 mt-1.5">
                  {lang === 'he' ? 'ללא צ\'ק-אין — לחוויה בלבד' : 'No check-in needed — just explore'}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Countdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="glass-card border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">⏱ {t(lang, 'flushWarning')}</span>
          </div>
          <CountdownTimer />
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="space-y-3">
          {FEATURES.map(({ icon, key, descKey, color }, i) => (
            <motion.div key={key} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
              className="glass-card border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="text-2xl w-10 text-center">{icon}</div>
              <div>
                <div className="font-semibold text-white text-sm">{t(lang, key)}</div>
                <div className="text-xs text-white/40">{t(lang, descKey)}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
