import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { signInWithGoogle, signInWithApple } from '../firebase/auth'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { useApp } from '../context/AppContext'

const PARTICLE_CONFIG = [
  { delay: 0,   x: '12%', size: 4, color: 'hsl(290,100%,65%)' },
  { delay: 2.5, x: '28%', size: 3, color: 'hsl(320,100%,60%)' },
  { delay: 1,   x: '47%', size: 5, color: 'hsl(290,100%,65%)' },
  { delay: 4,   x: '63%', size: 3, color: 'hsl(185,100%,55%)' },
  { delay: 1.8, x: '79%', size: 4, color: 'hsl(320,100%,60%)' },
  { delay: 3.2, x: '91%', size: 2, color: 'hsl(290,100%,65%)' },
]

function Particle({ delay, x, size, color }: { delay: number; x: string; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, left: x, bottom: '22%', background: color, filter: `blur(${size / 3}px)` }}
      animate={{ y: [0, -700], opacity: [0, 0.9, 0.9, 0] }}
      transition={{ duration: 9, repeat: Infinity, delay, ease: 'easeOut', times: [0, 0.1, 0.85, 1] }}
    />
  )
}

function CitySkyline() {
  type Building = { x: number; w: number; h: number; windows: [number, number][] }
  const buildings: Building[] = [
    { x: 0,   w: 38, h: 58,  windows: [[7,10],[7,26],[7,42],[22,10],[22,26],[22,42]] },
    { x: 43,  w: 24, h: 95,  windows: [[4,8],[4,24],[4,42],[4,60],[15,8],[15,24],[15,42],[15,60]] },
    { x: 72,  w: 52, h: 48,  windows: [[7,8],[7,24],[22,8],[22,24],[38,8],[38,24]] },
    { x: 129, w: 28, h: 115, windows: [[4,8],[4,26],[4,46],[4,66],[4,88],[17,8],[17,26],[17,46],[17,66]] },
    { x: 162, w: 18, h: 38,  windows: [[3,7],[3,20],[10,7],[10,20]] },
    { x: 185, w: 58, h: 72,  windows: [[6,10],[6,28],[6,48],[22,10],[22,28],[22,48],[40,10],[40,28],[40,48]] },
    { x: 248, w: 32, h: 54,  windows: [[5,8],[5,24],[5,42],[19,8],[19,24],[19,42]] },
    { x: 285, w: 22, h: 105, windows: [[4,8],[4,26],[4,46],[4,68],[4,88],[13,8],[13,26],[13,46],[13,68]] },
    { x: 312, w: 46, h: 63,  windows: [[7,9],[7,27],[23,9],[23,27],[38,9],[38,27]] },
    { x: 363, w: 27, h: 44,  windows: [[4,8],[4,24],[16,8],[16,24]] },
  ]

  const windowColors = ['hsl(290,100%,85%)', 'hsl(45,100%,85%)', 'hsl(185,100%,82%)', 'hsl(320,100%,85%)']

  return (
    <svg viewBox="0 0 390 120" className="absolute bottom-0 left-0 right-0 w-full" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="bldgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(260,25%,11%)" />
          <stop offset="100%" stopColor="hsl(260,25%,7%)" />
        </linearGradient>
        <filter id="winGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="groundFog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(270,40%,6%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(270,40%,4%)" stopOpacity="1" />
        </linearGradient>
      </defs>

      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={120 - b.h} width={b.w} height={b.h} fill="url(#bldgGrad)" />
          {b.windows.map(([wx, wy], j) => {
            const lit = (i * 3 + j * 7) % 5 !== 0
            return lit ? (
              <rect key={j} x={b.x + wx} y={120 - b.h + wy} width={6} height={5} rx={1}
                fill={windowColors[(i + j) % windowColors.length]}
                opacity={0.45 + ((i + j) % 4) * 0.12}
                filter="url(#winGlow)" />
            ) : (
              <rect key={j} x={b.x + wx} y={120 - b.h + wy} width={6} height={5} rx={1}
                fill="rgba(255,255,255,0.03)" />
            )
          })}
        </g>
      ))}

      <rect x="0" y="90" width="390" height="30" fill="url(#groundFog)" />
    </svg>
  )
}

export default function PhoneAuth({ onSuccess }: { onSuccess: (user: unknown) => void }) {
  const { lang, toggleLang } = useApp()
  const he = lang === 'he'
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState('')
  const [onlineCount, setOnlineCount] = useState(() => 180 + Math.floor(Math.random() * 120))

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 7) - 3 // -3 to +3
        return Math.max(150, Math.min(350, prev + delta))
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function handleGoogle() {
    setError('')
    if (!FIREBASE_CONFIGURED) { onSuccess({ uid: 'dev-google', displayName: 'דמו' }); return }
    setLoading('google')
    try {
      const user = await signInWithGoogle()
      onSuccess(user)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code !== 'auth/popup-closed-by-user') setError(he ? 'שגיאת התחברות עם Google' : 'Google sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleApple() {
    setError('')
    setLoading('apple')
    try {
      const user = await signInWithApple()
      onSuccess(user)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code !== 'auth/popup-closed-by-user') setError(he ? 'שגיאת התחברות עם Apple' : 'Apple sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative" dir={he ? 'rtl' : 'ltr'} style={{ background: '#07070f' }}>

      {/* ── ATMOSPHERE ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Purple top glow */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.24, 0.38, 0.24] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(290,100%,52%) 0%, transparent 68%)', filter: 'blur(45px)' }}
        />
        {/* Pink right glow */}
        <motion.div
          animate={{ scale: [1, 1.22, 1], opacity: [0.14, 0.22, 0.14] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute top-1/4 -right-20 w-[260px] h-[260px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(320,100%,52%) 0%, transparent 68%)', filter: 'blur(40px)' }}
        />
        {/* Cyan left glow */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.07, 0.14, 0.07] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute top-1/2 -left-16 w-[220px] h-[220px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(185,100%,48%) 0%, transparent 68%)', filter: 'blur(40px)' }}
        />
        {/* Ground atmospheric warmth */}
        <div className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: 'linear-gradient(to top, hsl(270,50%,6%) 0%, transparent 100%)' }} />
      </div>

      {/* ── PARTICLES ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLE_CONFIG.map((p, i) => <Particle key={i} {...p} />)}
      </div>

      {/* ── HERO ───────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-2">

        {/* Lang toggle */}
        <button onClick={toggleLang}
          className="absolute top-5 left-5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-full"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
          🌐 {lang === 'he' ? 'EN' : 'HE'}
        </button>

        {/* Moon with halo */}
        <div className="relative mb-5 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(290,100%,65%) 0%, transparent 70%)', filter: 'blur(12px)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.04, 0.12] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(290,100%,65%) 0%, transparent 70%)', filter: 'blur(20px)' }}
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-[72px] relative z-10 select-none leading-none"
            style={{ filter: 'drop-shadow(0 0 16px hsl(290,100%,60%)) drop-shadow(0 0 48px hsl(290,100%,45%))' }}>
            🌙
          </motion.div>
        </div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="font-black text-center leading-none mb-3"
          style={{
            fontSize: 'clamp(48px, 14vw, 64px)',
            background: 'linear-gradient(135deg, hsl(290,100%,82%) 0%, hsl(320,100%,72%) 45%, hsl(185,100%,68%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px',
          }}>
          NightMatch
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-center leading-relaxed mb-7"
          style={{ color: 'rgba(255,255,255,0.42)', maxWidth: 240 }}>
          {he
            ? 'מאצ׳ים בזמן אמת — רק עם מי שנמצא שם איתך'
            : 'Real-time matches — only with people already there'}
        </motion.p>

        {/* Live activity pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full"
          style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.22)' }}>
          <motion.div
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-400 shrink-0"
          />
          <span className="text-green-400 text-xs font-semibold">
            {onlineCount} {he ? 'אנשים אונליין הלילה' : 'people online tonight'}
          </span>
        </motion.div>
      </div>

      {/* ── CITY SKYLINE ───────────────────────────────── */}
      <div className="relative z-10 h-28 w-full pointer-events-none overflow-hidden shrink-0">
        <CitySkyline />
      </div>

      {/* ── AUTH CARD ──────────────────────────────────── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 26 }}
        className="relative z-20 w-full px-5 pb-8 pt-6 flex flex-col gap-4 shrink-0"
        style={{
          background: 'linear-gradient(170deg, rgba(22,10,44,0.97) 0%, rgba(10,5,22,0.99) 100%)',
          borderTop: '1px solid rgba(139,92,246,0.2)',
          backdropFilter: 'blur(32px)',
        }}>

        {/* Shimmer line at top */}
        <div className="absolute top-0 left-10 right-10 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(290,100%,65%,0.7), hsl(320,100%,60%,0.7), transparent)' }} />

        {/* Card headline */}
        <div className="text-center">
          <p className="text-white font-bold text-[15px]">
            {he ? 'הלילה שלך מתחיל כאן' : 'Your night starts here'}
          </p>
        </div>

        {/* Google button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGoogle}
          disabled={!!loading}
          className="relative w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[15px] overflow-hidden transition-all disabled:opacity-50"
          style={{ background: '#ffffff', color: '#111111', boxShadow: '0 4px 24px rgba(255,255,255,0.1)' }}>
          {/* Shimmer sweep */}
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
            className="absolute inset-0 w-1/4 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              transform: 'skewX(-15deg)',
            }}
          />
          {loading === 'google'
            ? <Spinner dark />
            : (<><GoogleIcon size={20} /><span>{he ? 'המשך עם Google' : 'Continue with Google'}</span></>)
          }
        </motion.button>


{error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center">
            ⚠️ {error}
          </motion.p>
        )}

        <p className="text-center text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
          {he
            ? 'בהמשך אתה מסכים לתנאי השימוש ומדיניות הפרטיות'
            : 'By continuing you agree to our Terms & Privacy Policy'}
        </p>
      </motion.div>
    </div>
  )
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
      className="w-5 h-5 rounded-full border-2 border-transparent"
      style={{ borderTopColor: dark ? '#444' : 'rgba(255,255,255,0.7)' }}
    />
  )
}

function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.37.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4zm-3.1-17.52c.06 2.13-1.55 3.91-3.54 4.06-.26-2.1 1.5-3.97 3.54-4.06z"/>
    </svg>
  )
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
