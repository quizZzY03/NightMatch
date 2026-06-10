import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useApp } from '../context/AppContext'
import { checkIn as fbCheckIn, checkOut } from '../firebase/db'
import { seedTestCheckins, clearTestCheckins, clearUserLikesForSession } from '../utils/seedTestData'
import { sessionKey } from '../utils/geo'
import type { Venue } from '../types'

interface Checkin {
  id: string
  user_id: string
  user_name: string
  user_photo: string | null
  user_gender: string
  user_age: number
  tonight_status?: string
  is_test?: boolean
}

interface LogEntry { msg: string; ok: boolean; time: string }

interface Props { venues: Venue[] }

const btnCls = (color: string, disabled?: boolean) =>
  `flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`

export default function AdminTestPanel({ venues }: Props) {
  const { user, matches, refreshCheckin } = useApp()
  const navigate = useNavigate()

  const [selectedVenueId, setSelectedVenueId] = useState('rotch-rishon')
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  // Live checkins
  useEffect(() => {
    const sKey = sessionKey(selectedVenueId)
    const q = query(
      collection(db, 'checkins'),
      where('session_key', '==', sKey),
      where('is_active', '==', true)
    )
    return onSnapshot(q, snap => {
      setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin)))
    })
  }, [selectedVenueId])

  // Live matches count for selected venue session
  useEffect(() => {
    const sKey = sessionKey(selectedVenueId)
    const q = query(
      collection(db, 'matches'),
      where('session_key', '==', sKey),
      where('is_active', '==', true)
    )
    return onSnapshot(q, snap => setMatchCount(snap.size))
  }, [selectedVenueId])

  function addLog(msg: string, ok = true) {
    const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [{ msg, ok, time }, ...prev].slice(0, 30))
  }

  async function handleSeed() {
    setBusy('seed')
    try {
      const count = await seedTestCheckins(selectedVenueId)
      addLog(`נוספו ${count} משתמשי טסט ל-${selectedVenueId}`)
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  async function handleClear() {
    setBusy('clear')
    try {
      const count = await clearTestCheckins(selectedVenueId)
      addLog(`נמחקו ${count} צ'ק-אינים של טסט`)
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  async function handleSelfCheckIn() {
    if (!user) return
    setBusy('checkin')
    try {
      await fbCheckIn(selectedVenueId, user)
      refreshCheckin()
      const venueName = venues.find(v => v.id === selectedVenueId)?.name ?? selectedVenueId
      addLog(`צ'ק-אין ל-${venueName} בוצע`)
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  async function handleCheckOut() {
    if (!user) return
    setBusy('checkout')
    try {
      await checkOut(user.id)
      refreshCheckin()
      addLog('צ\'אאוט בוצע')
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  async function handleClearMyLikes() {
    if (!user) return
    setBusy('likes')
    try {
      const count = await clearUserLikesForSession(user.id, selectedVenueId)
      addLog(`נמחקו ${count} לייקים — הפיד יתרענן`)
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  async function handleClearAllMatches() {
    setBusy('matches')
    try {
      if (!user) return
      const snap1 = await getDocs(query(collection(db, 'matches'), where('user1_id', '==', user.id)))
      const snap2 = await getDocs(query(collection(db, 'matches'), where('user2_id', '==', user.id)))
      const all = [...snap1.docs, ...snap2.docs]
      await Promise.all(all.map(d => updateDoc(doc(db, 'matches', d.id), { is_active: false })))
      addLog(`בוטלו ${all.length} מאצ'ים`)
    } catch (e: unknown) {
      addLog(`שגיאה: ${(e as Error).message}`, false)
    } finally { setBusy(null) }
  }

  const venueOptions = [
    { id: 'rotch-rishon', name: 'רוטשילד 26 ראשון (טסט)' },
    ...venues.filter(v => v.id !== 'rotch-rishon').map(v => ({ id: v.id, name: v.name })),
  ]

  const iAmCheckedIn = checkins.some(c => c.user_id === user?.id)
  const testUsers = checkins.filter(c => c.is_test)
  const realUsers = checkins.filter(c => !c.is_test)

  return (
    <div className="space-y-5 pb-10" dir="rtl">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'צ\'ק-אינים', value: checkins.length, icon: '📍' },
          { label: 'מאצ\'ים', value: matchCount, icon: '💞' },
          { label: 'מאצ\'ים שלי', value: matches.length, icon: '💬' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-white/10 p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-xl mb-0.5">{stat.icon}</div>
            <div className="text-xl font-black text-white">{stat.value}</div>
            <div className="text-[10px] text-white/35 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Venue selector */}
      <div className="space-y-2">
        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">וונה פעילה לטסט</label>
        <select
          value={selectedVenueId}
          onChange={e => setSelectedVenueId(e.target.value)}
          className="w-full bg-white/5 border border-white/12 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-[hsl(290,100%,65%)] transition-colors"
          style={{ direction: 'rtl' }}
        >
          {venueOptions.map(v => (
            <option key={v.id} value={v.id} style={{ background: '#0d0d1a' }}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">פעולות</label>

        {/* Row 1 */}
        <div className="flex gap-2">
          <button
            onClick={handleSelfCheckIn}
            disabled={!!busy || iAmCheckedIn}
            className={btnCls('purple', !!busy || iAmCheckedIn)}
            style={{ background: 'linear-gradient(135deg, hsl(270,80%,50%), hsl(290,100%,45%))' }}
          >
            {busy === 'checkin' ? <Spinner /> : iAmCheckedIn ? '✓ מחובר' : '📍 צ\'ק-אין שלי'}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!!busy || !iAmCheckedIn}
            className={btnCls('', !!busy || !iAmCheckedIn)}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {busy === 'checkout' ? <Spinner /> : '↩ צ\'אאוט'}
          </button>
        </div>

        {/* Row 2 */}
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={!!busy}
            className={btnCls('green', !!busy)}
            style={{ background: 'linear-gradient(135deg, hsl(145,70%,35%), hsl(160,80%,30%))' }}
          >
            {busy === 'seed' ? <Spinner /> : '👥 הוסף 16 טסט'}
          </button>
          <button
            onClick={handleClear}
            disabled={!!busy}
            className={btnCls('red', !!busy)}
            style={{ background: 'rgba(255,60,60,0.2)', border: '1px solid rgba(255,80,80,0.3)' }}
          >
            {busy === 'clear' ? <Spinner /> : '🗑 נקה טסט'}
          </button>
        </div>

        {/* Row 3 */}
        <div className="flex gap-2">
          <button
            onClick={handleClearMyLikes}
            disabled={!!busy}
            className={btnCls('', !!busy)}
            style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.2)' }}
          >
            {busy === 'likes' ? <Spinner /> : '↺ אפס לייקים שלי'}
          </button>
          <button
            onClick={handleClearAllMatches}
            disabled={!!busy}
            className={btnCls('', !!busy)}
            style={{ background: 'rgba(255,100,100,0.12)', border: '1px solid rgba(255,100,100,0.2)' }}
          >
            {busy === 'matches' ? <Spinner /> : '💔 מחק מאצ\'ים'}
          </button>
        </div>
      </div>

      {/* Quick nav */}
      <div className="space-y-2">
        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">ניווט מהיר לבדיקה</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'פיד', icon: '🔥', path: '/feed' },
            { label: 'מאצ\'ים', icon: '💞', path: '/matches' },
            { label: 'פרופיל', icon: '👤', path: '/profile' },
            { label: 'צ\'ק-אין', icon: '📍', path: '/checkin' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 py-3 px-2 transition-all active:scale-95 hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] text-white/50 font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live checkins monitor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">
            מי בפנים עכשיו
          </label>
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            live
          </div>
        </div>

        {checkins.length === 0 ? (
          <div className="rounded-2xl border border-white/8 p-6 text-center text-white/25 text-sm"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            אין צ'ק-אינים פעילים בוונה זו
          </div>
        ) : (
          <div className="space-y-1">
            {realUsers.length > 0 && (
              <p className="text-[10px] text-white/30 px-1 mb-1">משתמשים אמיתיים ({realUsers.length})</p>
            )}
            {realUsers.map(c => <CheckinRow key={c.id} c={c} isMe={c.user_id === user?.id} />)}
            {testUsers.length > 0 && (
              <p className="text-[10px] text-white/25 px-1 mt-2 mb-1">משתמשי טסט ({testUsers.length})</p>
            )}
            {testUsers.map(c => <CheckinRow key={c.id} c={c} isMe={false} />)}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">לוג פעולות</label>
          {log.length > 0 && (
            <button onClick={() => setLog([])} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">
              נקה
            </button>
          )}
        </div>
        <div ref={logRef} className="rounded-2xl border border-white/8 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }}>
          {log.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-4 font-mono">אין פעולות עדיין</p>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              <AnimatePresence initial={false}>
                {log.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 px-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-[10px] text-white/20 font-mono shrink-0 mt-0.5 w-16 text-left">{entry.time}</span>
                    <span className={`text-xs font-medium leading-snug ${entry.ok ? 'text-green-300' : 'text-red-300'}`}>
                      {entry.ok ? '✓' : '✗'} {entry.msg}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckinRow({ c, isMe }: { c: Checkin; isMe: boolean }) {
  const genderColor = c.user_gender === 'female' ? 'hsl(320,80%,55%)' : c.user_gender === 'male' ? 'hsl(210,80%,55%)' : 'hsl(145,60%,45%)'
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
      style={{ background: isMe ? 'rgba(150,80,255,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(150,80,255,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden"
        style={{ background: genderColor, border: `1.5px solid ${genderColor}40` }}>
        {c.user_photo
          ? <img src={c.user_photo} alt={c.user_name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
              {c.user_name?.[0] ?? '?'}
            </div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">{c.user_name}</span>
          <span className="text-xs text-white/40">{c.user_age}</span>
          {isMe && <span className="text-[9px] bg-purple-500/30 text-purple-300 rounded-full px-1.5 py-0.5 font-bold">אני</span>}
        </div>
        {c.tonight_status && (
          <p className="text-[10px] text-white/35 truncate mt-0.5">{c.tonight_status}</p>
        )}
      </div>
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-400"
        style={{ boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
      />
    </div>
  )
}
