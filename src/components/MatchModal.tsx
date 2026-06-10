import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import NeonButton from './NeonButton'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'

export default function MatchModal({ match, onClose }) {
  const { lang, user } = useApp()
  const navigate = useNavigate()
  if (!match) return null

  const otherName = match.user1_id === user?.id ? match.user2_name : match.user1_name
  const otherPhoto = match.user1_id === user?.id ? match.user2_photo : match.user1_photo

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(16px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, y: 80, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass-card border border-white/15 p-8 mx-4 max-w-sm w-full text-center relative overflow-hidden"
        >
          {/* Animated glow rings */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, hsl(290,100%,65%,0.3) 0%, transparent 70%)' }} />
          </div>

          {/* It's a Match! */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="text-4xl mb-2">🔥</div>
            <h1 className="text-3xl font-black mb-1" style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t(lang, 'itsAMatch')}
            </h1>
            <p className="text-white/50 text-sm">{t(lang, 'matchSubtitle').replace('{name}', otherName)}</p>
          </motion.div>

          {/* Avatars */}
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            className="flex items-center justify-center gap-4 my-8">
            <div className="relative">
              <Avatar src={user?.photo1_url} name={user?.display_name} size="xl" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -inset-2 rounded-full border-2 border-[hsl(290,100%,65%,0.5)]" />
            </div>

            <motion.div animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }} transition={{ duration: 0.8, delay: 0.5 }}
              className="text-3xl">💫</motion.div>

            <div className="relative">
              <Avatar src={otherPhoto} name={otherName} size="xl" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className="absolute -inset-2 rounded-full border-2 border-[hsl(320,100%,60%,0.5)]" />
            </div>
          </motion.div>

          {/* Venue tag */}
          {match.venue_name && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-1.5 text-sm text-white/60 glass-card px-3 py-1.5 rounded-full mb-6 border border-white/10">
              <span>📍</span> {match.venue_name}
            </motion.div>
          )}

          {/* Actions */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex flex-col gap-3">
            <NeonButton variant="purple" size="lg" fullWidth onClick={() => { onClose(); navigate(`/chat/${match.id}`) }}>
              💬 {t(lang, 'startChat')}
            </NeonButton>
            <NeonButton variant="ghost" size="md" fullWidth onClick={onClose}>
              {t(lang, 'keepBrowsing')}
            </NeonButton>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
