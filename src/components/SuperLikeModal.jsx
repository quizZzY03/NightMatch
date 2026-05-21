import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { activatePremiumCode } from '../utils/storage'
import NeonButton from './NeonButton'

const SUPER_LIKE_FREE_LIMIT = 3

export default function SuperLikeModal({ remaining, onClose, onPremiumActivated }) {
  const { lang, user, updateUser } = useApp()
  const he = lang === 'he'
  const [tab, setTab] = useState('upgrade') // 'upgrade' | 'code'
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeSuccess, setCodeSuccess] = useState(false)

  function handleActivateCode() {
    setCodeError('')
    if (!code.trim()) return
    const ok = activatePremiumCode(code)
    if (ok) {
      updateUser({ is_premium: true })
      setCodeSuccess(true)
      setTimeout(() => { onPremiumActivated?.(); onClose() }, 1500)
    } else {
      setCodeError(he ? 'קוד לא תקין — נסה שוב' : 'Invalid code — try again')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-sm glass-card border border-white/15 rounded-t-3xl p-6 pb-8"
        style={{ background: 'rgba(15,10,30,0.97)' }}>

        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        {/* Star animation */}
        <div className="text-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            className="text-5xl mb-2">⭐</motion.div>
          <h2 className="text-xl font-black text-white">
            {he ? 'נגמרו הסופר לייקים!' : 'No Super Likes left!'}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {he
              ? `השתמשת ב-${SUPER_LIKE_FREE_LIMIT}/${SUPER_LIKE_FREE_LIMIT} סופר לייקים חינמיים הלילה`
              : `You used ${SUPER_LIKE_FREE_LIMIT}/${SUPER_LIKE_FREE_LIMIT} free Super Likes tonight`}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass-card border border-white/10 rounded-2xl p-1 mb-4">
          {[['upgrade', he ? '✨ שדרג' : '✨ Upgrade'], ['code', he ? '🔑 קוד הפעלה' : '🔑 Activation Code']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === key ? 'text-white' : 'text-white/40'}`}
              style={tab === key ? { background: 'linear-gradient(135deg, hsl(45,100%,55%), hsl(35,100%,50%))' } : {}}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Upgrade tab */}
          {tab === 'upgrade' && (
            <motion.div key="upgrade" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-3">

              {/* Package card */}
              <div className="rounded-2xl p-4 space-y-3"
                style={{ background: 'linear-gradient(135deg, hsl(45,100%,55%,0.15), hsl(35,100%,50%,0.1))', border: '1px solid hsl(45,100%,55%,0.3)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-white text-lg">NightPass</p>
                    <p className="text-xs text-white/50">{he ? 'לילה אחד' : 'One night'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: 'hsl(45,100%,55%)' }}>₪19.90</p>
                    <p className="text-xs text-white/40">{he ? 'ללילה' : 'per night'}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {[
                    he ? '⭐ סופר לייקים ללא הגבלה' : '⭐ Unlimited Super Likes',
                    he ? '👀 ראה מי אהב אותך' : '👀 See who liked you',
                    he ? '↩️ Rewind — חזרה על מי שדחית' : '↩️ Rewind swiped profiles',
                    he ? '🚀 הופעה גבוהה יותר בפיד' : '🚀 Boost in the feed',
                  ].map(f => (
                    <p key={f} className="text-xs text-white/70 flex items-center gap-2">{f}</p>
                  ))}
                </div>
              </div>

              <button disabled
                className="w-full py-4 rounded-2xl font-bold text-[15px] text-white/30 cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                🔒 {he ? 'בקרוב — תשלום מאובטח' : 'Coming Soon — Secure Payment'}
              </button>
            </motion.div>
          )}

          {/* Code tab */}
          {tab === 'code' && (
            <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-3">
              <p className="text-sm text-white/50 text-center">
                {he ? 'קיבלת קוד הפעלה? הכנס אותו כאן' : 'Got an activation code? Enter it here'}
              </p>

              {codeSuccess ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-green-400 font-bold">{he ? 'NightPass פעיל!' : 'NightPass activated!'}</p>
                </motion.div>
              ) : (
                <>
                  <input
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') handleActivateCode() }}
                    placeholder={he ? 'NIGHTVIP' : 'NIGHTVIP'}
                    className="w-full glass-card border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[hsl(45,100%,55%)] transition-colors bg-transparent text-sm text-center tracking-widest font-bold uppercase"
                  />
                  {codeError && <p className="text-red-400 text-sm text-center">{codeError}</p>}
                  <NeonButton variant="purple" size="lg" fullWidth onClick={handleActivateCode}>
                    {he ? 'הפעל קוד' : 'Activate Code'}
                  </NeonButton>
                  <p className="text-center text-xs text-white/25">
                    {he ? 'קודים מחולקים לחברים ועסקים שותפים' : 'Codes are given to partners & early users'}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={onClose} className="w-full text-center text-sm text-white/25 hover:text-white/50 transition-colors mt-4">
          {he ? 'אולי אחר כך' : 'Maybe later'}
        </button>
      </motion.div>
    </motion.div>
  )
}
