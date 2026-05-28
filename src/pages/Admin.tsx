import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED, ADMIN_UIDS } from '../firebase/config'
import { getVenues } from '../firebase/db'
import { useApp } from '../context/AppContext'
import { seedProductionVenues } from '../utils/seedVenues'
import AdminTestPanel from './AdminTestPanel'

function qrUrl(venueId: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(venueId)}&size=${size}x${size}&bgcolor=ffffff&color=000000&qzone=2`
}

function downloadQR(venue) {
  const link = document.createElement('a')
  link.href = qrUrl(venue.id, 600)
  link.download = `qr-${venue.name}.png`
  link.click()
}

function printQR(venue) {
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>QR — ${venue.name}</title>
    <style>
      body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
      h1 { font-size: 32px; margin-bottom: 6px; }
      p { color: #666; margin-bottom: 24px; font-size: 16px; }
      img { width: 320px; height: 320px; border: 6px solid #000; border-radius: 20px; }
      small { margin-top: 14px; color: #bbb; font-size: 11px; font-family: monospace; }
    </style></head>
    <body>
      <h1>${venue.name}</h1>
      <p>${venue.city || ''}</p>
      <img src="${qrUrl(venue.id, 320)}" />
      <small>${venue.id}</small>
    </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 600)
}

const inputCls = "w-full bg-white/5 border border-white/12 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors"

export default function Admin() {
  const { user, firebaseUser } = useApp()
  const [venues, setVenues] = useState([])
  const [activeTab, setActiveTab] = useState<'venues' | 'test'>('venues')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', name_en: '', city: '', lat: '', lng: '', radius: '200' })
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selectedQR, setSelectedQR] = useState(null)

  useEffect(() => { loadVenues() }, [])

  async function loadVenues() {
    try {
      const v = await getVenues()
      setVenues(v)
    } catch { /* no venues yet */ }
  }

  const isAdmin = ADMIN_UIDS.length === 0
    || (firebaseUser && ADMIN_UIDS.includes(firebaseUser.uid))
    || user?.is_admin === true

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center" dir="rtl">
        <div className="space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-white">אין גישה</h2>
          <p className="text-white/40 text-sm">פאנל זה מוגבל למנהלי מערכת בלבד.</p>
          <p className="text-white/20 text-xs font-mono mt-2">{firebaseUser?.uid || 'לא מחובר'}</p>
        </div>
      </div>
    )
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAddVenue() {
    if (!form.name || !form.lat || !form.lng) { showToast('שם, lat ו-lng הם חובה', false); return }
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng)
    if (isNaN(lat) || lat < -90 || lat > 90) { showToast('קו רוחב (lat) לא תקין', false); return }
    if (isNaN(lng) || lng < -180 || lng > 180) { showToast('קו אורך (lng) לא תקין', false); return }
    setBusy(true)
    try {
      await addDoc(collection(db, 'venues'), {
        name: form.name,
        name_en: form.name_en || form.name,
        city: form.city || '',
        lat,
        lng,
        geofence_radius: parseInt(form.radius) || 200,
        is_active: true,
        created_at: serverTimestamp(),
      })
      showToast(`✅ ${form.name} נוספה בהצלחה`)
      setForm({ name: '', name_en: '', city: '', lat: '', lng: '', radius: '200' })
      setShowAddForm(false)
      await loadVenues()
    } catch (e: any) {
      showToast(e.message, false)
    } finally { setBusy(false) }
  }

  async function handleSeedVenues() {
    setBusy(true)
    try {
      const count = await seedProductionVenues()
      showToast(`✅ ${count} וונות נוספו`)
      await loadVenues()
    } catch (e: any) {
      showToast(e.message, false)
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 inset-x-4 z-50 rounded-2xl px-4 py-3 text-sm font-semibold text-center shadow-xl"
            style={{ background: toast.ok ? 'hsl(145,70%,25%)' : 'hsl(0,70%,25%)', border: `1px solid ${toast.ok ? 'hsl(145,70%,40%)' : 'hsl(0,70%,40%)'}`, color: '#fff' }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Full-screen overlay */}
      <AnimatePresence>
        {selectedQR && (
          <>
            <motion.div key="backdrop" className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedQR(null)} />
            <motion.div key="qrModal"
              className="fixed z-50 inset-x-6 rounded-[28px] overflow-hidden"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
              <div className="bg-[#0d0d1a] border border-white/10 rounded-[28px] p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">{selectedQR.name}</h2>
                    <p className="text-sm text-white/40">{selectedQR.city}</p>
                  </div>
                  <button onClick={() => setSelectedQR(null)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>✕</button>
                </div>

                <div className="flex justify-center">
                  <div className="p-4 rounded-2xl bg-white">
                    <img src={qrUrl(selectedQR.id, 240)} alt="QR" className="w-60 h-60 rounded-xl" style={{ imageRendering: 'pixelated' }} />
                  </div>
                </div>

                <p className="text-center text-xs text-white/30 font-mono">{selectedQR.id}</p>

                <div className="flex gap-3">
                  <button onClick={() => downloadQR(selectedQR)}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, hsl(290,100%,55%), hsl(320,100%,50%))' }}>
                    ⬇ הורד PNG
                  </button>
                  <button onClick={() => printQR(selectedQR)}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/70 border border-white/15"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    🖨 הדפס
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-5 space-y-5 pb-10">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-black text-white">ניהול</h1>
          <p className="text-sm text-white/30 mt-0.5">NightMatch Admin</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            { key: 'venues', label: '🏙 וונות' },
            { key: 'test',   label: '🧪 סביבת טסט' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === tab.key ? 'linear-gradient(135deg, hsl(290,100%,55%), hsl(320,100%,50%))' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Test panel */}
        {activeTab === 'test' && <AdminTestPanel venues={venues} />}

        {/* Venues tab */}
        {activeTab === 'venues' && (
          <div className="space-y-6">
            {/* Venues list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">ברקודי וונות</h2>
                <span className="text-xs text-white/25">{venues.length} וונות</span>
              </div>

              {venues.length === 0 ? (
                <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-4xl">🏙</div>
                  <p className="text-white/50 text-sm">אין וונות עדיין</p>
                  <button onClick={handleSeedVenues} disabled={busy}
                    className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, hsl(290,100%,55%), hsl(320,100%,50%))' }}>
                    {busy ? '⏳ טוען...' : '🚀 טען וונות לדוגמה'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {venues.map((v, i) => (
                    <motion.div key={v.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedQR(v)}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 p-4 cursor-pointer transition-all active:scale-[0.98] hover:border-[hsl(290,100%,65%,0.4)]"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="shrink-0 p-1.5 bg-white rounded-xl">
                        <img src={qrUrl(v.id, 80)} alt="QR" className="w-14 h-14 rounded-lg" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base leading-tight">{v.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{v.city}</p>
                        <p className="text-[11px] text-white/20 font-mono mt-1 truncate">{v.id}</p>
                      </div>
                      <div className="shrink-0 text-white/20 text-lg">‹</div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/8" />

            {/* Add venue */}
            <div className="space-y-3">
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="w-full flex items-center justify-between rounded-2xl border border-white/10 p-4 transition-all hover:border-white/20"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">➕</span>
                  <span className="font-semibold text-white">הוסף וונה חדשה</span>
                </div>
                <motion.span animate={{ rotate: showAddForm ? 90 : 0 }} className="text-white/30">›</motion.span>
              </button>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    key="addForm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="rounded-2xl border border-white/10 p-5 space-y-4"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-white/40 mb-1.5">שם הוונה *</label>
                          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="בר הנמל" className={inputCls} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-white/40 mb-1.5">שם באנגלית</label>
                          <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                            placeholder="Port Bar" className={inputCls} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-white/40 mb-1.5">עיר</label>
                          <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                            placeholder="תל אביב" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1.5">Latitude *</label>
                          <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                            placeholder="32.0853" className={inputCls} inputMode="decimal" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1.5">Longitude *</label>
                          <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                            placeholder="34.7818" className={inputCls} inputMode="decimal" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-white/40 mb-1.5">רדיוס GPS (מטרים)</label>
                          <input value={form.radius} onChange={e => setForm(f => ({ ...f, radius: e.target.value }))}
                            placeholder="200" className={inputCls} inputMode="numeric" />
                        </div>
                      </div>
                      <p className="text-xs text-white/25 text-center">
                        לקואורדינטות: Google Maps → לחץ ימני → "What's here"
                      </p>
                      <button onClick={handleAddVenue} disabled={busy || !form.name || !form.lat || !form.lng}
                        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                        style={{ background: 'linear-gradient(135deg, hsl(290,100%,55%), hsl(320,100%,50%))' }}>
                        {busy ? '⏳ שומר...' : '✅ הוסף וונה'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Firebase Console link */}
            <a href="https://console.firebase.google.com/project/nightmatch-34424/firestore/data/~2Fvenues"
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-white/25 hover:text-white/50 transition-colors py-2">
              <span>🔗</span>
              <span>Firebase Console → Venues</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
