import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import NeonButton from '../components/NeonButton'
import Avatar from '../components/Avatar'
import { signOut as localSignOut } from '../utils/storage'
import { signOut as fbSignOut } from '../firebase/auth'
import { seedTestCheckins, clearTestCheckins } from '../utils/seedTestData'
import { compressToBase64 } from '../utils/imageUtils'

type PhotoSlot = 1 | 2 | 3

interface ProfileForm {
  display_name: string
  age: string | number
  gender: string
  bio: string
  tonight_status: string[]
  preference: string
  instagram_handle: string
}

export default function Profile() {
  const { lang, toggleLang, user, updateUser, isRTL } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProfileForm>({
    display_name: user?.display_name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    tonight_status: user?.tonight_status ? user.tonight_status.split(' · ').filter(Boolean) : [],
    preference: user?.preference || '',
    instagram_handle: user?.instagram_handle || '',
  })
  const [saved, setSaved] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [seedStatus, setSeedStatus] = useState('')
  const [uploadingSlot, setUploadingSlot] = useState<PhotoSlot | null>(null)
  const devPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function startDevPress() {
    devPressRef.current = setTimeout(() => setShowDevTools(v => !v), 2000)
  }
  function cancelDevPress() {
    if (devPressRef.current) clearTimeout(devPressRef.current)
  }

  async function handleSeed() {
    setSeedStatus('⏳ זורע...')
    try {
      const n = await seedTestCheckins()
      setSeedStatus(`✅ נוצרו ${n} משתמשי טסט`)
    } catch (e) {
      setSeedStatus('❌ שגיאה: ' + (e as Error).message)
    }
  }

  async function handleClearSeed() {
    setSeedStatus('⏳ מנקה...')
    try {
      const n = await clearTestCheckins()
      setSeedStatus(`🗑️ נמחקו ${n} משתמשי טסט`)
    } catch (e) {
      setSeedStatus('❌ שגיאה: ' + (e as Error).message)
    }
  }

  const up = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    updateUser({
      ...form,
      tonight_status: Array.isArray(form.tonight_status)
        ? form.tonight_status.join(' · ')
        : form.tonight_status,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handlePhoto(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const slot = (index + 1) as PhotoSlot
    const photoKey = `photo${slot}_url` as 'photo1_url' | 'photo2_url' | 'photo3_url'
    setUploadingSlot(slot)
    try {
      const compressed = await compressToBase64(file)
      void updateUser({ [photoKey]: compressed })
    } catch (err) {
      console.error('Photo compression failed:', err)
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleSignOut() {
    localSignOut()
    await fbSignOut()
    window.location.reload()
  }

  const photos = [user?.photo1_url, user?.photo2_url, user?.photo3_url]

  return (
    <div className="h-full overflow-y-auto scroll-area scrollbar-hide" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-4 py-6 space-y-5 pb-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white select-none"
            onMouseDown={startDevPress} onMouseUp={cancelDevPress} onMouseLeave={cancelDevPress}
            onTouchStart={startDevPress} onTouchEnd={cancelDevPress}>
            👤 {t(lang, 'profile')}
          </h1>
          <button onClick={toggleLang} className="glass-card border border-white/15 px-3 py-1.5 rounded-full text-xs text-white/50 hover:text-white transition-colors">
            🌐 {lang === 'he' ? 'EN' : 'HE'}
          </button>
        </motion.div>

        {/* Avatar row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => fileRefs[0].current?.click()}>
            <Avatar src={user?.photo1_url ?? undefined} name={user?.display_name} size="xl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))' }}>✏️</div>
            {uploadingSlot === 1 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <input ref={fileRefs[0]} type="file" accept="image/*" onChange={e => handlePhoto(0, e)} className="hidden" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{user?.display_name}</p>
            <p className="text-sm text-white/40">
              {user?.age}
              {user?.gender ? ` · ${user.gender === 'male' ? t(lang, 'male') : user.gender === 'female' ? t(lang, 'female') : t(lang, 'other')}` : ''}
            </p>
            {user?.tonight_status && <p className="text-xs text-[hsl(290,100%,65%)] mt-0.5">{user.tonight_status}</p>}
          </div>
        </motion.div>

        {/* Photo grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="block text-sm text-white/40 mb-2">{t(lang, 'photos')}</label>
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map(i => (
              <div key={i} onClick={() => fileRefs[i].current?.click()}
                className="aspect-square rounded-xl overflow-hidden border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[hsl(290,100%,65%,0.5)] transition-colors relative"
                style={{ background: photos[i] ? 'none' : 'rgba(255,255,255,0.04)' }}>
                {photos[i] ? (
                  <img src={photos[i]!} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-2xl text-white/20">+</span>
                )}
                {uploadingSlot === i + 1 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <input ref={fileRefs[i]} type="file" accept="image/*" onChange={e => handlePhoto(i, e)} className="hidden" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form fields */}
        {([
          { key: 'display_name', label: t(lang, 'displayName'), type: 'text', maxLength: 30 },
          { key: 'age', label: t(lang, 'age'), type: 'number', maxLength: 3 },
          { key: 'instagram_handle', label: t(lang, 'instagramHandle'), type: 'text', prefix: '@', maxLength: 30 },
          { key: 'bio', label: t(lang, 'bio'), type: 'textarea', maxLength: 160 },
        ] as Array<{ key: keyof ProfileForm; label: string; type: string; prefix?: string; maxLength?: number }>).map(({ key, label, type, prefix, maxLength }) => (
          <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <label className="block text-sm text-white/40 mb-1.5">{label}</label>
            {type === 'textarea' ? (
              <div className="relative">
                <textarea value={String(form[key] ?? '')} onChange={e => up(key, e.target.value)} rows={3} maxLength={maxLength}
                  className="w-full glass-card border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors bg-transparent resize-none text-sm" />
                {maxLength && <span className="absolute bottom-2 left-3 text-[10px] text-white/20">{String(form[key] ?? '').length}/{maxLength}</span>}
              </div>
            ) : (
              <div className="relative">
                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">{prefix}</span>}
                <input type={type} value={String(form[key] ?? '')} onChange={e => up(key, e.target.value)} maxLength={maxLength}
                  className={`w-full glass-card border border-white/15 rounded-xl py-3 text-white outline-none focus:border-[hsl(290,100%,65%)] transition-colors bg-transparent text-sm ${prefix ? 'pl-8 pr-4' : 'px-4'}`} />
              </div>
            )}
          </motion.div>
        ))}

        {/* Gender */}
        <div>
          <label className="block text-sm text-white/40 mb-2">{t(lang, 'gender')}</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'other'] as const).map(g => (
              <button key={g} onClick={() => up('gender', g)}
                className={`py-2.5 rounded-xl text-xs font-medium transition-all border ${form.gender === g ? 'border-[hsl(290,100%,65%)] text-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
                {g === 'male' ? '♂ ' + t(lang, 'male') : g === 'female' ? '♀ ' + t(lang, 'female') : '⚧ ' + t(lang, 'other')}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-white/40 mb-2">{t(lang, 'tonightStatus')}</label>
          <div className="space-y-1.5">
            {(t(lang, 'statusOptions') as string[]).map(s => {
              const selected = Array.isArray(form.tonight_status)
                ? form.tonight_status.includes(s)
                : form.tonight_status === s
              return (
                <button key={s} onClick={() => up('tonight_status', selected
                  ? (Array.isArray(form.tonight_status) ? form.tonight_status.filter(x => x !== s) : [])
                  : [...(Array.isArray(form.tonight_status) ? form.tonight_status : [form.tonight_status].filter(Boolean)), s]
                )}
                  className={`w-full text-start px-3 py-2.5 rounded-xl text-xs font-medium transition-all border flex items-center justify-between ${selected ? 'border-[hsl(290,100%,65%)] text-white bg-[hsl(290,100%,65%,0.15)]' : 'border-white/10 text-white/50 glass-card'}`}>
                  <span>{s}</span>
                  {selected && <span className="text-[hsl(290,100%,65%)]">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preference */}
        <div>
          <label className="block text-sm text-white/40 mb-2">{t(lang, 'preference')}</label>
          <div className="flex gap-2">
            {(t(lang, 'preferenceOptions') as string[]).map((p, i) => (
              <button key={p} onClick={() => up('preference', ['men', 'women', 'all'][i])}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${form.preference === ['men', 'women', 'all'][i] ? 'border-[hsl(320,100%,60%)] text-[hsl(320,100%,60%)] bg-[hsl(320,100%,60%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <NeonButton variant={saved ? 'cyan' : 'purple'} size="lg" fullWidth onClick={handleSave}>
          {saved ? (lang === 'he' ? '✓ נשמר!' : '✓ Saved!') : t(lang, 'save')}
        </NeonButton>

        {/* Dev tools */}
        {(showDevTools || user?.is_test_account) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(255,200,0,0.07)', border: '1px dashed rgba(255,200,0,0.3)' }}>
            <p className="text-xs text-yellow-400/70 font-mono text-center">🛠 DEV TOOLS</p>
            <div className="flex gap-2">
              <button onClick={handleSeed}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-yellow-300 transition-all"
                style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.25)' }}>
                🧪 זרע 10 משתמשי טסט
              </button>
              <button onClick={handleClearSeed}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-red-400 transition-all"
                style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                🗑️ מחק טסטים
              </button>
            </div>
            {seedStatus && (
              <p className="text-xs text-center font-mono" style={{ color: seedStatus.startsWith('✅') ? '#4ade80' : seedStatus.startsWith('❌') ? '#f87171' : '#fde68a' }}>
                {seedStatus}
              </p>
            )}
            <button onClick={() => navigate('/admin')}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-purple-300 transition-all"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
              🛠 פתח פאנל ניהול (QR + מאצ'ים)
            </button>
          </motion.div>
        )}

        {/* Install App */}
        <div className="glass-card border border-white/8 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">📲 {lang === 'he' ? 'התקן את האפליקציה' : 'Install App'}</p>
          <p className="text-xs text-white/30 leading-relaxed">
            {lang === 'he'
              ? 'iOS: Safari → שתף → "הוסף למסך הבית"\nAndroid: Chrome → ⋮ → "הוסף למסך הבית"'
              : 'iOS: Safari → Share → "Add to Home Screen"\nAndroid: Chrome → ⋮ → "Add to Home Screen"'}
          </p>
        </div>

        {/* Terms */}
        <button onClick={() => navigate('/terms')} className="w-full text-center text-xs text-white/20 hover:text-white/40 transition-colors py-1 underline">
          {lang === 'he' ? 'תנאי שימוש ופרטיות' : 'Terms & Privacy'}
        </button>

        {/* Sign out */}
        <NeonButton variant="danger" size="md" fullWidth onClick={handleSignOut}>
          🚪 {t(lang, 'signOut')}
        </NeonButton>
      </div>
    </div>
  )
}
