import { useState } from 'react'
import { motion } from 'framer-motion'
import { signInWithGoogle, signInWithApple } from '../firebase/auth'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { useApp } from '../context/AppContext'

export default function PhoneAuth({ onSuccess }) {
  const { lang, toggleLang } = useApp()
  const he = lang === 'he'

  const [loading, setLoading] = useState(null) // 'google' | 'apple' | null
  const [error, setError] = useState('')

  async function handleGoogle() {
    setError('')
    if (!FIREBASE_CONFIGURED) { onSuccess({ uid: 'dev-google', displayName: 'דמו' }); return }
    setLoading('google')
    try {
      const user = await signInWithGoogle()
      onSuccess(user)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError(he ? 'שגיאת התחברות עם Google' : 'Google sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleApple() {
    setError('')
    if (!FIREBASE_CONFIGURED) { onSuccess({ uid: 'dev-apple', displayName: 'דמו' }); return }
    setLoading('apple')
    try {
      const user = await signInWithApple()
      onSuccess(user)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError(he ? 'שגיאת התחברות עם Apple' : 'Apple sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative" dir={he ? 'rtl' : 'ltr'}>

      {/* Background */}
      <div className="absolute inset-0 bg-[#07070f]">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.18, 0.25, 0.18] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(290,100%,60%), transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/3 -right-20 w-[260px] h-[260px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(320,100%,55%), transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-1/2 -left-16 w-[200px] h-[200px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(185,100%,50%), transparent 70%)' }} />
      </div>

      {/* Hero */}
      <div className="relative z-10 flex-none flex flex-col items-center justify-end pb-10 pt-14 px-6">
        <button onClick={toggleLang}
          className="absolute top-5 left-4 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1">
          🌐 {lang === 'he' ? 'EN' : 'HE'}
        </button>

        <motion.div animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-5 drop-shadow-lg">🌙</motion.div>

        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{ background: 'linear-gradient(135deg, hsl(290,100%,70%), hsl(320,100%,65%), hsl(185,100%,60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NightMatch
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          {he ? 'מאצ׳ים בזמן אמת, רק עם מי שכבר שם' : 'Real-time matches, only with people already there'}
        </p>
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', damping: 24 }}
        className="relative z-10 flex-1 rounded-t-[32px] flex flex-col px-6 pt-7 pb-8 gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>

        <p className="text-center text-white/60 text-sm font-medium mb-1">
          {he ? 'כניסה / הרשמה' : 'Sign in / Sign up'}
        </p>

        {/* Google */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogle} disabled={!!loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-[15px] transition-all disabled:opacity-60"
          style={{ background: '#fff', color: '#111', boxShadow: '0 2px 20px rgba(255,255,255,0.12)' }}>
          {loading === 'google' ? <Spinner dark /> : <><GoogleIcon size={20} />{he ? 'המשך עם Google' : 'Continue with Google'}</>}
        </motion.button>

        {/* Apple */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleApple} disabled={!!loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-[15px] transition-all disabled:opacity-60"
          style={{ background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
          {loading === 'apple' ? <Spinner /> : <><AppleIcon size={20} />{he ? 'המשך עם Apple' : 'Continue with Apple'}</>}
        </motion.button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Divider */}
        <p className="text-center text-[11px] text-white/20 mt-auto pt-1">
          {he ? 'בהמשך אתה מסכים לתנאי השימוש ומדיניות הפרטיות' : 'By continuing you agree to our Terms & Privacy Policy'}
        </p>
      </motion.div>
    </div>
  )
}

function Spinner({ dark }) {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className="w-5 h-5 rounded-full border-2 border-transparent"
      style={{ borderTopColor: dark ? '#333' : 'rgba(255,255,255,0.7)' }} />
  )
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AppleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
