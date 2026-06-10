import { useState } from 'react'
import { createPortal } from 'react-dom'
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
  // Multiple statuses, stored joined with ' · ' — same convention as Profile/Onboarding
  const [statuses, setStatuses] = useState<string[]>(
    user?.tonight_status ? user.tonight_status.split(' · ').filter(Boolean) : []
  )
  const open = isOperatingHours()
  const he = lang === 'he'

  const STATUS_OPTIONS = he
    ? ['פנוי/ה לרומנטיקה 💞', 'כאן לבלות 🎉', 'מחפש/ת חברים חדשים 👥', 'סתם מסתכל/ת 👀', 'פנוי/ה לכל מה שיבוא ✨']
    : ['Open to romance 💞', 'Here to have fun 🎉', 'Looking for new friends 👥', 'Just looking 👀', 'Open to anything ✨']

  const VENUE_ICON: Record<string, string> = { bar: '🍸', club: '🎵', wedding: '💍', event: '✨', other: '📍' }
  const venueIcon = VENUE_ICON[venue.venue_type ?? ''] ?? '📍'

  function confirmProfile() {
    const joined = statuses.join(' · ')
    if (joined !== user?.tonight_status) saveUser({ tonight_status: joined })
    setState('success')
    setTimeout(() => onSuccess(), 900)
  }

  function toggleStatus(opt: string) {
    setStatuses(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt])
  }

  const canDismiss = state !== 'success'

  // Rendered via portal to document.body — ancestors in Layout carry framer-motion
  // transforms, which turn position:fixed into position relative to the transformed
  // ancestor on iOS Safari (modal ends up clipped under the bottom nav).
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(18px)',
      }}
      onClick={e => { if (e.target === e.currentTarget && canDismiss) onCancel() }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          width: '100%', maxWidth: 448,
          /* % of the fixed backdrop tracks the visible viewport on iOS — unlike
             dvh (needs iOS 16.4+) or vh (ignores Safari's collapsing toolbars) */
          maxHeight: '88%',
          display: 'flex', flexDirection: 'column',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',               /* ← clips children so flex works */
          background: 'rgba(22,18,36,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Drag handle ── */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* ── Venue strip ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 24 }}>{venueIcon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venue.name}</p>
            {venue.city && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{venue.city}</p>}
          </div>
          {canDismiss && (
            <button onClick={onCancel} style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Profile confirm ── */}
          {state === 'profile_confirm' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              {/* scrollable area */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                /* iOS momentum scrolling */
                WebkitOverflowScrolling: 'touch' as never,
                padding: '16px 20px 8px',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: 0 }}>
                  {he ? 'הפרופיל שלך באירוע' : 'Your profile at this event'}
                </p>

                {/* Off-hours warning */}
                {!open && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
                    borderRadius: 12, padding: '10px 12px',
                  }}>
                    <span style={{ flexShrink: 0 }}>🌙</span>
                    <p style={{ fontSize: 12, color: '#fdba74', margin: 0, lineHeight: 1.5 }}>
                      {he ? 'מחוץ לשעות השיא (20:00–06:00) — ניתן להיכנס בכל זאת' : 'Outside peak hours (20:00–06:00) — you can still join'}
                    </p>
                  </div>
                )}

                {/* Profile card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: 16,
                }}>
                  <Avatar src={user?.photo1_url} name={user?.display_name} size="lg" online />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{user?.display_name}</p>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                      {user?.age}
                      {user?.gender ? ` · ${user.gender === 'male' ? (he ? 'גבר' : 'Male') : user.gender === 'female' ? (he ? 'אישה' : 'Female') : (he ? 'אחר' : 'Other')}` : ''}
                    </p>
                    {user?.bio && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</p>}
                  </div>
                </div>

                {/* Tonight status */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{he ? 'סטטוס הלילה' : "Tonight's status"}</p>
                    <button onClick={() => setEditingStatus(v => !v)} style={{
                      fontSize: 12, fontWeight: 600, color: 'hsl(290,100%,65%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                      {editingStatus ? (he ? 'סגור' : 'Done') : (he ? 'שנה' : 'Change')}
                    </button>
                  </div>

                  {editingStatus ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {STATUS_OPTIONS.map(opt => {
                        const selected = statuses.includes(opt)
                        return (
                          <button key={opt} onClick={() => toggleStatus(opt)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            textAlign: he ? 'right' : 'left', fontSize: 14,
                            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                            transition: 'all 0.15s',
                            border: selected ? '1px solid hsl(290,100%,65%)' : '1px solid rgba(255,255,255,0.1)',
                            background: selected ? 'hsla(290,100%,65%,0.15)' : 'rgba(255,255,255,0.04)',
                            color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
                          }}>
                            <span>{opt}</span>
                            {selected && <span style={{ color: 'hsl(290,100%,65%)', fontWeight: 700 }}>✓</span>}
                          </button>
                        )
                      })}
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', textAlign: 'center' }}>
                        {he ? 'אפשר לבחור כמה שרוצים' : 'Pick as many as you like'}
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, padding: '10px 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)',
                    }}>
                      {statuses.length > 0
                        ? statuses.map(s => (
                            <span key={s} style={{
                              fontSize: 13, padding: '3px 10px', borderRadius: 99,
                              background: 'hsla(290,100%,65%,0.12)', border: '1px solid hsla(290,100%,65%,0.3)',
                            }}>{s}</span>
                          ))
                        : <span style={{ color: 'rgba(255,255,255,0.3)' }}>{he ? 'לא נבחר סטטוס' : 'No status selected'}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* ── CTA button — always visible, outside scroll ── */}
              <div style={{
                flexShrink: 0,
                padding: '12px 20px max(32px, env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(22,18,36,0.98)',
              }}>
                <NeonButton variant="purple" size="lg" fullWidth onClick={confirmProfile}>
                  🎉 {he ? 'כנס לאירוע' : 'Join Event'}
                </NeonButton>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {state === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 20px 48px' }}
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} style={{ fontSize: 56 }}>🎉</motion.div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: '#fff', fontSize: 20, margin: '0 0 6px' }}>{he ? 'ברוך/ה הבא/ה!' : 'Welcome!'}</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  {he ? `כניסה ל${venue.name} 🔥` : `Joining ${venue.name} 🔥`}
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body
  )
}
