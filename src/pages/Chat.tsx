import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import Avatar from '../components/Avatar'
import { CountdownTimerCompact } from '../components/CountdownTimer'
import { getMatchById } from '../utils/storage'
import { listenMessages, sendMessage, unmatchUser, blockUser, reportUser } from '../firebase/db'
import type { Match, Message } from '../types'

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>()
  const { lang, user, isRTL, matches } = useApp()
  const navigate = useNavigate()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showReport, setShowReport] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Firebase matches are in AppContext state; demo/local matches are in localStorage
    const m = matches.find(m => m.id === matchId) || getMatchById(matchId)
    if (m) setMatch(m)
  }, [matchId, matches])

  useEffect(() => {
    const unsub = listenMessages(matchId, setMsgs, user?.id)
    return unsub
  }, [matchId, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const otherName = match ? (match.user1_id === user?.id ? match.user2_name : match.user1_name) : ''
  const otherPhoto = match ? (match.user1_id === user?.id ? match.user2_photo : match.user1_photo) : ''

  async function handleSend(msgText?: string): Promise<void> {
    const content = msgText || text.trim()
    if (!content || !user || !matchId) return
    setText('')
    const msg = await sendMessage(matchId, content, user.id, user.display_name)
    // Optimistic update — real-time listener will also fire in Firebase mode
    if (msg) setMsgs(prev => [...prev, msg])
  }

  async function handleUnmatch() {
    if (!matchId || !window.confirm(lang === 'he' ? 'לבטל את ההתאמה?' : 'Unmatch this person?')) return
    await unmatchUser(matchId)
    navigate('/matches')
  }

  async function handleBlock() {
    if (!user || !match) return
    const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
    if (!window.confirm(lang === 'he' ? 'לחסום משתמש זה?' : 'Block this user?')) return
    await blockUser(user.id, otherId)
    await unmatchUser(matchId!)
    navigate('/matches')
  }

  async function handleReport() {
    if (!user || !match || !reportReason.trim()) return
    const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
    await reportUser(user.id, otherId, reportReason.trim())
    setShowReport(false)
    setReportReason('')
    alert(lang === 'he' ? 'הדיווח נשלח. תודה.' : 'Report sent. Thank you.')
  }

  function shareInstagram() {
    const handle = user?.instagram_handle
    if (!handle) return alert(lang === 'he' ? 'הוסף אינסטגרם בפרופיל שלך' : 'Add your Instagram in profile')
    handleSend(`📸 Instagram: @${handle}`)
  }

  if (!match) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-white/30">{lang === 'he' ? 'טוען...' : 'Loading...'}</div>
    </div>
  )

  return (
    <div className="h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="glass-card border-b border-white/10 rounded-none px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/matches')}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-2xl active:scale-90">
          {isRTL ? '›' : '‹'}
        </button>
        <Avatar src={otherPhoto} name={otherName} size="sm" online />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-sm truncate">{otherName}</h2>
          {match.venue_name && <p className="text-xs text-white/30 truncate">📍 {match.venue_name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-white/30">⏱</span>
          <CountdownTimerCompact />
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg">
              ⋯
            </button>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-9 right-0 z-50 rounded-2xl overflow-hidden min-w-[160px] shadow-2xl"
                style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.12)' }}>
                <button onClick={() => { setShowMenu(false); handleUnmatch() }}
                  className="w-full px-4 py-3 text-sm text-left text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                  💔 {lang === 'he' ? 'בטל התאמה' : 'Unmatch'}
                </button>
                <button onClick={() => { setShowMenu(false); setShowReport(true) }}
                  className="w-full px-4 py-3 text-sm text-left text-white/50 hover:bg-white/5 transition-colors flex items-center gap-2">
                  🚩 {lang === 'he' ? 'דווח' : 'Report'}
                </button>
                <button onClick={() => { setShowMenu(false); handleBlock() }}
                  className="w-full px-4 py-3 text-sm text-left text-orange-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                  🚫 {lang === 'he' ? 'חסום' : 'Block'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Report dialog */}
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6"
          onClick={() => setShowReport(false)}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl p-5 space-y-3"
            style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white">{lang === 'he' ? 'דיווח על משתמש' : 'Report User'}</h3>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={3}
              placeholder={lang === 'he' ? 'תאר את הסיבה...' : 'Describe the reason...'}
              className="w-full rounded-xl px-3 py-2 text-sm text-white bg-white/5 border border-white/15 outline-none focus:border-[hsl(290,100%,65%)] resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10">
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
              <button onClick={handleReport} disabled={!reportReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))' }}>
                {lang === 'he' ? 'שלח דיווח' : 'Send Report'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Match banner */}
      <div className="glass-card border-b border-[hsl(290,100%,65%,0.2)] rounded-none px-4 py-2 text-center shrink-0"
        style={{ background: 'linear-gradient(90deg, hsl(290,100%,65%,0.1), hsl(320,100%,60%,0.1))' }}>
        <p className="text-xs text-white/50">
          🔥 {lang === 'he'
            ? <>{`התאמתם הלילה ב`}<span className="text-[hsl(290,100%,65%)]">{match.venue_name || 'הלילה'}</span></>
            : <>{'You matched at '}<span className="text-[hsl(290,100%,65%)]">{match.venue_name || 'tonight'}</span></>
          }
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-area scrollbar-hide px-4 py-3 space-y-2">
        {msgs.length === 0 && (
          <div className="text-center py-8 text-white/20 text-sm">
            {lang === 'he' ? '👋 שלח/י הודעה ראשונה!' : '👋 Send the first message!'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map(msg => {
            const isMe = msg.sender_id === user?.id
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium break-words ${isMe
                  ? 'text-white rounded-br-sm'
                  : 'glass-card border border-white/10 text-white/80 rounded-bl-sm'
                }`}
                  style={isMe ? { background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))', boxShadow: '0 4px 16px hsl(290,100%,65%,0.3)' } : {}}>
                  {msg.text}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick replies — always visible, scrollable */}
      <div className="px-3 pb-1 shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(t(lang, 'quickReplies') as string[]).map(qr => (
            <button key={qr} onClick={() => handleSend(qr)}
              className="shrink-0 text-xs glass-card border border-white/10 rounded-full px-3 py-1.5 text-white/60 hover:text-white hover:border-[hsl(290,100%,65%,0.5)] transition-colors whitespace-nowrap">
              {qr}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 glass-card border border-white/15 rounded-full px-4 py-2 focus-within:border-[hsl(290,100%,65%,0.5)] transition-colors relative">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={t(lang, 'typeMessage')}
            maxLength={500}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
          {text.length > 400 && (
            <span className={`shrink-0 text-[10px] font-medium ${text.length >= 490 ? 'text-red-400' : 'text-white/30'}`}>
              {text.length}/500
            </span>
          )}
        </div>
        <button onClick={shareInstagram}
          className="shrink-0 w-10 h-10 glass-card border border-white/10 rounded-full flex items-center justify-center text-lg hover:border-[hsl(290,100%,65%,0.5)] transition-colors"
          title={t(lang, 'shareInsta')}>
          📸
        </button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleSend()}
          disabled={!text.trim()}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ background: text.trim() ? 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))' : 'rgba(255,255,255,0.1)', boxShadow: text.trim() ? '0 0 12px hsl(290,100%,65%,0.4)' : 'none' }}>
          <span className="text-white text-lg">{isRTL ? '←' : '→'}</span>
        </motion.button>
      </div>
    </div>
  )
}
