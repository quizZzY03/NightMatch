import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import SwipeCard from '../components/SwipeCard'
import MatchModal from '../components/MatchModal'
import ProfileModal from '../components/ProfileModal'
import NeonButton from '../components/NeonButton'
import { CountdownTimerCompact } from '../components/CountdownTimer'
import { likePerson, superLikePerson, listenFeed, getUser } from '../firebase/db'
import { canSuperLike, getSuperLikesRemaining } from '../utils/storage'
import { usePushNotifications } from '../hooks/usePushNotifications'

const PREF_TO_FILTER = { men: 'male', women: 'female', all: 'all' }

export default function Feed() {
  const { lang, checkin, user, isRTL } = useApp()
  const navigate = useNavigate()
  const { notifyMatch, requestPermission, schedulePreResetNotification } = usePushNotifications()
  const filter = PREF_TO_FILTER[user?.preference] || 'all'
  const [people, setPeople] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [profilePerson, setProfilePerson] = useState(null)

  async function handleTap(person) {
    setProfilePerson(person)
    try {
      const full = await getUser(person.id)
      if (full) {
        setProfilePerson(prev => prev?.id === person.id
          ? { ...prev, photo2_url: full.photo2_url ?? null, photo3_url: full.photo3_url ?? null }
          : prev
        )
      }
    } catch { /* show with photo1 only */ }
  }
  const unsubRef = useRef(null)

  // Request notification permission after user starts browsing, then schedule pre-reset
  useEffect(() => {
    if (!checkin) return
    const timer = setTimeout(async () => {
      const granted = await requestPermission()
      if (granted) schedulePreResetNotification(lang)
    }, 3000)
    return () => clearTimeout(timer)
  }, [checkin?.venue_id])

  useEffect(() => {
    if (!checkin?.venue_id || !user?.id) return
    setFeedLoading(true)
    if (unsubRef.current) unsubRef.current()
    unsubRef.current = listenFeed(checkin.venue_id, user.id, filter, (incoming) => {
      setPeople(incoming)
      setFeedLoading(false)
    })
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [checkin?.venue_id, user?.id, filter])

  const isDemo = user?.id === 'demo-user'

  async function handleLike(person) {
    if (!user || !checkin) return
    setPeople(prev => prev.filter(p => p.id !== person.id))
    const newMatch = isDemo
      ? (await import('../utils/storage')).likePerson(person.id)
      : await likePerson(user, person.id, checkin.venue_id)
    if (newMatch) {
      await notifyMatch(newMatch.user2_name || newMatch.user1_name, lang)
      setMatch(newMatch)
    }
  }

  async function handleSuperLike(person) {
    if (!user || !checkin) return
    if (!canSuperLike(user)) return
    setPeople(prev => prev.filter(p => p.id !== person.id))
    const newMatch = isDemo
      ? (await import('../utils/storage')).superLikePerson(person.id)
      : await superLikePerson(user, person.id, checkin.venue_id)
    if (newMatch) {
      await notifyMatch(newMatch.user2_name || newMatch.user1_name, lang)
      setMatch(newMatch)
    }
  }

  function handlePass(person) {
    setPeople(prev => prev.filter(p => p.id !== person.id))
    if (isDemo) import('../utils/storage').then(m => m.passPerson(person.id))
  }

  const topPerson = people[0]

  if (!checkin) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">🌙</motion.div>
        <h2 className="text-xl font-bold text-white mb-2">{t(lang, 'noVenue')}</h2>
        <p className="text-white/40 text-sm mb-6">{t(lang, 'noVenueDesc')}</p>
        <NeonButton variant="purple" onClick={() => navigate('/checkin')}>📍 {t(lang, 'checkin')}</NeonButton>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Demo banner */}

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">{t(lang, 'floor')}</h1>
          <p className="text-xs text-white/30">{people.length} {lang === 'he' ? 'אנשים במקום' : 'people here'}</p>
        </div>
        <div className="flex items-center gap-2 glass-card rounded-full px-3 py-1.5 border border-white/10">
          <span className="text-xs text-white/30">⏱</span>
          <CountdownTimerCompact />
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 px-4 flex flex-col min-h-0">
        {feedLoading ? (
          <div className="flex-1 relative min-h-0">
            {/* Skeleton cards */}
            {[0, 1].map(i => (
              <div key={i} className="absolute inset-0 rounded-[28px] overflow-hidden"
                style={{ zIndex: 10 - i, top: i * 14, transform: `scale(${1 - i * 0.05})`, transformOrigin: 'bottom center' }}>
                <div className="w-full h-full animate-pulse"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }}>
                  <div className="absolute bottom-0 inset-x-0 p-5 space-y-3">
                    <div className="h-7 w-40 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-4 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : people.length > 0 ? (
          <>
            <div className="flex-1 relative min-h-0">
              {people.slice(0, 3).map((person, i) => (
                <SwipeCard key={person.id} person={person} onLike={handleLike} onPass={handlePass}
                  onTap={handleTap} isTop={i === 0} index={i} lang={lang} />
              ))}
            </div>

            {/* Action buttons — ✕ pass · ⭐ super like · ♥ like */}
            <div className="flex items-center justify-center gap-5 py-3" dir="ltr">
              <motion.button whileTap={{ scale: 0.82 }} onClick={() => topPerson && handlePass(topPerson)}
                className="w-14 h-14 rounded-full flex items-center justify-center glass-card border-2 border-red-400/40 hover:border-red-400 transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(248,113,113,0.15)' }}>
                <span className="text-red-400 text-2xl font-bold">✕</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.82 }} onClick={() => topPerson && handleSuperLike(topPerson)}
                disabled={!canSuperLike(user)}
                className="w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 transition-colors disabled:opacity-30"
                style={{ background: 'rgba(250,204,21,0.12)', borderColor: 'rgba(250,204,21,0.4)', boxShadow: '0 4px 16px rgba(250,204,21,0.15)' }}
                title={`סופר לייק — נותרו ${getSuperLikesRemaining(user) ?? '∞'}`}>
                <span className="text-yellow-400 text-xl leading-none">⭐</span>
                {!user?.is_premium && (
                  <span className="text-yellow-400/60 text-[9px] font-bold leading-none mt-0.5">{getSuperLikesRemaining(user)}</span>
                )}
              </motion.button>

              <motion.button whileTap={{ scale: 0.82 }} onClick={() => topPerson && handleLike(topPerson)}
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-green-400/40 hover:border-green-400 transition-colors"
                style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.15), hsl(320,100%,60%,0.15))', boxShadow: '0 4px 20px rgba(74,222,128,0.2)' }}>
                <span className="text-green-400 text-2xl">♥</span>
              </motion.button>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center pb-8 px-6">
            <motion.div animate={{ rotate: [0, 10, -10, 0], y: [0,-8,0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-5">🌙</motion.div>
            <h3 className="text-xl font-black text-white mb-2">{t(lang, 'noMoreCards')}</h3>
            <p className="text-sm text-white/40 mb-2 leading-relaxed">{t(lang, 'noMoreCardsDesc')}</p>
            <p className="text-xs text-white/25">{lang === 'he' ? 'אנשים חדשים מצטרפים כל הזמן 👀' : 'New people join all the time 👀'}</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {match && <MatchModal match={match} onClose={() => setMatch(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {profilePerson && (
          <ProfileModal
            person={profilePerson}
            onClose={() => setProfilePerson(null)}
            onLike={p => { setProfilePerson(null); handleLike(p) }}
            onPass={p => { setProfilePerson(null); handlePass(p) }}
            onBlock={p => { setProfilePerson(null); setPeople(prev => prev.filter(x => x.id !== p.id)) }}
            currentUserId={user?.id}
            lang={lang}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
