import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isOperatingHours } from '../utils/geo'
import { getCurrentUser, saveUser } from '../utils/storage'
import NeonButton from './NeonButton'
import Avatar from './Avatar'

export default function GpsVerify({ venue, lang, onSuccess, onCancel }: {
  venue: { id: string; name: string; city?: string; venue_type?: string; geofence_radius: number }
  lang: string
  onSuccess: () => void
  onCancel: () => void
  devBypass?: boolean
}) {
  const user = getCurrentUser()
  const [state, setState] = useState<'profile_confirm' | 'success'>('profile_confirm')
  const [editingStatus, setEditingStatus] = useState(false)
  const [status, setStatus] = useState(user?.tonight_status || '')
  const open = isOperatingHours()
  const he = lang === 'he'

  const STATUS_OPTIONS = he
    ? ['פנוי/ה לרומנטיקה 💞', 'כאן לבלות 🎉', 'מחפש/ת חברים חדשים 👥', 'סתם מסתכל/ת 👀', 'פנוי/ה לכל מה שיבוא ✨']
    : ['Open to romance 💞', 'Here to have fun 🎉', 'Looking for new friends 👥', 'Just looking 👀', 'Open to anything ✨']

  const VENUE_ICON: Record<string, string> = { bar: '🍸', club: '🎵', wedding: '💍', event: '✨', other: '📍' }
  const venueIcon = VENUE_ICON[venue.venue_type ?? ''] ?? '📍'

  function confirmProfile() {
    if (status !== user?.tonight_status) {
      saveUser({ tonight_status: status })
    }
    setState('success')
    setTimeout(() => onSuccess(), 900)
  }

  const canDismiss = state !== 'success'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(18px)' }}
      onClick={e => { if (e.target === e.currentTarget && canDismiss) onCancel() }}>

      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="glass-card border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-sm"
        style={{
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" style={{ flexShrink: 0 }}>
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Venue strip */}
        <div className="flex items-center gap-3 px-5 pb-4 border-b border-white/8" style={{ flexShrink: 0 }}>
          <span className="text-2xl">{venueIcon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{venue.name}</p>
            {venue.city && <p className="text-xs text-white/40">{venue.city}</p>}
          </div>
          {canDismiss && (
            <button
              onClick={onCancel}
              className="text-white/30 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >✕</button>
          )}
        </div>

        {/* Scrollable body — contains everything incl. sticky CTA */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
          <AnimatePresence mode="wait">

            {state === 'profile_confirm' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                <div className="p-5 space-y-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    {he ? 'הפרופיל שלך באירוע' : 'Your profile at this event'}
                  </p>

                  {!open && (
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-orange-400/8 border border-orange-400/25">
                      <span className="text-base shrink-0">🌙</span>
                      <p className="text-xs text-orange-300 leading-relaxed">
                        {he
                          ? 'מחוץ לשעות השיא (20:00–06:00) — ניתן להיכנס בכל זאת'
                          : 'Outside peak hours (20:00–06:00) — you can still join'}
                      </p>
                    </div>
                  )}

                  {/* Profile card */}
                  <div className="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <Avatar src={user?.photo1_url} name={user?.display_name} size="lg" online />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{user?.display_name}</p>
                      <p className="text-sm text-white/50">
                        {user?.age}
                        {user?.gender
                          ? ` · ${user.gender === 'male' ? (he ? 'גבר' : 'Male') : user.gender === 'female' ? (he ? 'אישה' : 'Female') : (he ? 'אחר' : 'Other')}`
                          : ''}
                      </p>
                      {user?.bio && <p className="text-xs text-white/30 truncate mt-0.5">{user.bio}</p>}
                    </div>
                  </div>

                  {/* Tonight status */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/40">{he ? 'סטטוס הלילה' : "Tonight's status"}</p>
                      <button
                        onClick={() => setEditingStatus(v => !v)}
                        className="text-xs text-[hsl(290,100%,65%)] font-medium"
                      >
                        {editingStatus ? (he ? 'סגור' : 'Done') : (he ? 'שנה' : 'Change')}
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {editingStatus ? (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              onClick={() => { setStatus(opt); setEditingStatus(false) }}
                              className={`w-full text-start text-sm px-3 py-2.5 rounded-xl border transition-all ${
                                status === opt
                                  ? 'border-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)] text-white'
                                  : 'border-white/10 text-white/50 glass-card hover:border-white/25'
                              }`}
                            >
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
                </div>

                {/* Sticky CTA — sticks to the bottom of the scroll container */}
                <div
                  className="px-5 pb-8 pt-3"
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    background: 'linear-gradient(to bottom, transparent, rgba(15,12,26,0.98) 30%)',
                  }}
                >
                  <NeonButton variant="purple" size="lg" fullWidth onClick={confirmProfile}>
                    🎉 {he ? 'כנס לאירוע' : 'Join Event'}
                  </NeonButton>
                </div>
              </motion.div>
            )}

            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="flex flex-col items-center gap-3 py-10 px-5"
              >
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-5xl">
                  🎉
                </motion.div>
                <div className="text-center">
                  <p className="font-bold text-white text-lg">{he ? 'ברוך/ה הבא/ה!' : 'Welcome!'}</p>
                  <p className="text-sm text-white/50 mt-1">
                    {he ? `כניסה ל${venue.name} 🔥` : `Joining ${venue.name} 🔥`}
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
