import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import CountdownTimer from '../components/CountdownTimer'
import { listenStats } from '../firebase/db'
import { getLiveStats, getVenueById, checkOut } from '../utils/storage'
import { checkOut as fbCheckOut } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export default function Home() {
  const { lang, checkin, user, refreshCheckin } = useApp()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ active_checkins: 0, active_matches: 0 })
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    if (FIREBASE_CONFIGURED) {
      const unsub = listenStats(s => { setStats(s); setStatsLoaded(true) })
      return unsub
    } else {
      const id = setInterval(() => setStats(getLiveStats()), 5000)
      setStats(getLiveStats())
      setStatsLoaded(true)
      return () => clearInterval(id)
    }
  }, [])

  const venue = checkin
    ? (getVenueById(checkin.venue_id) || { name: checkin.venue_name || checkin.venue_id, city: checkin.venue_city || '' })
    : null
  const he = lang === 'he'
  const { canInstall, triggerInstall } = useInstallPrompt()

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" dir={he ? 'rtl' : 'ltr'}>
      <div className="min-h-full px-4 pt-8 pb-10 flex flex-col gap-5">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <motion.div
            animate={{ y: [0, -7, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-4 inline-block">🌙</motion.div>
          <h1 className="text-4xl font-black tracking-tight mb-2"
            style={{ background: 'linear-gradient(135deg, hsl(290,100%,70%), hsl(320,100%,65%), hsl(185,100%,58%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NightMatch
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            {he ? 'מאצ\'ים בזמן אמת — רק עם מי שכבר שם 🔥' : 'Real-time matches — only with people already there 🔥'}
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3">
          {[
            { label: he ? 'בחוץ הלילה' : 'Out tonight', value: stats.active_checkins, color: 'hsl(290,100%,65%)', icon: '🌙' },
            { label: he ? 'מאצ\'ים הלילה' : 'Matches tonight', value: stats.active_matches, color: 'hsl(320,100%,60%)', icon: '💘' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="glass-card border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <motion.div
                animate={statsLoaded ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="text-3xl font-black mb-0.5" style={{ color }}>
                {statsLoaded ? value.toLocaleString() : '—'}
              </motion.div>
              <div className="text-[11px] text-white/35 uppercase tracking-wider font-medium">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Main action */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {venue ? (
            /* Checked-in card */
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.12), hsl(320,100%,60%,0.08))', border: '1px solid hsl(290,100%,65%,0.3)', boxShadow: '0 0 30px hsl(290,100%,65%,0.1)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                  {he ? 'המקום שלך הלילה' : 'Your venue tonight'}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{venue.name}</h3>
                {venue.city && <p className="text-sm text-white/40 mt-0.5">📍 {venue.city}</p>}
              </div>
              <NeonButton variant="purple" size="lg" fullWidth onClick={() => navigate('/feed')}>
                ✨ {he ? 'כנס לפיד' : 'Enter Feed'}
              </NeonButton>
              <div className="flex gap-2">
                <button onClick={() => navigate('/checkin')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white glass-card border border-white/10 hover:border-white/25 transition-colors">
                  📷 {he ? 'שנה מקום' : 'Change venue'}
                </button>
                <button onClick={async () => {
                  try {
                    if (FIREBASE_CONFIGURED && user?.id && user.id !== 'demo-user') await fbCheckOut(user.id)
                    else checkOut()
                  } catch { checkOut() }
                  refreshCheckin()
                }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-red-400/60 hover:text-red-400 glass-card border border-red-400/15 hover:border-red-400/30 transition-colors">
                  🚪 {he ? 'עזוב' : 'Leave'}
                </button>
              </div>
            </div>
          ) : (
            /* Not checked in */
            <div className="rounded-2xl p-6 text-center space-y-4 glass-card border border-white/10">
              <div>
                <p className="text-white/60 text-sm font-medium mb-1">
                  {he ? 'סרוק את ה-QR במקום שאתה נמצא בו' : 'Scan the QR code at your venue'}
                </p>
                <p className="text-white/30 text-xs">
                  {he ? 'ותתחיל להתאחד עם אנשים שם עכשיו' : 'Start matching with people there right now'}
                </p>
              </div>
              <NeonButton variant="purple" size="lg" fullWidth onClick={() => navigate('/checkin')}>
                📷 {he ? 'סרוק QR ← צ\'ק-אין' : 'Scan QR ← Check in'}
              </NeonButton>
            </div>
          )}
        </motion.div>

        {/* Session reset countdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="glass-card border border-white/8 rounded-2xl p-4">
          <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2 font-medium text-center">
            ⏱ {he ? 'איפוס הסשן בעוד' : 'Session resets in'}
          </p>
          <CountdownTimer />
          <p className="text-[10px] text-white/20 text-center mt-2">
            {he ? 'כל המאצ\'ים והצ\'ק-אינים מתאפסים ב-06:00' : 'All matches & check-ins reset at 06:00 AM'}
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
          <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium px-1">
            {he ? 'איך זה עובד' : 'How it works'}
          </p>
          {[
            { icon: '📷', title: he ? 'סרוק QR' : 'Scan QR', desc: he ? 'הצ\'ק-אין מחבר אותך לאנשים שבאותו מקום' : 'Check-in connects you to people at the same venue' },
            { icon: '✨', title: he ? 'סווייפ' : 'Swipe', desc: he ? 'לייק ימינה, פאס שמאלה — פשוט ומהיר' : 'Like right, pass left — simple and fast' },
            { icon: '💬', title: he ? 'דבר עכשיו' : 'Chat now', desc: he ? 'מאצ\' = פותח צ\'אט — תכתבו לפני שהלילה נגמר' : 'Match = chat opens — write before the night ends' },
          ].map(({ icon, title, desc }, i) => (
            <motion.div key={title} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 + i * 0.08 }}
              className="glass-card border border-white/8 rounded-xl p-3.5 flex items-center gap-3.5">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Install App banner — shown only on Android Chrome or other browsers that support beforeinstallprompt */}
        {canInstall && (
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            onClick={triggerInstall}
            className="w-full flex items-center gap-3 rounded-2xl p-4 border border-[hsl(290,100%,65%,0.3)] text-start"
            style={{ background: 'hsl(290,100%,65%,0.07)' }}
          >
            <span className="text-2xl">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{he ? 'הוסף למסך הבית' : 'Add to Home Screen'}</p>
              <p className="text-xs text-white/40">{he ? 'גישה מהירה בלי דפדפן' : 'Instant access without browser'}</p>
            </div>
            <span className="text-[hsl(290,100%,70%)] text-xs font-semibold shrink-0">{he ? 'התקן' : 'Install'}</span>
          </motion.button>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <button onClick={() => navigate('/terms')} className="text-[10px] text-white/20 hover:text-white/40 transition-colors underline">
            {he ? 'תנאי שימוש ופרטיות' : 'Terms & Privacy'}
          </button>
        </div>

      </div>
    </div>
  )
}
