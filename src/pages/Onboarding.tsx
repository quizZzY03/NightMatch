import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NeonButton from '../components/NeonButton'
import { t } from '../utils/i18n'
import { checkOut } from '../utils/storage'
import { compressToBase64 } from '../utils/imageUtils'
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
}

export default function Onboarding() {
  const { lang, toggleLang, updateUser, refreshCheckin, isRTL, user } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    display_name: '', age: '', gender: '', bio: '', tonight_status: [], preference: '', photo1_url: '',
  })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
    return ''
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setUploading(true)
    try {
      const compressed = await compressToBase64(file)
      up('photo1_url', compressed)
    } catch {
      setPhotoError(lang === 'he' ? 'שגיאה בטעינת התמונה — נסה שוב' : 'Failed to load image — try again')
    } finally {
      setUploading(false)
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

          {/* STEP 3: Photo */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{t(lang, 'onboardingPhoto')}</h2>
                <p className="text-sm text-white/40">{lang === 'he' ? 'פרופיל עם תמונה מקבל פי 5 יותר לייקים' : '5× more likes with a photo'}</p>
              </div>
              <motion.div whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                className="w-36 h-36 mx-auto rounded-full overflow-hidden border-2 border-dashed border-[hsl(290,100%,65%,0.5)] flex items-center justify-center cursor-pointer hover:border-[hsl(290,100%,65%)] transition-colors relative"
                style={{ background: data.photo1_url ? 'none' : 'rgba(139,92,246,0.1)' }}>
                {data.photo1_url
                  ? <img src={data.photo1_url} className="w-full h-full object-cover" alt="" />
                  : <div className="text-center"><div className="text-4xl mb-1">📷</div><div className="text-xs text-white/40">{t(lang, 'uploadPhoto')}</div></div>
                }
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {data.photo1_url && !uploading && (
                <button onClick={() => fileRef.current?.click()} className="text-sm text-[hsl(290,100%,65%)] underline">{t(lang, 'changePhoto')}</button>
              )}
              {uploading && (
                <p className="text-xs text-white/40">{lang === 'he' ? 'מדחיס תמונה...' : 'Compressing photo...'}</p>
              )}
              {photoError && (
                <p className="text-xs text-red-400">{photoError}</p>
              )}
              <div className="flex gap-3">
                <NeonButton variant="ghost" size="md" onClick={() => setStep(2)}>{t(lang, 'back')}</NeonButton>
                <NeonButton variant="purple" size="md" fullWidth onClick={next} disabled={uploading}>
                  {data.photo1_url ? `${t(lang, 'next')} →` : (lang === 'he' ? 'דלג בינתיים →' : 'Skip for now →')}
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
