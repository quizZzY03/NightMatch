import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import Avatar from '../components/Avatar'
import { CountdownTimerCompact } from '../components/CountdownTimer'
import { listenIncomingLikes } from '../firebase/db'
import type { IncomingLike } from '../firebase/db'
import type { Lang } from '../types'

function timeAgo(ts: { seconds: number } | number | null | undefined, lang: Lang): string {
  if (!ts) return ''
  const ms = typeof ts === 'object' && 'seconds' in ts
    ? ts.seconds * 1000
    : Number(ts)
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1) return t(lang, 'justNow')
  if (mins < 60) return `${mins} ${t(lang, 'minutesAgo')}`
  return `${hours}${t(lang, 'hoursAgo')}`
}

export default function Matches() {
  const { lang, matches, clearNewMatchCount, user, checkin, isRTL } = useApp()
  const navigate = useNavigate()
  const [incomingLikes, setIncomingLikes] = useState<IncomingLike[]>([])
  const [showPremiumBanner, setShowPremiumBanner] = useState(false)

  const isPremium = !!(user?.is_premium || user?.is_admin)

  useEffect(() => {
    if (!user?.id || !checkin?.session_key || user.id === 'demo-user') return
    const unsub = listenIncomingLikes(user.id, checkin.session_key, likes => {
      // Filter out people already matched with
      const matchedIds = new Set(matches.map(m =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      ))
      setIncomingLikes(likes.filter(l => !matchedIds.has(l.from_user_id)))
    })
    return unsub
  }, [user?.id, checkin?.session_key, matches])

  const handleOpen = (match) => {
    clearNewMatchCount()
    navigate(`/chat/${match.id}`)
  }

  const likeCount = incomingLikes.length
  const hasLikes = likeCount > 0

  return (
    <div className="h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t(lang, 'matches')}</h1>
          <p className="text-xs text-white/30">{matches.length} {lang === 'he' ? 'מאצ׳ים פעילים' : 'active matches'}</p>
        </div>
        <div className="flex items-center gap-2 glass-card rounded-full px-3 py-1.5 border border-white/10">
          <span className="text-xs text-white/40">⏱</span>
          <CountdownTimerCompact />
        </div>
      </div>

      {/* Who liked you section */}
      {hasLikes && (
        <div className="px-4 mb-3">
          <div
            className="relative rounded-2xl overflow-hidden border"
            style={{
              background: isPremium
                ? 'linear-gradient(135deg, hsl(290,100%,65%,0.12), hsl(320,100%,60%,0.12))'
                : 'linear-gradient(135deg, hsl(290,100%,65%,0.08), hsl(320,100%,60%,0.08))',
              borderColor: isPremium ? 'hsl(290,100%,65%,0.3)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="px-4 pt-3 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {lang === 'he' ? 'לייקו אותך' : 'Liked you'}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'hsl(290,100%,65%)', color: '#fff' }}>
                    {likeCount}
                  </span>
                </div>
                {!isPremium && (
                  <button
                    onClick={() => setShowPremiumBanner(b => !b)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))', color: '#fff' }}>
                    {lang === 'he' ? '🔓 פרמיום' : '🔓 Unlock'}
                  </button>
                )}
              </div>

              {/* Avatars row */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {incomingLikes.map((like, i) => (
                  <motion.div
                    key={like.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="shrink-0 relative"
                  >
                    {isPremium ? (
                      <div className="relative">
                        <Avatar
                          src={like.from_user_photo}
                          name={like.from_user_name}
                          size="md"
                          online
                        />
                        {like.is_super_like && (
                          <span className="absolute -top-1 -right-1 text-sm">⭐</span>
                        )}
                        <p className="text-[9px] text-white/60 text-center mt-1 max-w-[52px] truncate">
                          {like.from_user_name?.split(' ')[0]}
                          {like.from_user_age ? `, ${like.from_user_age}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full overflow-hidden"
                          style={{ filter: 'blur(8px)', transform: 'scale(1.1)' }}>
                          {like.from_user_photo ? (
                            <img src={like.from_user_photo} className="w-full h-full object-cover object-top" alt="" />
                          ) : (
                            <div className="w-full h-full rounded-full"
                              style={{ background: `hsl(${(i * 73) % 360},70%,40%)` }} />
                          )}
                        </div>
                        {like.is_super_like && (
                          <span className="absolute -top-1 -right-1 text-sm z-10">⭐</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Premium unlock banner (collapsible) */}
            {showPremiumBanner && !isPremium && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="border-t border-white/10 px-4 py-3 text-center"
              >
                <p className="text-xs text-white/60 mb-2">
                  {lang === 'he'
                    ? `${likeCount} ${likeCount === 1 ? 'אדם לייק' : 'אנשים לייקו'} אותך הלילה — שדרג לפרמיום כדי לראות מי`
                    : `${likeCount} ${likeCount === 1 ? 'person liked' : 'people liked'} you tonight — upgrade to see who`}
                </p>
                <NeonButton variant="purple" onClick={() => navigate('/profile')}>
                  ✨ {lang === 'he' ? 'שדרג לפרמיום' : 'Upgrade to Premium'}
                </NeonButton>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto scroll-area scrollbar-hide px-4 pb-4 space-y-2">
        {matches.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center py-16">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">💫</motion.div>
            <h3 className="text-lg font-bold text-white mb-2">{t(lang, 'noMatches')}</h3>
            <p className="text-sm text-white/40 mb-6">{t(lang, 'noMatchesDesc')}</p>
            <NeonButton variant="purple" onClick={() => navigate('/feed')}>✨ {t(lang, 'goToFloor')}</NeonButton>
          </motion.div>
        ) : (
          matches.map((match, i) => {
            const otherName = match.user1_id === user?.id ? match.user2_name : match.user1_name
            const otherPhoto = match.user1_id === user?.id ? match.user2_photo : match.user1_photo
            return (
              <motion.div key={match.id}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleOpen(match)}
                className="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[hsl(290,100%,65%,0.3)] transition-all active:scale-[0.98]">
                <Avatar src={otherPhoto} name={otherName} size="md" online />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-white">{otherName}</span>
                    {match.last_message_time && (
                      <span className="text-[10px] text-white/30 shrink-0">{timeAgo(match.last_message_time, lang)}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{match.last_message || (lang === 'he' ? '💬 שלח/י הודעה ראשונה' : '💬 Send first message')}</p>
                  {match.venue_name && (
                    <span className="text-[10px] text-[hsl(290,100%,65%,0.7)] mt-0.5 inline-block">📍 {match.venue_name}</span>
                  )}
                </div>
                <div className="text-white/20 text-lg shrink-0">{isRTL ? '‹' : '›'}</div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
