import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import GpsVerify from '../components/GpsVerify'
import QRScanner from '../components/QRScanner'
import { getVenueById, checkOut } from '../utils/storage'
import { getVenueById as fbGetVenueById, checkIn as fbCheckIn, checkOut as fbCheckOut } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { isOperatingHours, nextOpeningTime } from '../utils/geo'
import { PRODUCTION_VENUES, seedProductionVenues } from '../utils/seedVenues'
import { ADMIN_UID } from '../config/admin'
import type { Venue } from '../types'

export default function CheckIn() {
  const { lang, user, checkin, refreshCheckin, isRTL } = useApp()
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [scanError, setScanError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const open = isOperatingHours()

  async function handleScan(venueId: string): Promise<void> {
    setScanError('')
    setScanning(false)
    let venue: Venue | null = null

    // 1. Try Firebase / localStorage
    try {
      venue = FIREBASE_CONFIGURED ? await fbGetVenueById(venueId) : (getVenueById(venueId) ?? null)
    } catch {}

    // 2. Fallback: built-in venue list (works even before Firestore is seeded)
    if (!venue) {
      const built = PRODUCTION_VENUES.find(v => v.id === venueId)
      if (built) {
        venue = {
          id: built.id,
          name: built.name,
          name_en: built.name_en,
          city: built.city,
          venue_type: built.venue_type,
          lat: built.lat,
          lng: built.lng,
          latitude: built.lat,
          longitude: built.lng,
          geofence_radius: built.geofence_radius,
          is_active: true,
          cover_image_url: null,
          active_count: 0,
        }
        // Seed venues to Firestore in the background so next time it works from Firebase
        if (FIREBASE_CONFIGURED) seedProductionVenues().catch(() => {})
      }
    }

    if (!venue) {
      setScanError(lang === 'he' ? `QR לא מזוהה (${venueId}) — נסה שוב` : `Unknown QR (${venueId}) — try again`)
      return
    }
    setSelectedVenue(venue)
  }

  async function handleVerifySuccess(): Promise<void> {
    if (!user || !selectedVenue) return
    try {
      await fbCheckIn(selectedVenue.id, user)
    } catch (e) {
      console.error('CheckIn error:', e)
    }
    refreshCheckin()
    setSelectedVenue(null)
    navigate('/feed')
  }

  async function handleLeave(): Promise<void> {
    setLeaving(true)
    try {
      if (FIREBASE_CONFIGURED && user?.id && user.id !== 'demo-user') {
        await fbCheckOut(user.id)
      } else {
        checkOut()
      }
    } catch {
      checkOut()
    }
    refreshCheckin()
    setLeaving(false)
  }

  const currentVenue = checkin
    ? (getVenueById(checkin.venue_id) ?? { name: checkin.venue_name ?? checkin.venue_id, city: checkin.venue_city ?? '', geofence_radius: 0 })
    : null

  return (
    <div className="h-full overflow-y-auto scroll-area scrollbar-hide" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-4 py-6 space-y-5 pb-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-white mb-1">📍 {t(lang, 'checkin')}</h1>
          <p className="text-sm text-white/40">
            {lang === 'he' ? 'סרוק את הברקוד של האירוע' : 'Scan the event QR code'}
          </p>
        </motion.div>

        {/* Hours banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${open
            ? 'glass-card border-green-400/25 bg-green-400/5'
            : 'glass-card border-orange-400/25 bg-orange-400/5'}`}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${open ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`} />
          <div>
            <p className={`text-sm font-semibold ${open ? 'text-green-400' : 'text-orange-400'}`}>
              {open
                ? (lang === 'he' ? 'האירועים פעילים כעת' : 'Events are active now')
                : (lang === 'he' ? 'מחוץ לשעות הפעילות' : 'Outside operating hours')}
            </p>
            <p className="text-xs text-white/40">
              {open
                ? (lang === 'he' ? 'כניסה אפשרית 20:00 – 06:00' : 'Entry available 20:00 – 06:00')
                : (lang === 'he' ? `נפתח בעוד ${nextOpeningTime()} · 20:00 – 06:00` : `Opens in ${nextOpeningTime()} · 20:00 – 06:00`)}
            </p>
          </div>
        </motion.div>

        {/* Current check-in */}
        <AnimatePresence>
          {currentVenue && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card border border-green-400/30 rounded-2xl p-4"
              style={{ boxShadow: '0 0 20px rgba(74,222,128,0.1)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-medium uppercase tracking-wider">
                      {t(lang, 'currentCheckin')}
                    </span>
                  </div>
                  <p className="text-white font-bold text-lg">{currentVenue.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {checkin?.session_date && (lang === 'he' ? `סשן: ${checkin.session_date}` : `Session: ${checkin.session_date}`)}
                  </p>
                </div>
                <NeonButton variant="danger" size="sm" onClick={handleLeave} disabled={leaving}>
                  {leaving ? '...' : t(lang, 'leaveVenue')}
                </NeonButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Scan button */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button onClick={() => { setScanError(''); setScanning(true) }}
            className="w-full rounded-3xl overflow-hidden relative"
            style={{ boxShadow: '0 0 40px hsl(290,100%,65%,0.2)' }}>
            <div className="absolute inset-0 rounded-3xl p-px"
              style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.6), hsl(320,100%,60%,0.6), hsl(185,100%,55%,0.6))' }}>
              <div className="w-full h-full rounded-3xl bg-[#0e0a1f]" />
            </div>
            <div className="relative z-10 py-10 flex flex-col items-center gap-4">
              <div className="w-24 h-24 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect x="5" y="5" width="35" height="35" rx="6" fill="none" stroke="hsl(290,100%,65%)" strokeWidth="4"/>
                  <rect x="13" y="13" width="19" height="19" rx="3" fill="hsl(290,100%,65%)" opacity="0.8"/>
                  <rect x="60" y="5" width="35" height="35" rx="6" fill="none" stroke="hsl(290,100%,65%)" strokeWidth="4"/>
                  <rect x="68" y="13" width="19" height="19" rx="3" fill="hsl(290,100%,65%)" opacity="0.8"/>
                  <rect x="5" y="60" width="35" height="35" rx="6" fill="none" stroke="hsl(290,100%,65%)" strokeWidth="4"/>
                  <rect x="13" y="68" width="19" height="19" rx="3" fill="hsl(290,100%,65%)" opacity="0.8"/>
                  <rect x="60" y="60" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="72" y="60" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="84" y="60" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="60" y="72" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="84" y="72" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="60" y="84" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="72" y="84" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                  <rect x="84" y="84" width="8" height="8" rx="2" fill="hsl(320,100%,60%)" opacity="0.7"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-black text-xl mb-1">
                  {lang === 'he' ? 'סרוק ברקוד' : 'Scan QR Code'}
                </p>
                <p className="text-white/40 text-sm">
                  {lang === 'he' ? 'הצב את הטלפון מול ה-QR של האירוע' : 'Point your phone at the event QR'}
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.2), hsl(320,100%,60%,0.2))', border: '1px solid hsl(290,100%,65%,0.3)' }}>
                <span className="text-sm">📸</span>
                <span className="text-sm font-semibold" style={{ color: 'hsl(290,100%,75%)' }}>
                  {lang === 'he' ? 'פתח מצלמה' : 'Open Camera'}
                </span>
              </div>
            </div>
          </button>

          {scanError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center mt-3">
              ⚠️ {scanError}
            </motion.p>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="glass-card border border-white/8 rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            {lang === 'he' ? 'איך זה עובד?' : 'How it works'}
          </p>
          {[
            ['🎫', lang === 'he' ? 'בעל העסק מדפיס QR אחד — קבוע לתמיד' : 'Venue owner prints one QR — permanent forever'],
            ['📍', lang === 'he' ? 'אימות GPS — חייב להיות במקום פיזית' : 'GPS verification — must be physically present'],
            ['🔄', lang === 'he' ? 'הסשן מתאפס אוטומטית בכל לילה ב-06:00' : 'Session resets automatically each night at 06:00'],
            ['🕗', lang === 'he' ? 'פעיל רק בין 20:00 ל-06:00' : 'Active only between 20:00 and 06:00'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 text-xs text-white/40">
              <span className="text-base shrink-0">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {scanning && (
          <QRScanner lang={lang} onScan={handleScan} onCancel={() => setScanning(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVenue && (
          <GpsVerify
            venue={selectedVenue}
            lang={lang}
            onSuccess={handleVerifySuccess}
            onCancel={() => setSelectedVenue(null)}
            devBypass={user?.is_admin}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
