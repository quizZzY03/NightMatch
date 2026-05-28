import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NeonButton from '../components/NeonButton'
import { t } from '../utils/i18n'
import { checkOut } from '../utils/storage'
import { compressToBase64 } from '../utils/imageUtils'
import { uploadProfilePhoto } from '../firebase/storage'
import { signOut } from '../firebase/auth'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import type { Lang } from '../types'

const STEPS = ['welcome', 'profile', 'status', 'photo', 'done']

interface OnboardingData {
  display_name: string
  age: string
  gender: string
  bio: string
  tonight_status: string[]
  preference: string
  photo1_url: string
  photo2_url: string
  photo3_url: string
}

export default function Onboarding() {
  const { lang, toggleLang, updateUser, refreshCheckin, isRTL, user, firebaseUser } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    display_name: '', age: '', gender: '', bio: '', tonight_status: [], preference: '',
    photo1_url: '', photo2_url: '', photo3_url: '',
  })
  const [error, setError] = useState('')
  const [uploadingSlot, setUploadingSlot] = useState<0 | 1 | 2 | null>(null)
  const [photoError, setPhotoError] = useState('')
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const up = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData(d => ({ ...d, [k]: v }))

  function validate(): string {
    if (step === 1) {
      if (!data.display_name.trim()) return t(lang, 'required') + ': ' + t(lang, 'displayName')
      const age = parseInt(data.age)
      if (!age || age < 18 || age > 80) return (lang === 'he' ? 'גיל חייב להיות בין 18-80' : 'Age must be between 18-80')
      if (!data.gender) return t(lang, 'required') + ': ' + t(lang, 'gender')
    }
    if (step === 2 && data.tonight_status.length === 0) return t(lang, 'required') + ': ' + t(lang, 'tonightStatus')
    if (step === 3) {
      const filled = [data.photo1_url, data.photo2_url, data.photo3_url].filter(Boolean).length
      if (filled < 3) return lang === 'he' ? `חובה להעלות 3 תמונות (${filled}/3)` : `Please upload 3 photos (${filled}/3)`
    }
    return ''
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  async function handlePhoto(slot: 0 | 1 | 2, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setUploadingSlot(slot)
    const key = `photo${slot + 1}_url` as 'photo1_url' | 'photo2_url' | 'photo3_url'
    try {
      const uid = firebaseUser?.uid || user?.id
      if (FIREBASE_CONFIGURED && uid && uid !== 'demo-user') {
        const url = await uploadProfilePhoto(uid, file, (slot + 1) as 1 | 2 | 3)
        up(key, url)
      } else {
        const compressed = await compressToBase64(file)
        up(key, compressed)
      }
    } catch {
      setPhotoError(lang === 'he' ? 'שגיאה בטעינת התמונה — נסה שוב' : 'Failed to load image — try again')
    } finally {
      setUploadingSlot(null)
    }
  }

  async function finish() {
    checkOut()
    refreshCheckin()
    const saveData = {
      ...data,
      age: parseInt(data.age) || 0,
      bio: data.bio?.trim() || '',
      tonight_status: data.tonight_status.join(' · '),
      onboarding_complete: true,
      language: lang as Lang,
    }
    await updateUser(saveData)
    navigate('/')
  }

  const slideVariants = {
    enter: { x: isRTL ? -40 : 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: isRTL ? 40 : -40, opacity: 0 },
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(290,100%,65%) 0%, transparent 70%)' }} />
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <motion.div key={i}
            animate={{ width: i === step ? 24 : 8, backgroundColor: i <= step ? 'hsl(290,100%,65%)' : 'rgba(255,255,255,0.2)' }}
            className="h-2 rounded-full transition-all duration-300" />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-sm">

          {/* STEP 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl">🌙</motion.div>
              <div>
                <h1 className="text-3xl font-black mb-2" style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t(lang, 'onboardingWelcome')}
                </h1>
                <p className="text-white/60">{t(lang, 'onboardingWelcomeDesc')}</p>
              </div>
              <button onClick={toggleLang}
                className="glass-card border border-white/15 px-4 py-2 rounded-full text-sm text-white/60 hover:text-white transition-colors">
                🌐 {lang === 'he' ? 'English' : 'עברית'}
              </button>
              <NeonButton variant="purple" size="lg" fullWidth onClick={next}>{t(lang, 'next')} →</NeonButton>
              <button
                onClick={async () => { await signOut(); window.location.reload() }}
                className="w-full py-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                {lang === 'he' ? '↩ התחבר עם חשבון אחר' : '↩ Sign in with a different account'}
              </button>
            </div>
          )}

          {/* STEP 1: Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-center text-white">{t(lang, 'onboardingProfile')}</h2>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">{t(lang, 'displayName')}</label>
                <input value={data.display_name} onChange={e => up('display_name', e.target.value)}
                  placeholder={lang === 'he' ? 'השם שלך...' : 'Your name...'}
                  className="w-full glass-card border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors bg-transparent" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">{t(lang, 'age')}</label>
                <input type="number" min="18" max="80" value={data.age} onChange={e => up('age', e.target.value)}
                  className="w-full glass-card border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[hsl(290,100%,65%)] transition-colors bg-transparent" />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-2">{t(lang, 'gender')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <button key={g} onClick={() => up('gender', g)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${data.gender === g ? 'border-[hsl(290,100%,65%)] text-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
                      {g === 'male' ? '♂ ' + t(lang, 'male') : g === 'female' ? '♀ ' + t(lang, 'female') : '⚧ ' + t(lang, 'other')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">
                  {t(lang, 'bio')} <span className="text-white/25">({lang === 'he' ? 'אופציונלי' : 'optional'})</span>
                </label>
                <div className="relative">
                  <textarea value={data.bio} onChange={e => up('bio', e.target.value)} rows={2} maxLength={120}
                    placeholder={lang === 'he' ? 'כמה מילים עלייך...' : 'A few words about you...'}
                    className="w-full glass-card border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors bg-transparent resize-none text-sm" />
                  <span className="absolute bottom-2 left-3 text-[10px] text-white/20">{data.bio?.length || 0}/120</span>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <NeonButton variant="ghost" size="md" onClick={() => setStep(0)}>{t(lang, 'back')}</NeonButton>
                <NeonButton variant="purple" size="md" fullWidth onClick={next}>{t(lang, 'next')} →</NeonButton>
              </div>
            </div>
          )}

          {/* STEP 2: Status */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-center text-white">{t(lang, 'onboardingStatus')}</h2>
              <div className="space-y-2">
                {(t(lang, 'statusOptions') as string[]).map(s => {
                  const selected = data.tonight_status.includes(s)
                  return (
                    <button key={s} onClick={() => up('tonight_status', selected ? data.tonight_status.filter(x => x !== s) : [...data.tonight_status, s])}
                      className={`w-full text-start px-4 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-between ${selected ? 'border-[hsl(290,100%,65%)] text-white bg-[hsl(290,100%,65%,0.2)]' : 'border-white/10 text-white/60 glass-card hover:border-white/30'}`}>
                      <span>{s}</span>
                      {selected && <span className="text-[hsl(290,100%,65%)] text-base">✓</span>}
                    </button>
                  )
                })}
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-2">{t(lang, 'preference')}</label>
                <div className="flex gap-2">
                  {(t(lang, 'preferenceOptions') as string[]).map((p, i) => (
                    <button key={p} onClick={() => up('preference', ['men', 'women', 'all'][i])}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${data.preference === ['men', 'women', 'all'][i] ? 'border-[hsl(320,100%,60%)] text-[hsl(320,100%,60%)] bg-[hsl(320,100%,60%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <NeonButton variant="ghost" size="md" onClick={() => setStep(1)}>{t(lang, 'back')}</NeonButton>
                <NeonButton variant="purple" size="md" fullWidth onClick={next}>{t(lang, 'next')} →</NeonButton>
              </div>
            </div>
          )}

          {/* STEP 3: Photos (3 required) */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {lang === 'he' ? '3 תמונות — חובה' : '3 Photos — Required'}
                </h2>
                <p className="text-sm text-white/40">
                  {lang === 'he' ? 'פרופילים עם 3 תמונות מקבלים פי 8 יותר מאצ׳ים' : 'Profiles with 3 photos get 8× more matches'}
                </p>
              </div>

              {/* Progress bar */}
              {(() => {
                const filled = [data.photo1_url, data.photo2_url, data.photo3_url].filter(Boolean).length
                return (
                  <div className="flex items-center gap-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <motion.div className="h-full rounded-full"
                          animate={{ width: i < filled ? '100%' : '0%' }}
                          transition={{ duration: 0.3 }}
                          style={{ background: 'linear-gradient(90deg, hsl(290,100%,65%), hsl(320,100%,60%))' }} />
                      </div>
                    ))}
                    <span className="text-xs text-white/40 shrink-0">
                      {filled}/3
                    </span>
                  </div>
                )
              })()}

              {/* Photo grid — large first, two smaller below */}
              <div className="space-y-2">
                {/* Main photo */}
                {([0, 1, 2] as const).map(i => {
                  const photoKey = `photo${i + 1}_url` as 'photo1_url' | 'photo2_url' | 'photo3_url'
                  const photoUrl = data[photoKey]
                  const isUploading = uploadingSlot === i
                  const labels = lang === 'he'
                    ? ['תמונה ראשית', 'תמונה שנייה', 'תמונה שלישית']
                    : ['Main photo', 'Second photo', 'Third photo']
                  return (
                    <motion.div key={i} whileTap={{ scale: 0.98 }}
                      onClick={() => fileRefs[i].current?.click()}
                      className="relative w-full rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors"
                      style={{
                        height: i === 0 ? 180 : 110,
                        borderColor: photoUrl ? 'hsl(290,100%,65%,0.5)' : 'rgba(255,255,255,0.12)',
                        background: photoUrl ? 'none' : 'rgba(139,92,246,0.06)',
                      }}>
                      {photoUrl ? (
                        <img src={photoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl opacity-40">📷</span>
                          <span className="text-xs text-white/30">{labels[i]}</span>
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {photoUrl && !isUploading && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                          ✏️
                        </div>
                      )}
                      <input ref={fileRefs[i]} type="file" accept="image/*"
                        onChange={e => handlePhoto(i, e)} className="hidden" />
                    </motion.div>
                  )
                })}
              </div>

              {photoError && <p className="text-xs text-red-400 text-center">{photoError}</p>}
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <div className="flex gap-3">
                <NeonButton variant="ghost" size="md" onClick={() => setStep(2)}>{t(lang, 'back')}</NeonButton>
                <NeonButton variant="purple" size="md" fullWidth onClick={next} disabled={uploadingSlot !== null}>
                  {t(lang, 'next')} →
                </NeonButton>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6 }} className="text-6xl">🎉</motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{t(lang, 'onboardingDone')}</h2>
                <p className="text-white/50 text-sm">{data.display_name ? `${lang === 'he' ? 'ברוך/ה הבא/ה' : 'Welcome'}, ${data.display_name}!` : ''}</p>
              </div>
              <NeonButton variant="purple" size="lg" fullWidth onClick={finish}>
                🌙 {lang === 'he' ? 'בואו נתחיל!' : "Let's Go!"}
              </NeonButton>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
