import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import SwipeCard from '../components/SwipeCard'
import MatchModal from '../components/MatchModal'
import SuperLikeModal from '../components/SuperLikeModal'
import NeonButton from '../components/NeonButton'
import { CountdownTimerCompact } from '../components/CountdownTimer'
import { likePerson, superLikePerson, listenFeed } from '../firebase/db.js'
import { canSuperLike, getSuperLikesRemaining, useSuperLike } from '../utils/storage.js'
import { usePushNotifications } from '../hooks/usePushNotifications'

const PREF_TO_FILTER = { men: 'male', women: 'female', all: 'all' }

export default function Feed() {
  const { lang, checkin, user, isRTL } = useApp()
  const navigate = useNavigate()
  const { notifyMatch } = usePushNotifications()
  const filter = PREF_TO_FILTER[user?.preference] || 'all'
  const [people, setPeople] = useState([])
  const [match, setMatch] = useState(null)
  const [swipeCount, setSwipeCount] = useState(0)
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false)
  const [superLikesLeft, setSuperLikesLeft] = useState(() => getSuperLikesRemaining(null))
  const unsubRef = useRef(null)

  useEffect(() => {
    setSuperLikesLeft(getSuperLikesRemaining(user))
  }, [user?.id, user?.is_premium])

  useEffect(() => {
    if (!checkin?.venue_id || !user?.id) return
    if (unsubRef.current) unsubRef.current()
    unsubRef.current = listenFeed(checkin.venue_id, user.id, filter, setPeople)
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [checkin?.venue_id, user?.id, filter])

  async function handleLike(person) {
    if (!user || !checkin) return
    setSwipeCount(c => c + 1)
    setPeople(prev => prev.filter(p => p.id !== person.id))
    const newMatch = user.is_demo
      ? (await import('../utils/storage.js')).likePerson(person.id)
      : await likePerson(user, person.id, checkin.venue_id)
    if (newMatch) {
      await notifyMatch(newMatch.user2_name || newMatch.user1_name, lang)
      setMatch(newMatch)
    }
  }

  function handlePass(person) {
    setSwipeCount(c => c + 1)
    setPeople(prev => prev.filter(p => p.id !== person.id))
    if (!user?.is_demo) return
    import('../utils/storage.js').then(m => m.passPerson(person.id))
  }

  async function handleSuperLike(person) {
    if (!canSuperLike(user)) {
      setShowSuperLikeModal(true)
      return
    }
    if (!user || !checkin) return
    useSuperLike()
    setSuperLikesLeft(getSuperLikesRemaining(user))
    setSwipeCount(c => c + 1)
    setPeople(prev => prev.filter(p => p.id !== person.id))
    const newMatch = user.is_demo
      ? (await import('../utils/storage.js')).superLikePerson(person.id)
      : await superLikePerson(user, person.id, checkin.venue_id)
    if (newMatch) {
      await notifyMatch(newMatch.user2_name || newMatch.user1_name, lang)
      setMatch(newMatch)
    }
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
      {user?.is_demo && (
        <div className="px-4 pt-2 shrink-0">
          <div className="flex items-center justify-between rounded-xl px-3 py-1.5"
            style={{ background: 'hsl(290,100%,65%,0.12)', border: '1px solid hsl(290,100%,65%,0.25)' }}>
            <span className="text-xs font-semibold" style={{ color: 'hsl(290,100%,75%)' }}>
              🎮 {lang === 'he' ? 'מצב דמו — החלק שמאלה/ימינה' : 'Demo mode — swipe left/right'}
            </span>
            <button onClick={() => navigate('/')}
              className="text-[10px] text-white/30 hover:text-white transition-colors">
              {lang === 'he' ? 'יציאה' : 'Exit'}
            </button>
          </div>
        </div>
      )}

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
        {people.length > 0 ? (
          <>
            <div className="flex-1 relative min-h-0">
              {people.slice(0, 3).map((person, i) => (
                <SwipeCard key={person.id} person={person} onLike={handleLike} onPass={handlePass} onSuperLike={handleSuperLike}
                  isTop={i === 0} index={i} lang={lang} />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 py-3">
              <motion.button whileTap={{ scale: 0.82 }} onClick={() => topPerson && handlePass(topPerson)}
                className="w-14 h-14 rounded-full flex items-center justify-center glass-card border-2 border-red-400/40 hover:border-red-400 transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(248,113,113,0.15)' }}>
                <span className="text-red-400 text-2xl font-bold">✕</span>
              </motion.button>

              <div className="relative">
                <motion.button whileTap={{ scale: 0.82 }}
                  onClick={() => topPerson && handleSuperLike(topPerson)}
                  className="w-12 h-12 rounded-full flex items-center justify-center glass-card border-2 transition-colors"
                  style={{ borderColor: 'hsl(45,100%,55%,0.5)' }}>
                  <span className="text-xl">⭐</span>
                </motion.button>
                {!user?.is_premium && superLikesLeft !== null && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                    style={{ background: superLikesLeft > 0 ? 'hsl(45,100%,55%)' : 'hsl(0,80%,55%)' }}>
                    {superLikesLeft}
                  </div>
                )}
                {user?.is_premium && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                    style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))' }}>
                    ∞
                  </div>
                )}
              </div>

              <motion.button whileTap={{ scale: 0.82 }} onClick={() => topPerson && handleLike(topPerson)}
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-green-400/40 hover:border-green-400 transition-colors"
                style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.15), hsl(320,100%,60%,0.15))', boxShadow: '0 4px 20px rgba(74,222,128,0.15)' }}>
                <span className="text-green-400 text-2xl">♥</span>
              </motion.button>
            </div>

            {/* Swipe counter */}
            {swipeCount > 0 && (
              <p className="text-center text-xs text-white/20 pb-1">
                {swipeCount} {lang === 'he' ? 'סווייפים הלילה' : 'swipes tonight'}
              </p>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center pb-8">
            <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-6xl mb-4">🌙</motion.div>
            <h3 className="text-lg font-bold text-white mb-2">{t(lang, 'noMoreCards')}</h3>
            <p className="text-sm text-white/40 mb-6">{t(lang, 'noMoreCardsDesc')}</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {match && <MatchModal match={match} onClose={() => setMatch(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSuperLikeModal && (
          <SuperLikeModal
            remaining={superLikesLeft}
            onClose={() => setShowSuperLikeModal(false)}
            onPremiumActivated={() => {
              setSuperLikesLeft(null)
              setShowSuperLikeModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
