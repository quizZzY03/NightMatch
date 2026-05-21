import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import Avatar from '../components/Avatar'
import { CountdownTimerCompact } from '../components/CountdownTimer'

function timeAgo(ts, lang) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1) return t(lang, 'justNow')
  if (mins < 60) return `${mins} ${t(lang, 'minutesAgo')}`
  return `${hours}${t(lang, 'hoursAgo')}`
}

export default function Matches() {
  const { lang, matches, clearNewMatchCount, user, isRTL } = useApp()
  const navigate = useNavigate()

  const handleOpen = (match) => {
    clearNewMatchCount()
    navigate(`/chat/${match.id}`)
  }

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
