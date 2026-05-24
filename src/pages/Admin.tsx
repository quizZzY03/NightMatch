import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED, ADMIN_UIDS } from '../firebase/config'
import { seedTestCheckins, clearTestCheckins } from '../utils/seedTestData'
import { seedProductionVenues } from '../utils/seedVenues'
import { getVenues } from '../firebase/db'
import { sessionKey } from '../utils/geo'
import { useApp } from '../context/AppContext'

// ── QR image URL ──────────────────────────────────────────────────────────────
// Black on white = standard, readable by all scanners and cameras.
// The styled purple version is kept only for the preview card frame.
function qrUrl(venueId: string, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(venueId)}&size=${size}x${size}&bgcolor=ffffff&color=000000&qzone=2`
}

const MOCK_VENUES = [
  { id: 'v1', name: 'בר הנמל', name_en: 'Port Bar', city: 'תל אביב', geofence_radius: 250 },
  { id: 'v2', name: 'קלאב הסנסציה', name_en: 'Sensation Club', city: 'תל אביב', geofence_radius: 200 },
  { id: 'v3', name: 'חתונת כהן', name_en: 'Cohen Wedding', city: 'רמת גן', geofence_radius: 500 },
  { id: 'v4', name: 'ערב פרייד', name_en: 'Pride Night', city: 'חיפה', geofence_radius: 400 },
  { id: 'v5', name: 'רוף טופ בר', name_en: 'Rooftop Bar', city: 'ירושלים', geofence_radius: 200 },
]

export default function Admin() {
  const { user, firebaseUser } = useApp()

  // ── All hooks MUST come before any conditional return ─────────────────────
  const [venues, setVenues] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('qr')
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', name_en: '', city: '', lat: '', lng: '', radius: '200' })
  const [matchUserId, setMatchUserId] = useState('')
  const [matchVenueId, setMatchVenueId] = useState('')

  useEffect(() => {
    getVenues().then(v => {
      const list = v.length ? v : MOCK_VENUES
      setVenues(list)
      setSelected(list[0])
      setMatchVenueId(list[0]?.id || 'v2')
    }).catch(() => {
      setVenues(MOCK_VENUES)
      setSelected(MOCK_VENUES[0])
      setMatchVenueId(MOCK_VENUES[0].id)
    })
  }, [])

  // ── Access guard (after hooks) ────────────────────────────────────────────
  const isAdmin = ADMIN_UIDS.length === 0         // dev: open when no UIDs set
    || (firebaseUser && ADMIN_UIDS.includes(firebaseUser.uid))
    || user?.is_admin === true

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center" dir="rtl">
        <div className="space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-white">אין גישה</h2>
          <p className="text-white/40 text-sm">פאנל זה מוגבל למנהלי מערכת בלבד.</p>
          <p className="text-white/25 text-xs font-mono mt-2">UID שלך: {firebaseUser?.uid || 'לא מחובר'}</p>
          <p className="text-white/20 text-xs leading-relaxed">
            הוסף את ה-UID שלך למערך <code className="text-[hsl(290,100%,65%)]">ADMIN_UIDS</code>
            <br />בקובץ <code className="text-white/40">src/firebase/config.js</code>
          </p>
        </div>
      </div>
    )
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addLog = (msg) => setLog(prev => [`${new Date().toLocaleTimeString('he')} — ${msg}`, ...prev].slice(0, 20))

  async function handleSeedVenues() {
    setBusy(true)
    addLog('מזרים וונות ייצור ל-Firestore...')
    try {
      const count = await seedProductionVenues()
      addLog(`✅ ${count} וונות נוספו`)
      const updated = await getVenues()
      setVenues(updated)
      if (updated[0]) { setSelected(updated[0]); setMatchVenueId(updated[0].id) }
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  async function handleSeed() {
    if (!selected) return
    setBusy(true)
    addLog(`מזרים משתמשי בדיקה לוונה "${selected.name}"...`)
    try {
      const count = await seedTestCheckins(selected.id)
      addLog(`✅ ${count} משתמשי בדיקה נוספו לסשן היום`)
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  async function handleClear() {
    if (!selected) return
    setBusy(true)
    addLog(`מנקה משתמשי בדיקה מוונה "${selected.name}"...`)
    try {
      const count = await clearTestCheckins(selected.id)
      addLog(`🗑 ${count} רשומות הוסרו`)
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  async function handleForceMatch() {
    if (!user?.id || !matchUserId.trim() || !matchVenueId) { addLog('❌ מלא את כל השדות'); return }
    setBusy(true)
    const sKey = sessionKey(matchVenueId)
    addLog(`יוצר לייקים הדדיים: ${user.id} ↔ ${matchUserId.trim()}`)
    try {
      await addDoc(collection(db, 'likes'), { from_user_id: user.id, to_user_id: matchUserId.trim(), venue_id: matchVenueId, session_key: sKey, is_active: true, created_at: serverTimestamp() })
      await addDoc(collection(db, 'likes'), { from_user_id: matchUserId.trim(), to_user_id: user.id, venue_id: matchVenueId, session_key: sKey, is_active: true, created_at: serverTimestamp() })
      addLog('✅ שני לייקים נוצרו — בדוק לשון "מאצ\'ים"')
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  async function handleTestMatch() {
    if (!matchVenueId) return
    setBusy(true)
    const sKey = sessionKey(matchVenueId)
    addLog(`יוצר מאצ' בדיקה נועה ↔ יובל בוונה ${matchVenueId}...`)
    try {
      await seedTestCheckins(matchVenueId)
      await addDoc(collection(db, 'likes'), { from_user_id: 'test-1', to_user_id: 'test-6', venue_id: matchVenueId, session_key: sKey, is_active: true, created_at: serverTimestamp() })
      await addDoc(collection(db, 'likes'), { from_user_id: 'test-6', to_user_id: 'test-1', venue_id: matchVenueId, session_key: sKey, is_active: true, created_at: serverTimestamp() })
      await addDoc(collection(db, 'matches'), {
        user1_id: 'test-1', user2_id: 'test-6',
        user1_name: 'נועה', user2_name: 'יובל',
        user1_photo: 'https://randomuser.me/api/portraits/women/44.jpg',
        user2_photo: 'https://randomuser.me/api/portraits/men/32.jpg',
        venue_id: matchVenueId,
        venue_name: venues.find(v => v.id === matchVenueId)?.name || matchVenueId,
        session_key: sKey, is_active: true, created_at: serverTimestamp(),
        last_message: null, last_message_time: null,
      })
      addLog('✅ מאצ\' בדיקה נוצר — בדוק Firestore → matches')
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  async function handleAddVenue() {
    if (!form.name || !form.lat || !form.lng) { addLog('❌ שם, lat ו-lng הם חובה'); return }
    setBusy(true)
    try {
      const ref = await addDoc(collection(db, 'venues'), {
        name: form.name, name_en: form.name_en || form.name, city: form.city || '',
        lat: parseFloat(form.lat), lng: parseFloat(form.lng),
        geofence_radius: parseInt(form.radius) || 200, is_active: true, created_at: serverTimestamp(),
      })
      addLog(`✅ וונה נוספה! ID: ${ref.id}`)
      const updated = await getVenues()
      setVenues(updated)
      setForm({ name: '', name_en: '', city: '', lat: '', lng: '', radius: '200' })
    } catch (e) {
      addLog(`❌ שגיאה: ${e.message}`)
    } finally { setBusy(false) }
  }

  function downloadQR(venue) {
    const link = document.createElement('a')
    link.href = qrUrl(venue.id, 400)
    link.download = `qr-${venue.id}-${venue.name}.png`
    link.click()
  }

  function printQR(venue) {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>QR — ${venue.name}</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
      h1{font-size:28px;margin-bottom:8px;}p{color:#555;margin-bottom:20px;}
      img{width:300px;height:300px;border:8px solid #000;border-radius:16px;}
      small{margin-top:12px;color:#aaa;font-size:11px;}</style></head>
      <body><h1>${venue.name}</h1><p>${venue.city || ''}</p>
      <img src="${qrUrl(venue.id, 300)}" /><small>ID: ${venue.id}</small></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  const inputCls = "w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors"
  const btnPurple = "px-4 py-2 rounded-xl text-sm font-semibold bg-[hsl(290,100%,65%)] text-white hover:brightness-110 transition-all disabled:opacity-40"
  const btnGhost = "px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 text-white/60 hover:text-white transition-all disabled:opacity-40"

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="text-3xl">🛠</div>
        <div>
          <h1 className="text-xl font-black text-white">פאנל ניהול</h1>
          <p className="text-xs text-white/40">NightMatch Admin · Firebase: {FIREBASE_CONFIGURED ? '✅' : '❌'}</p>
        </div>
      </div>

      {/* Venue selector */}
      <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-3">
        <label className="text-xs text-white/40 uppercase tracking-wider">בחר וונה</label>
        <div className="flex gap-2 flex-wrap">
          {venues.map(v => (
            <button key={v.id} onClick={() => { setSelected(v); setMatchVenueId(v.id) }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${selected?.id === v.id ? 'border-[hsl(290,100%,65%)] text-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['qr', '📲 QR קוד'], ['seed', '🧪 משתמשי בדיקה'], ['match', '💘 בדיקת מאצ׳'], ['add', '➕ וונה חדשה']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap ${tab === key ? 'border-[hsl(290,100%,65%)] text-[hsl(290,100%,65%)] bg-[hsl(290,100%,65%,0.15)]' : 'border-white/15 text-white/50 glass-card'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* QR Tab */}
      {tab === 'qr' && selected && (
        <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <h2 className="text-white font-bold text-lg">{selected.name}</h2>
            <p className="text-white/40 text-sm">{selected.city} · ID: <span className="font-mono text-[hsl(290,100%,65%)]">{selected.id}</span></p>
          </div>
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(204,68,255,0.08)', border: '2px solid hsl(290,100%,65%,0.3)' }}>
              <img src={qrUrl(selected.id)} alt={`QR ${selected.name}`} className="w-52 h-52 rounded-xl" style={{ imageRendering: 'pixelated' }} />
            </div>
          </div>
          <p className="text-center text-white/40 text-xs">
            הסריקה מפנה ל-Check-in עם venue_id: <span className="font-mono text-white/60">{selected.id}</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => downloadQR(selected)} disabled={busy} className={btnPurple + ' flex-1'}>⬇ הורד</button>
            <button onClick={() => printQR(selected)} disabled={busy} className={btnGhost + ' flex-1'}>🖨 הדפס</button>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">כל הוונות</p>
            <div className="grid grid-cols-2 gap-3">
              {venues.map(v => (
                <div key={v.id} className="glass-card rounded-xl border border-white/10 p-3 text-center space-y-2">
                  <img src={qrUrl(v.id, 120)} alt={v.name} className="w-24 h-24 mx-auto rounded-lg" style={{ imageRendering: 'pixelated' }} />
                  <p className="text-xs text-white/70 font-medium leading-tight">{v.name}</p>
                  <p className="text-[10px] text-white/30 font-mono">{v.id}</p>
                  <div className="flex gap-1">
                    <button onClick={() => downloadQR(v)} className="flex-1 py-1 rounded-lg text-[11px] bg-[hsl(290,100%,65%,0.2)] text-[hsl(290,100%,65%)] border border-[hsl(290,100%,65%,0.3)]">⬇</button>
                    <button onClick={() => printQR(v)} className="flex-1 py-1 rounded-lg text-[11px] bg-white/5 text-white/50 border border-white/10">🖨</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seed Tab */}
      {tab === 'seed' && (
        <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <h2 className="text-white font-bold">משתמשי בדיקה</h2>
            <p className="text-white/40 text-sm">מוסיף 10 משתמשים מדומים (5♀ + 5♂) לוונה הנבחרת</p>
          </div>
          {selected && (
            <div className="bg-[hsl(290,100%,65%,0.08)] border border-[hsl(290,100%,65%,0.25)] rounded-xl p-3">
              <p className="text-sm text-white/70">📍 וונה: <span className="text-[hsl(290,100%,65%)] font-semibold">{selected.name}</span></p>
              <p className="text-xs text-white/40 mt-1 font-mono">session_key: {sessionKey(selected.id)}</p>
            </div>
          )}
          <p className="text-xs text-white/40">👩 נועה · שירה · מיכל · לירן · תמר &nbsp;·&nbsp; 👨 יובל · אלון · גל · רון · דניאל</p>
          <div className="flex gap-3">
            <button onClick={handleSeed} disabled={busy || !selected} className={btnPurple + ' flex-1'}>{busy ? '⏳' : '🌱'} זרע</button>
            <button onClick={handleClear} disabled={busy || !selected} className={btnGhost}>🗑 נקה</button>
          </div>
          <div className="text-xs text-white/40 bg-white/5 rounded-xl p-3 space-y-1">
            <p className="font-semibold text-white/60 mb-1">📌 הוראות בדיקה:</p>
            {['לחץ "זרע"', 'כנס עם Google', 'עשה Check-in לאותה וונה', 'עבור לפיד — תראה 10 אנשים', 'סוויפ ימינה לראות מאצ\''].map((s, i) => (
              <p key={i}>{i + 1}. {s}</p>
            ))}
          </div>
        </div>
      )}

      {/* Match Test Tab */}
      {tab === 'match' && (
        <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <h2 className="text-white font-bold">בדיקת מאצ'ים</h2>
            <p className="text-white/40 text-sm">יצירת לייקים הדדיים ומאצ'ים ישירות ב-Firestore</p>
          </div>
          <div className="bg-[hsl(185,100%,55%,0.08)] border border-[hsl(185,100%,55%,0.25)] rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white/80">⚡ מאצ' מהיר — נועה ↔ יובל</p>
            <select value={matchVenueId} onChange={e => setMatchVenueId(e.target.value)} className={inputCls}>
              {venues.map(v => <option key={v.id} value={v.id} style={{ background: '#1a0a2e' }}>{v.name} ({v.id})</option>)}
            </select>
            <button onClick={handleTestMatch} disabled={busy}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[hsl(185,100%,55%,0.2)] border border-[hsl(185,100%,55%,0.4)] text-[hsl(185,100%,55%)] disabled:opacity-40">
              {busy ? '⏳ יוצר...' : '💘 צור מאצ\' בדיקה'}
            </button>
          </div>
          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-sm font-semibold text-white/80">🎯 מאצ' ידני</p>
            <div>
              <label className="text-xs text-white/40 block mb-1">ה-UID שלך</label>
              <input value={user?.id || ''} readOnly className={inputCls + ' opacity-50'} />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">UID של הצד השני</label>
              <input value={matchUserId} onChange={e => setMatchUserId(e.target.value)} className={inputCls} placeholder="test-1 / UID מ-Firebase Auth" />
            </div>
            <select value={matchVenueId} onChange={e => setMatchVenueId(e.target.value)} className={inputCls}>
              {venues.map(v => <option key={v.id} value={v.id} style={{ background: '#1a0a2e' }}>{v.name} ({v.id})</option>)}
            </select>
            <button onClick={handleForceMatch} disabled={busy || !matchUserId.trim()} className={btnPurple + ' w-full'}>
              {busy ? '⏳' : '🔗'} צור לייקים הדדיים
            </button>
          </div>
        </div>
      )}

      {/* Add Venue Tab */}
      {tab === 'add' && (
        <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <h2 className="text-white font-bold">הוסף וונה חדשה</h2>
            <p className="text-white/40 text-sm">יוצר מסמך ב-Firestore — QR נבנה אוטומטי</p>
          </div>
          <div className="space-y-3">
            {[['name', 'שם הוונה (עברית) *', 'בר הנמל'], ['name_en', 'שם (אנגלית)', 'Port Bar'], ['city', 'עיר', 'תל אביב'], ['lat', 'Latitude *', '32.0853'], ['lng', 'Longitude *', '34.7818'], ['radius', 'רדיוס גאופנס (מ\')', '200']].map(([key, label, ph]) => (
              <div key={key}>
                <label className="block text-xs text-white/40 mb-1">{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-xs text-white/40">
            🗺 לקואורדינטות: <span className="text-[hsl(290,100%,65%)]">maps.google.com</span> → לחץ ימני → "What's here"
          </div>
          <button onClick={handleAddVenue} disabled={busy || !form.name || !form.lat || !form.lng} className={btnPurple + ' w-full'}>
            {busy ? '⏳ שומר...' : '➕ הוסף וונה ל-Firestore'}
          </button>
        </div>
      )}

      {/* Activity Log */}
      {log.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">לוג</p>
            <button onClick={() => setLog([])} className="text-xs text-white/30 hover:text-white/60">נקה</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {log.map((line, i) => (
              <p key={i} className={`text-xs font-mono ${line.includes('✅') ? 'text-green-400' : line.includes('❌') ? 'text-red-400' : 'text-white/50'}`}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Firebase checklist */}
      <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">הגדרות Firebase</p>
        <div className="space-y-2 text-xs text-white/60">
          {['Authentication → Google → Enable', 'Firestore → Rules → הדבק firestore.rules → Publish', 'Firestore → Indexes → matches (user1_id + is_active)', 'Firestore → Indexes → matches (user2_id + is_active)', 'Firestore → Indexes → checkins (session_key + is_active)'].map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="flex-none w-5 h-5 rounded-full bg-[hsl(290,100%,65%,0.2)] text-[hsl(290,100%,65%)] flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <a href="https://console.firebase.google.com/project/nightmatch-34424" target="_blank" rel="noreferrer"
          className="block text-center text-xs text-[hsl(290,100%,65%)] hover:underline">🔗 פתח Firebase Console →</a>
      </div>

      {/* Seed production venues */}
      <div className="glass-card rounded-2xl border border-yellow-400/20 p-4 space-y-3" style={{ background: 'rgba(255,200,0,0.04)' }}>
        <p className="text-xs text-yellow-400/70 font-mono uppercase tracking-wider">⚡ Quick Start</p>
        <p className="text-xs text-white/50">מזרים 8 וונות ייצור ל-Firestore (רק אם לא קיימות)</p>
        <button onClick={handleSeedVenues} disabled={busy} className="w-full py-2.5 rounded-xl text-xs font-semibold text-yellow-300 disabled:opacity-40"
          style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)' }}>
          {busy ? '⏳' : '🏙'} זרע וונות ייצור
        </button>
      </div>

      <div className="h-6" />
    </div>
  )
}
