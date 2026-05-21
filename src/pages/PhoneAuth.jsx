import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  sendOTP, verifyOTP,
  signInWithGoogle, signInWithApple,
  sendEmailLink, hasPendingEmailLink, completeEmailLink,
} from '../firebase/auth.js'
import { FIREBASE_CONFIGURED } from '../firebase/config.js'
import { useApp } from '../context/AppContext'

const COUNTRY_CODES = [
  { code: '+972', flag: '🇮🇱' },
  { code: '+1',   flag: '🇺🇸' },
  { code: '+44',  flag: '🇬🇧' },
  { code: '+49',  flag: '🇩🇪' },
]

// step: 'main' | 'sms' | 'otp' | 'email' | 'email_sent' | 'loading'
export default function PhoneAuth({ onSuccess }) {
  const { lang, toggleLang } = useApp()
  const he = lang === 'he'
  const DEV = !FIREBASE_CONFIGURED

  const [step, setStep] = useState('main')
  const [loadingLabel, setLoadingLabel] = useState('')
  const [error, setError] = useState('')

  // SMS
  const [phone, setPhone] = useState('')
  const [cc, setCc] = useState('+972')
  const [otp, setOtp] = useState(['','','','','',''])
  const [confirmation, setConfirmation] = useState(null)
  const [resend, setResend] = useState(0)
  const otpRefs = useRef([])

  // Email
  const [email, setEmail] = useState('')

  // Handle email link on mount
  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return
    if (hasPendingEmailLink()) {
      setStep('loading'); setLoadingLabel(he ? 'מאמת...' : 'Verifying...')
      completeEmailLink().then(u => u && onSuccess(u)).catch(e => { setError(e.message); setStep('main') })
    }
  }, [])

  useEffect(() => {
    if (resend > 0) { const t = setTimeout(() => setResend(r => r - 1), 1000); return () => clearTimeout(t) }
  }, [resend])

  function err(msg) { setError(msg); setStep(s => s === 'loading' ? 'main' : s) }

  async function handleGoogle() {
    setError('')
    if (DEV) { onSuccess({ uid: 'dev-google', displayName: 'משתמש דמו' }); return }
    setLoadingLabel(he ? 'מתחבר עם Google...' : 'Signing in with Google...')
    setStep('loading')
    try { onSuccess(await signInWithGoogle()) }
    catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') err(e.message)
      else setStep('main')
    }
  }

  async function handleApple() {
    setError('')
    if (DEV) { onSuccess({ uid: 'dev-apple', displayName: 'משתמש דמו' }); return }
    setLoadingLabel(he ? 'מתחבר עם Apple...' : 'Signing in with Apple...')
    setStep('loading')
    try { onSuccess(await signInWithApple()) }
    catch (e) {
      if (e.code === 'auth/popup-closed-by-user') setStep('main')
      else err(he ? 'Apple Sign-In לא מוגדר — הפעל ב-Firebase Console' : 'Apple Sign-In not configured yet')
    }
  }

  async function handleSendOTP() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) { setError(he ? 'מספר לא תקין' : 'Invalid number'); return }
    if (DEV) { setStep('otp'); setResend(30); return }
    setLoadingLabel(he ? 'שולח קוד...' : 'Sending code...')
    setStep('loading')
    try { setConfirmation(await sendOTP(cc + digits)); setStep('otp'); setResend(30) }
    catch (e) { err(e.message) }
  }

  async function handleVerifyOTP() {
    const code = otp.join('')
    if (code.length < 6) return
    setError('')
    if (DEV) { onSuccess({ uid: 'dev-' + phone, phoneNumber: cc + phone }); return }
    setLoadingLabel(he ? 'מאמת קוד...' : 'Verifying...')
    setStep('loading')
    try { onSuccess(await verifyOTP(confirmation, code)) }
    catch { setError(he ? 'קוד שגוי' : 'Wrong code'); setStep('otp'); setOtp(['','','','','','']); otpRefs.current[0]?.focus() }
  }

  function handleOtpInput(v, i) {
    if (!/^\d*$/.test(v)) return
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n)
    if (v && i < 5) otpRefs.current[i+1]?.focus()
    if (n.every(d => d)) setTimeout(handleVerifyOTP, 80)
  }

  async function handleSendEmail() {
    setError('')
    if (!email.includes('@')) { setError(he ? 'אימייל לא תקין' : 'Invalid email'); return }
    if (DEV) { onSuccess({ uid: 'dev-email', email }); return }
    setLoadingLabel(he ? 'שולח לינק...' : 'Sending link...')
    setStep('loading')
    try { await sendEmailLink(email); setStep('email_sent') }
    catch (e) { err(e.message) }
  }

  const isLoading = step === 'loading'

  return (
    <div className="h-full flex flex-col overflow-hidden relative" dir={he ? 'rtl' : 'ltr'}>
      <div id="recaptcha-container" />

      {/* ── Atmospheric background ── */}
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

      {/* ── Hero ── */}
      <div className="relative z-10 flex-none flex flex-col items-center justify-end pb-10 pt-14 px-6">

        {/* Lang toggle */}
        <button onClick={toggleLang}
          className="absolute top-5 left-4 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1">
          🌐 {lang === 'he' ? 'EN' : 'HE'}
        </button>

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-5 drop-shadow-lg">🌙</motion.div>

        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{ background: 'linear-gradient(135deg, hsl(290,100%,70%), hsl(320,100%,65%), hsl(185,100%,60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px hsl(290,100%,65%,0.4))' }}>
          NightMatch
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          {he ? 'מאצ׳ים בזמן אמת, רק עם מי שכבר שם' : 'Real-time matches, only with people already there'}
        </p>
      </div>

      {/* ── Auth card ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', damping: 24 }}
        className="relative z-10 flex-1 rounded-t-[32px] flex flex-col px-6 pt-7 pb-8 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>

        {DEV && (
          <div className="mb-4 px-3 py-1.5 rounded-xl text-center"
            style={{ background: 'hsl(45,100%,55%,0.1)', border: '1px solid hsl(45,100%,55%,0.3)' }}>
            <span className="text-[11px] text-yellow-400">⚡ {he ? 'מצב פיתוח — כל כניסה עובדת' : 'Dev mode — any sign-in works'}</span>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Main options ── */}
          {step === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-3 flex-1">

              <p className="text-center text-white/60 text-sm font-medium mb-1">
                {he ? 'כניסה / הרשמה' : 'Sign in / Sign up'}
              </p>

              {/* Google */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-[15px] transition-all"
                style={{ background: '#fff', color: '#111', boxShadow: '0 2px 20px rgba(255,255,255,0.12)' }}>
                <GoogleIcon size={20} />
                {he ? 'המשך עם Google' : 'Continue with Google'}
              </motion.button>

              {/* Apple */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleApple}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-[15px] transition-all"
                style={{ background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                <AppleIcon size={20} />
                {he ? 'המשך עם Apple' : 'Continue with Apple'}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs text-white/25 font-medium">{he ? 'או' : 'or'}</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* SMS + Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setError(''); setStep('sms') }}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-2xl">📱</span>
                  <span className="text-xs font-semibold text-white/70">SMS</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setError(''); setStep('email') }}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all relative"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-2xl">📧</span>
                  <span className="text-xs font-semibold text-white/70">{he ? 'אימייל' : 'Email'}</span>
                  <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full text-black"
                    style={{ background: 'hsl(145,80%,50%)' }}>{he ? 'חינמי' : 'Free'}</span>
                </motion.button>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center mt-1">{error}</motion.p>
              )}

              <p className="text-center text-[11px] text-white/20 mt-auto pt-2">
                {he ? 'בהמשך אתה מסכים לתנאי השימוש ומדיניות הפרטיות' : 'By continuing you agree to our Terms & Privacy Policy'}
              </p>
            </motion.div>
          )}

          {/* ── SMS phone input ── */}
          {step === 'sms' && (
            <motion.div key="sms" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col gap-4 flex-1">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">{he ? 'מה מספר הטלפון שלך?' : 'What\'s your number?'}</h2>
                <p className="text-sm text-white/35 mt-0.5">{he ? 'נשלח קוד אימות חד-פעמי' : 'We\'ll send a one-time code'}</p>
              </div>

              <div className="flex gap-2">
                <select value={cc} onChange={e => setCc(e.target.value)}
                  className="rounded-2xl px-3 py-3.5 text-white text-sm outline-none cursor-pointer shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code} style={{ background: '#1a1a2e' }}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  placeholder="050-000-0000" autoFocus
                  className="flex-1 rounded-2xl px-4 py-3.5 text-white placeholder-white/25 outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <ActionButton onClick={handleSendOTP} label={he ? 'שלח קוד →' : 'Send Code →'} />
              <BackButton onClick={() => { setStep('main'); setError('') }} he={he} />
            </motion.div>
          )}

          {/* ── OTP ── */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col gap-4 flex-1">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">{he ? 'הכנס קוד אימות' : 'Enter verification code'}</h2>
                <p className="text-sm text-white/35 mt-0.5">{he ? `נשלח ל-${cc}${phone}` : `Sent to ${cc}${phone}`}</p>
              </div>

              <div className="flex gap-2 justify-center" dir="ltr">
                {otp.map((d, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el}
                    type="tel" maxLength={1} value={d}
                    onChange={e => handleOtpInput(e.target.value, i)}
                    onKeyDown={e => e.key === 'Backspace' && !d && i > 0 && otpRefs.current[i-1]?.focus()}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: d ? '1.5px solid hsl(290,100%,65%)' : '1.5px solid rgba(255,255,255,0.15)',
                      boxShadow: d ? '0 0 10px hsl(290,100%,65%,0.3)' : 'none',
                    }} />
                ))}
              </div>

              {DEV && <p className="text-yellow-400/60 text-xs text-center">{he ? 'הכנס כל 6 ספרות' : 'Enter any 6 digits'}</p>}
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <ActionButton onClick={handleVerifyOTP} label={he ? 'אמת' : 'Verify'} disabled={otp.join('').length < 6} />

              <div className="flex items-center justify-between px-1">
                <BackButton onClick={() => { setStep('sms'); setOtp(['','','','','','']); setError('') }} he={he} inline />
                {resend > 0
                  ? <span className="text-xs text-white/30">{he ? `שלח שוב בעוד ${resend}s` : `Resend in ${resend}s`}</span>
                  : <button onClick={() => { setOtp(['','','','','','']); handleSendOTP() }}
                      className="text-xs font-semibold transition-colors" style={{ color: 'hsl(290,100%,65%)' }}>
                      {he ? 'שלח שוב' : 'Resend'}
                    </button>}
              </div>
            </motion.div>
          )}

          {/* ── Email ── */}
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col gap-4 flex-1">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">{he ? 'מה כתובת האימייל?' : 'What\'s your email?'}</h2>
                <p className="text-sm text-white/35 mt-0.5">{he ? 'נשלח לינק כניסה — בחינם לגמרי' : 'We\'ll send a free sign-in link'}</p>
              </div>

              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                placeholder="your@email.com" autoFocus
                className="w-full rounded-2xl px-4 py-3.5 text-white placeholder-white/25 outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <ActionButton onClick={handleSendEmail} label={he ? 'שלח לינק →' : 'Send Link →'} />
              <BackButton onClick={() => { setStep('main'); setError('') }} he={he} />
            </motion.div>
          )}

          {/* ── Email sent ── */}
          {step === 'email_sent' && (
            <motion.div key="email_sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 flex-1 justify-center text-center">
              <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">📬</motion.div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{he ? 'בדוק את המייל!' : 'Check your email!'}</h2>
                <p className="text-sm text-white/40">{he ? `שלחנו לינק כניסה ל-${email}` : `Sent a sign-in link to ${email}`}</p>
              </div>
              <div className="rounded-2xl px-4 py-3 text-xs text-white/40 text-start space-y-1.5 w-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p>• {he ? 'פתח את המייל ולחץ על הלינק' : 'Open the email and tap the link'}</p>
                <p>• {he ? 'הלינק פותח את האפליקציה אוטומטית' : 'The link opens the app automatically'}</p>
                <p>• {he ? 'תוקף: 10 דקות' : 'Expires in 10 minutes'}</p>
              </div>
              <button onClick={() => setStep('email')} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                {he ? '← שנה אימייל' : '← Change email'}
              </button>
            </motion.div>
          )}

          {/* ── Loading ── */}
          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-4 flex-1">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-2 border-transparent"
                style={{ borderTopColor: 'hsl(290,100%,65%)', borderRightColor: 'hsl(320,100%,60%)' }} />
              <p className="text-sm text-white/40">{loadingLabel}</p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ActionButton({ onClick, label, disabled }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl font-bold text-[15px] text-white transition-all disabled:opacity-40"
      style={{ background: disabled ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))', boxShadow: disabled ? 'none' : '0 4px 24px hsl(290,100%,65%,0.35)' }}>
      {label}
    </motion.button>
  )
}

function BackButton({ onClick, he, inline }) {
  if (inline) return (
    <button onClick={onClick} className="text-xs text-white/35 hover:text-white/60 transition-colors">
      {he ? '← חזרה' : '← Back'}
    </button>
  )
  return (
    <button onClick={onClick} className="w-full text-center text-sm text-white/30 hover:text-white/50 transition-colors py-1">
      {he ? '← חזרה' : '← Back'}
    </button>
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
