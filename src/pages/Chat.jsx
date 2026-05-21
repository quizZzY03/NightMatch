import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'
import Avatar from '../components/Avatar'
import { CountdownTimerCompact } from '../components/CountdownTimer'
import { getMatchById } from '../utils/storage'
import { listenMessages, sendMessage } from '../firebase/db.js'

export default function Chat() {
  const { matchId } = useParams()
  const { lang, user, isRTL, matches } = useApp()
  const navigate = useNavigate()
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [match, setMatch] = useState(null)
  const bottomRef = useRef()

  useEffect(() => {
    // Firebase matches are in AppContext state; demo/local matches are in localStorage
    const m = matches.find(m => m.id === matchId) || getMatchById(matchId)
    if (m) setMatch(m)
  }, [matchId, matches])

  useEffect(() => {
    const unsub = listenMessages(matchId, setMsgs)
    return unsub
  }, [matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const otherName = match ? (match.user1_id === user?.id ? match.user2_name : match.user1_name) : ''
  const otherPhoto = match ? (match.user1_id === user?.id ? match.user2_photo : match.user1_photo) : ''

  async function handleSend(msgText) {
    const content = msgText || text.trim()
    if (!content || !user) return
    setText('')
    const msg = await sendMessage(matchId, content, user.id, user.display_name)
    // Optimistic update — real-time listener will also fire in Firebase mode
    if (msg) setMsgs(prev => [...prev, msg])
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
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-white/30">⏱</span>
          <CountdownTimerCompact />
        </div>
      </div>

      {/* Match banner */}
      <div className="glass-card border-b border-[hsl(290,100%,65%,0.2)] rounded-none px-4 py-2 text-center shrink-0"
        style={{ background: 'linear-gradient(90deg, hsl(290,100%,65%,0.1), hsl(320,100%,60%,0.1))' }}>
        <p className="text-xs text-white/50">
          🔥 {lang === 'he' ? `אתם מאצ׳ים מ` : 'You matched at'} <span className="text-[hsl(290,100%,65%)]">{match.venue_name}</span>
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

      {/* Quick replies */}
      <div className="px-3 pb-1 shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {t(lang, 'quickReplies').map(qr => (
            <button key={qr} onClick={() => handleSend(qr)}
              className="shrink-0 text-xs glass-card border border-white/10 rounded-full px-3 py-1.5 text-white/60 hover:text-white hover:border-white/30 transition-colors whitespace-nowrap">
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
