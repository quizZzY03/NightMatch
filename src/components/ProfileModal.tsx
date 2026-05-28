import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { blockUser, reportUser } from '../firebase/db'
import type { FeedPerson } from '../types'

interface Props {
  person: FeedPerson
  onClose: () => void
  onLike: (p: FeedPerson) => void
  onPass: (p: FeedPerson) => void
  onBlock?: (p: FeedPerson) => void
  currentUserId?: string
  lang: string
}

export default function ProfileModal({ person, onClose, onLike, onPass, onBlock, currentUserId, lang }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const photos = [person.photo1_url, person.photo2_url, person.photo3_url].filter(Boolean) as string[]

  function handleLike() { onLike(person); onClose() }
  function handlePass() { onPass(person); onClose() }

  async function handleBlock() {
    if (!currentUserId) return
    if (!window.confirm(lang === 'he' ? 'לחסום משתמש זה?' : 'Block this user?')) return
    await blockUser(currentUserId, person.id)
    onBlock?.(person)
    onClose()
  }

  async function handleReport() {
    if (!currentUserId || !reportReason.trim()) return
    await reportUser(currentUserId, person.id, reportReason.trim())
    setShowReport(false)
    setReportReason('')
    alert(lang === 'he' ? 'הדיווח נשלח. תודה.' : 'Report sent. Thank you.')
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        key="modal"
        className="fixed z-50 rounded-[28px] overflow-hidden flex flex-col"
        style={{ inset: '48px 10px 10px' }}
        initial={{ scale: 0.88, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Photo section ── */}
        <div className="relative flex-[3] bg-black min-h-0">
          {photos.length > 0 ? (
            <img
              key={photoIdx}
              src={photos[photoIdx]}
              alt={person.display_name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(290,100%,30%)] to-[hsl(185,100%,20%)]" />
          )}

          {/* Progress bars */}
          {photos.length > 1 && (
            <div className="absolute top-3 inset-x-3 flex gap-1.5 z-10">
              {photos.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: i < photoIdx ? '100%' : '0%' }}
                    animate={{ width: i === photoIdx ? '100%' : i < photoIdx ? '100%' : '0%' }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tap zones — left=prev, right=next (physical, not RTL-dependent) */}
          <div className="absolute inset-0 flex z-10">
            <div className="flex-1 cursor-pointer"
              onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
            <div className="flex-1 cursor-pointer"
              onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            <span className="text-white text-base font-bold">✕</span>
          </button>

          {/* ⋯ menu */}
          {currentUserId && (
            <div className="absolute top-3 left-3 z-20">
              <button onClick={() => setShowMenu(v => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xl"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                ⋯
              </button>
              {showMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-10 left-0 rounded-2xl overflow-hidden min-w-[140px] shadow-2xl"
                  style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <button onClick={() => { setShowMenu(false); setShowReport(true) }}
                    className="w-full px-4 py-3 text-sm text-left text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2">
                    🚩 {lang === 'he' ? 'דווח' : 'Report'}
                  </button>
                  <button onClick={() => { setShowMenu(false); handleBlock() }}
                    className="w-full px-4 py-3 text-sm text-left text-orange-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                    🚫 {lang === 'he' ? 'חסום' : 'Block'}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#07070f] to-transparent pointer-events-none" />

          {/* Name overlay */}
          <div className="absolute bottom-4 inset-x-5 pointer-events-none" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">{person.display_name}</h2>
              <span className="text-2xl font-bold text-white/70 mb-0.5">{person.age}</span>
              <span className="w-3 h-3 bg-green-400 rounded-full mb-1"
                style={{ boxShadow: '0 0 8px rgba(74,222,128,0.9)' }} />
            </div>
          </div>
        </div>

        {/* ── Info section ── */}
        <div className="flex-[2] bg-[#07070f] flex flex-col min-h-0" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-3">
            {/* Bio */}
            {person.bio && (
              <p className="text-sm text-white/75 leading-relaxed">{person.bio}</p>
            )}

            {/* Status badge */}
            {person.tonight_status && (
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 border border-white/12"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <span className="text-sm text-white/85 font-medium">{person.tonight_status}</span>
              </div>
            )}

            {/* Here now */}
            <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <span className="animate-pulse">●</span>
              <span>{lang === 'he' ? 'כאן עכשיו' : 'Here now'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center justify-center gap-10 px-6 py-4 border-t border-white/8">
            <motion.button whileTap={{ scale: 0.82 }} onClick={handlePass}
              className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-red-400/40 hover:border-red-400 transition-colors"
              style={{ background: 'rgba(248,113,113,0.08)', boxShadow: '0 4px 24px rgba(248,113,113,0.12)' }}>
              <span className="text-red-400 text-3xl">✕</span>
            </motion.button>

            <motion.button whileTap={{ scale: 0.82 }} onClick={handleLike}
              className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-green-400/40 hover:border-green-400 transition-colors"
              style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%,0.18), hsl(320,100%,60%,0.18))', boxShadow: '0 4px 24px rgba(74,222,128,0.15)' }}>
              <span className="text-green-400 text-3xl">♥</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
      {/* Report dialog */}
      {showReport && (
        <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-6"
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
                {lang === 'he' ? 'שלח' : 'Send'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
