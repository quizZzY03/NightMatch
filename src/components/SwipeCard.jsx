import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { t } from '../utils/i18n'

const GENDER_COLORS = {
  female: 'from-[hsl(320,100%,40%)] to-[hsl(290,100%,35%)]',
  male: 'from-[hsl(210,100%,35%)] to-[hsl(185,100%,30%)]',
  other: 'from-[hsl(130,80%,30%)] to-[hsl(185,100%,30%)]',
}

export default function SwipeCard({ person, onLike, onPass, onSuperLike, isTop, index, lang }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-22, 22])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const passOpacity = useTransform(x, [-120, -30], [1, 0])
  const superOpacity = useTransform(y, [-120, -30], [1, 0])
  const [dragging, setDragging] = useState(false)

  const THRESHOLD = 110
  const SUPER_THRESHOLD = 100

  async function handleDragEnd(_, info) {
    setDragging(false)
    if (info.offset.y < -SUPER_THRESHOLD && Math.abs(info.offset.x) < 80) {
      await animate(y, -700, { duration: 0.28 })
      onSuperLike?.(person)
    } else if (info.offset.x > THRESHOLD) {
      await animate(x, 650, { duration: 0.28 })
      onLike(person)
    } else if (info.offset.x < -THRESHOLD) {
      await animate(x, -650, { duration: 0.28 })
      onPass(person)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 320, damping: 22 })
      animate(y, 0, { type: 'spring', stiffness: 320, damping: 22 })
    }
  }

  const scale = isTop ? 1 : Math.max(0.88, 1 - index * 0.05)
  const yOffset = isTop ? 0 : index * 14
  const gradientClass = GENDER_COLORS[person.gender] || GENDER_COLORS.other

  return (
    <motion.div
      className="absolute inset-0 swipe-card"
      style={{ x, y, rotate, scale, zIndex: 10 - index, top: yOffset, transformOrigin: 'bottom center' }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <div className="relative w-full h-full rounded-[28px] overflow-hidden"
        style={{ boxShadow: isTop ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' : '0 8px 24px rgba(0,0,0,0.4)' }}>

        {/* Photo or gradient avatar */}
        {person.photo1_url ? (
          <img src={person.photo1_url} alt={person.display_name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(290,100%,65%,0.08)] to-transparent" />

        {/* LIKE stamp */}
        {isTop && (
          <motion.div style={{ opacity: likeOpacity }}
            className="absolute top-10 left-6 rotate-[-28deg] border-[3px] border-green-400 rounded-2xl px-4 py-1.5 pointer-events-none">
            <span className="text-green-400 font-black text-2xl tracking-[0.15em]"
              style={{ textShadow: '0 0 12px rgba(74,222,128,0.9)' }}>LIKE ♥</span>
          </motion.div>
        )}

        {/* NOPE stamp */}
        {isTop && (
          <motion.div style={{ opacity: passOpacity }}
            className="absolute top-10 right-6 rotate-[28deg] border-[3px] border-red-400 rounded-2xl px-4 py-1.5 pointer-events-none">
            <span className="text-red-400 font-black text-2xl tracking-[0.15em]"
              style={{ textShadow: '0 0 12px rgba(248,113,113,0.9)' }}>NOPE ✗</span>
          </motion.div>
        )}

        {/* SUPER stamp */}
        {isTop && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[3px] rounded-2xl px-5 py-2 pointer-events-none"
            style={{ borderColor: 'hsl(45,100%,55%)', opacity: superOpacity }}>
            <span className="font-black text-2xl tracking-[0.15em]"
              style={{ color: 'hsl(45,100%,55%)', textShadow: '0 0 16px hsl(45,100%,55%,0.9)' }}>SUPER ⭐</span>
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

        {/* Subtle drag hint on first card */}
        {isTop && !dragging && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
            <div className="glass-card border border-white/10 rounded-full px-3 py-1 text-[10px] text-white/25 font-medium">
              {lang === 'he' ? 'גרור לסווייפ' : 'drag to swipe'}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
