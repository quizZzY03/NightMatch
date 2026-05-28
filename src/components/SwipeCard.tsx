import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { t } from '../utils/i18n'

const GENDER_COLORS = {
  female: 'from-[hsl(320,100%,40%)] to-[hsl(290,100%,35%)]',
  male: 'from-[hsl(210,100%,35%)] to-[hsl(185,100%,30%)]',
  other: 'from-[hsl(130,80%,30%)] to-[hsl(185,100%,30%)]',
}

export default function SwipeCard({ person, onLike, onPass, onSuperLike, onTap, isTop, index, lang }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-22, 22])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const passOpacity = useTransform(x, [-120, -30], [1, 0])
  const [dragging, setDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(() => !!sessionStorage.getItem('nm_dragged'))
  const didDragRef = useRef(false)

  const THRESHOLD = 110

  async function handleDragEnd(_, info) {
    setDragging(false)
    if (Math.abs(info.offset.x) > 8) didDragRef.current = true
    if (info.offset.x > THRESHOLD) {
      await animate(x, 650, { duration: 0.28 })
      onLike(person)
    } else if (info.offset.x < -THRESHOLD) {
      await animate(x, -650, { duration: 0.28 })
      onPass(person)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 320, damping: 22 })
    }
    setTimeout(() => { didDragRef.current = false }, 50)
  }

  const scale = isTop ? 1 : Math.max(0.88, 1 - index * 0.05)
  const yOffset = isTop ? 0 : index * 14
  const gradientClass = GENDER_COLORS[person.gender] || GENDER_COLORS.other

  return (
    <motion.div
      className="absolute inset-0 swipe-card"
      style={{ x, rotate, scale, zIndex: 10 - index, top: yOffset, transformOrigin: 'bottom center' }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      onDragStart={() => { setDragging(true); setHasDragged(true); didDragRef.current = false; sessionStorage.setItem('nm_dragged', '1') }}
      onDragEnd={handleDragEnd}
      onClick={() => { if (!didDragRef.current && onTap) onTap(person) }}
    >
      <div className="relative w-full h-full rounded-[28px] overflow-hidden"
        style={{ boxShadow: isTop ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' : '0 8px 24px rgba(0,0,0,0.4)' }}>

        {/* Photo or gradient avatar */}
        {person.photo1_url ? (
          <img src={person.photo1_url} alt={person.display_name}
            className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(290,100%,65%,0.08)] to-transparent" />

        {/* LIKE stamp — right swipe */}
        {isTop && (
          <motion.div style={{ opacity: likeOpacity }}
            className="absolute top-10 left-6 rotate-[-28deg] border-[3px] border-green-400 rounded-2xl px-4 py-1.5 pointer-events-none">
            <span className="text-green-400 font-black text-2xl tracking-[0.15em]"
              style={{ textShadow: '0 0 12px rgba(74,222,128,0.9)' }}>LIKE ♥</span>
          </motion.div>
        )}

        {/* NOPE stamp — left swipe */}
        {isTop && (
          <motion.div style={{ opacity: passOpacity }}
            className="absolute top-10 right-6 rotate-[28deg] border-[3px] border-red-400 rounded-2xl px-4 py-1.5 pointer-events-none">
            <span className="text-red-400 font-black text-2xl tracking-[0.15em]"
              style={{ textShadow: '0 0 12px rgba(248,113,113,0.9)' }}>NOPE ✗</span>
          </motion.div>
        )}


        {/* Info */}
        <div className="absolute bottom-0 inset-x-0 p-5 space-y-2">
          {/* Name + age */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-2xl font-black text-white tracking-tight">{person.display_name}</h2>
                <span className="text-xl font-bold text-white/70">{person.age}</span>
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full"
                  style={{ boxShadow: '0 0 6px rgba(74,222,128,0.9)' }} />
              </div>
              {person.bio && (
                <p className="text-sm text-white/60 leading-snug line-clamp-1">{person.bio}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          {person.tonight_status && (
            <div className="inline-flex items-center gap-2 glass-card border border-white/15 rounded-full px-3.5 py-1.5">
              <span className="text-xs text-white/80 font-medium">{person.tonight_status}</span>
            </div>
          )}

          {/* "כאן עכשיו" tag */}
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
            <span className="animate-pulse">●</span>
            <span>{t(lang, 'hereNow')}</span>
          </div>
        </div>

        {/* Drag hint — only on first card before first drag */}
        {isTop && !dragging && !hasDragged && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
              className="glass-card border border-white/10 rounded-full px-3 py-1 text-[10px] text-white/30 font-medium flex items-center gap-1.5">
              <motion.span animate={{ x: [0, 6, -6, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 2 }}>↔</motion.span>
              {lang === 'he' ? 'גרור לסווייפ' : 'drag to swipe'}
            </motion.div>
          </div>
        )}

        {/* Super like ring — shown via prop */}
        {isTop && dragging && (
          <motion.div
            className="absolute inset-0 rounded-[28px] pointer-events-none"
            animate={{ boxShadow: '0 0 0 3px rgba(250,204,21,0)' }}
          />
        )}
      </div>
    </motion.div>
  )
}
