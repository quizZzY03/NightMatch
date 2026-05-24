import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPosition, isWithinGeofence, isOperatingHours, nextOpeningTime } from '../utils/geo'
import { getCurrentUser, saveUser } from '../utils/storage'
import NeonButton from './NeonButton'
import Avatar from './Avatar'

// flow: profile_confirm → checking → success  (or error states)
export default function GpsVerify({ venue, lang, onSuccess, onCancel, devBypass = false }) {
  const user = getCurrentUser()
  const [state, setState] = useState('profile_confirm')
  const [detail, setDetail] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)
  const [status, setStatus] = useState(user?.tonight_status || '')

  const he = lang === 'he'

  const STATUS_OPTIONS = he
    ? ['פנוי/ה לרומנטיקה 💞', 'כאן לבלות 🎉', 'מחפש/ת חברים חדשים 👥', 'סתם מסתכל/ת 👀', 'פנוי/ה לכל מה שיבוא ✨']
    : ['Open to romance 💞', 'Here to have fun 🎉', 'Looking for new friends 👥', 'Just looking 👀', 'Open to anything ✨']

  const VENUE_ICON = { bar: '🍸', club: '🎵', wedding: '💍', event: '✨', other: '📍' }[venue.venue_type] || '📍'

  function confirmProfile() {
    // Save updated status to profile before proceeding
    if (status !== user?.tonight_status) {
      saveUser({ tonight_status: status })
    }
    runGps()
  }

  async function runGps() {
    // Dev/admin bypass — skip hours and GPS checks entirely
    if (devBypass) {
      setState('success')
      setTimeout(() => onSuccess(), 900)
      return
    }

    // 1. Operating hours
    if (!isOperatingHours()) { setState('error_hours'); return }

    // 2. GPS
    setState('checking')
    try {
      const pos = await getPosition(12000)
      const { within, distance } = isWithinGeofence(pos.lat, pos.lon, venue)
      if (!within) {
        setDetail(he
          ? `אתה נמצא במרחק ${distance} מ׳ מהמקום (מותר עד ${venue.geofence_radius} מ׳)`
          : `You are ${distance}m from the venue (max ${venue.geofence_radius}m)`)
        setState('error_far')
        return
      }
      setState('success')
      setTimeout(() => onSuccess(), 900)
    } catch (err) {
      if (err.code === 1) setState('error_permission')
      else { setDetail(err.message || 'GPS error'); setState('error_gps') }
    }
  }

  const canDismiss = state !== 'checking' && state !== 'success'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(18px)' }}
      onClick={e => { if (e.target === e.currentTarget && canDismiss) onCancel() }}>

      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="glass-card border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>

        {/* Venue strip */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/8">
          <span className="text-2xl">{VENUE_ICON}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{venue.name}</p>
            <p className="text-xs text-white/40">{venue.city} · GPS {venue.geofence_radius}{he ? 'מ׳' : 'm'}</p>
          </div>
          {canDismiss && (
            <button onClick={onCancel} className="text-white/30 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
          )}
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Profile confirm ─────────────────────────────────── */}
            {state === 'profile_confirm' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }} className="space-y-4">

                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                  {he ? 'הפרופיל שלך באירוע' : 'Your profile at this event'}
                </p>

                {/* Profile card */}
                <div className="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <Avatar src={user?.photo1_url} name={user?.display_name} size="lg" online />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{user?.display_name}</p>
                    <p className="text-sm text-white/50">
                      {user?.age}{user?.gender ? ` · ${user.gender === 'male' ? (he ? 'גבר' : 'Male') : user.gender === 'female' ? (he ? 'אישה' : 'Female') : (he ? 'אחר' : 'Other')}` : ''}
                    </p>
                    {user?.bio && <p className="text-xs text-white/30 truncate mt-0.5">{user.bio}</p>}
                  </div>
                </div>

                {/* Tonight status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/40">{he ? 'סטטוס הלילה' : "Tonight's status"}</p>
                    <button onClick={() => setEditingStatus(v => !v)}
                      className="text-xs text-[hsl(290,100%,65%)] font-medium">
                      {editingStatus ? (he ? 'סגור' : 'Done') : (he ? 'שנה' : 'Change')}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {editingStatus ? (
                      <motion.div key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden">
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt} onClick={() => { setStatus(opt); setEditingStatus(false) }}
                            className={`w-full text-start text-sm px-3 py-2.5 rounded-xl border transition-all ${status === opt
                              ? 'border-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)] text-white'
                              : 'border-white/10 text-white/50 glass-card hover:border-white/25'}`}>
                            {opt}
                          </button>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="glass-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80">
                          {status || <span className="text-white/30">{he ? 'לא נבחר סטטוס' : 'No status selected'}</span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm button */}
                <div className="flex flex-col gap-2 pt-1">
                  <NeonButton variant="purple" size="lg" fullWidth onClick={confirmProfile}>
                    {devBypass ? '🔧' : '📍'} {he ? (devBypass ? 'כנס (מצב פיתוח)' : 'אמת מיקום וכנס') : (devBypass ? 'Join (Dev Mode)' : 'Verify Location & Join')}
                  </NeonButton>
                  <p className="text-center text-xs text-white/25">
                    {devBypass
                      ? (he ? '🔧 מצב Admin — בלי בדיקת GPS / שעות' : '🔧 Admin mode — GPS & hours skipped')
                      : (he ? 'יידרש GPS · 20:00–06:00 בלבד' : 'GPS required · 20:00–06:00 only')}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Checking GPS ────────────────────────────────────── */}
            {state === 'checking' && (
              <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-6">
                <div className="relative w-20 h-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-[3px] border-transparent"
                    style={{ borderTopColor: 'hsl(290,100%,65%)', borderRightColor: 'hsl(320,100%,60%)' }} />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">📍</div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{he ? 'מאתר מיקום...' : 'Locating...'}</p>
                  <p className="text-sm text-white/40 mt-1">{he ? 'אנא המתן כמה שניות' : 'Please wait a few seconds'}</p>
                </div>
              </motion.div>
            )}

            {/* ── SUCCESS ─────────────────────────────────────────────────── */}
            {state === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="flex flex-col items-center gap-3 py-6">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-5xl">✅</motion.div>
                <div className="text-center">
                  <p className="font-bold text-white text-lg">{he ? 'מיקום אומת!' : 'Location Verified!'}</p>
                  <p className="text-sm text-white/50 mt-1">{he ? `ברוך/ה הבא/ה ל${venue.name} 🎉` : `Welcome to ${venue.name} 🎉`}</p>
                </div>
              </motion.div>
            )}

            {/* ── ERROR: Hours ─────────────────────────────────────────────── */}
            {state === 'error_hours' && (
              <motion.div key="err_hours" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
                <div className="text-5xl">🌙</div>
                <div>
                  <p className="font-bold text-white">{he ? 'האירוע עדיין לא נפתח' : 'Event Not Open Yet'}</p>
                  <p className="text-sm text-white/50 mt-1 whitespace-pre-line">
                    {he ? `הכניסה זמינה בין 20:00 ל-06:00\nנפתח בעוד ${nextOpeningTime()}` : `Entry available 20:00–06:00\nOpens in ${nextOpeningTime()}`}
                  </p>
                </div>
                <NeonButton variant="ghost" size="md" fullWidth onClick={onCancel}>{he ? 'סגור' : 'Close'}</NeonButton>
              </motion.div>
            )}

            {/* ── ERROR: Permission ────────────────────────────────────────── */}
            {state === 'error_permission' && (
              <motion.div key="err_perm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
                <div className="text-5xl">🔒</div>
                <div>
                  <p className="font-bold text-white">{he ? 'נדרשת הרשאת מיקום' : 'Location Permission Required'}</p>
                  <p className="text-sm text-white/50 mt-1">{he ? 'אפשר גישה למיקום בהגדרות הדפדפן ונסה שוב' : 'Enable location in browser settings and try again'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <NeonButton variant="purple" size="md" fullWidth onClick={runGps}>{he ? 'נסה שוב' : 'Try Again'}</NeonButton>
                  <NeonButton variant="ghost" size="sm" fullWidth onClick={() => setState('profile_confirm')}>{he ? 'חזור' : 'Back'}</NeonButton>
                </div>
              </motion.div>
            )}

            {/* ── ERROR: Too far ───────────────────────────────────────────── */}
            {state === 'error_far' && (
              <motion.div key="err_far" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
                <div className="text-5xl">📡</div>
                <div>
                  <p className="font-bold text-white">{he ? 'אתה לא נמצא במקום' : "You're Not at the Venue"}</p>
                  <p className="text-sm text-white/50 mt-1">{detail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <NeonButton variant="purple" size="md" fullWidth onClick={runGps}>{he ? 'נסה שוב' : 'Try Again'}</NeonButton>
                  <NeonButton variant="ghost" size="sm" fullWidth onClick={() => setState('profile_confirm')}>{he ? 'חזור' : 'Back'}</NeonButton>
                </div>
              </motion.div>
            )}

            {/* ── ERROR: GPS generic ───────────────────────────────────────── */}
            {state === 'error_gps' && (
              <motion.div key="err_gps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
                <div className="text-5xl">⚠️</div>
                <div>
                  <p className="font-bold text-white">{he ? 'שגיאת GPS' : 'GPS Error'}</p>
                  <p className="text-sm text-white/50 mt-1">{detail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <NeonButton variant="purple" size="md" fullWidth onClick={runGps}>{he ? 'נסה שוב' : 'Try Again'}</NeonButton>
                  <NeonButton variant="ghost" size="sm" fullWidth onClick={() => setState('profile_confirm')}>{he ? 'חזור' : 'Back'}</NeonButton>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
