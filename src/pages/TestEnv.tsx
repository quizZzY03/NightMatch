import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { checkIn as fbCheckIn } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { seedTestCheckins } from '../utils/seedTestData'

const TEST_VENUE_ID = 'rotch-rishon'
const TEST_VENUE_NAME = 'רוטשילד 26 ראשון'

type StepState = 'waiting' | 'running' | 'done' | 'error'

const STEP_LABELS = [
  '📍 צ׳ק-אין לסביבת הטסט',
  '👥 יוצר 10 משתמשי טסט',
  '✨ מעביר לפיד...',
]

export default function TestEnv() {
  const { user, refreshCheckin } = useApp()
  const navigate = useNavigate()
  const [steps, setSteps] = useState<StepState[]>(['waiting', 'waiting', 'waiting'])
  const [errorMsg, setErrorMsg] = useState('')
  const stepRef = useRef(0)

  function setStep(i: number, state: StepState) {
    setSteps(prev => prev.map((s, idx) => idx === i ? state : s))
  }

  useEffect(() => {
    if (!user) return

    async function run() {
      try {
        // Step 0 — check in
        stepRef.current = 0
        setStep(0, 'running')
        if (FIREBASE_CONFIGURED) await fbCheckIn(TEST_VENUE_ID, user!)
        refreshCheckin()
        setStep(0, 'done')

        // Step 1 — seed users
        stepRef.current = 1
        setStep(1, 'running')
        await seedTestCheckins(TEST_VENUE_ID)
        setStep(1, 'done')

        // Step 2 — navigate
        stepRef.current = 2
        setStep(2, 'running')
        setStep(2, 'done')
        setTimeout(() => navigate('/feed'), 600)
      } catch (e: unknown) {
        const idx = stepRef.current
        setStep(idx, 'error')
        const msg = e instanceof Error ? e.message : String(e)
        setErrorMsg(`שלב ${idx + 1}: ${msg}`)
        console.error('TestEnv setup failed at step', idx, e)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const failed = steps.some(s => s === 'error')

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="text-5xl mb-3">🧪</div>
        <h1 className="text-2xl font-black text-white mb-1">סביבת טסט</h1>
        <p className="text-white/40 text-sm">{TEST_VENUE_NAME}</p>
      </motion.div>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-3 mb-8">
        {STEP_LABELS.map((label, i) => {
          const state = steps[i]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: state === 'error'
                  ? 'rgba(255,50,50,0.15)'
                  : state === 'done'
                  ? 'rgba(100,255,150,0.1)'
                  : state === 'running'
                  ? 'rgba(200,100,255,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: state === 'error'
                  ? '1px solid rgba(255,80,80,0.4)'
                  : state === 'done'
                  ? '1px solid rgba(80,255,120,0.3)'
                  : state === 'running'
                  ? '1px solid rgba(200,100,255,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                {state === 'error' ? (
                  <span className="text-red-400 text-base">✕</span>
                ) : state === 'done' ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="text-green-400 text-base"
                  >✓</motion.span>
                ) : state === 'running' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-white/15" />
                )}
              </div>
              <span className={`text-sm font-medium ${
                state === 'error' ? 'text-red-300'
                : state === 'done' ? 'text-green-300'
                : state === 'running' ? 'text-white'
                : 'text-white/30'
              }`}>
                {label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Error state */}
      {failed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 w-full max-w-xs"
        >
          {errorMsg && (
            <p className="text-red-400/80 text-xs font-mono bg-red-950/30 rounded-xl px-3 py-2 text-right leading-relaxed">
              {errorMsg}
            </p>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="w-full px-6 py-2.5 rounded-xl text-sm font-bold text-white/70 border border-white/15 hover:border-white/30 transition-colors"
          >
            ← חזור לפרופיל
          </button>
        </motion.div>
      )}

      {!failed && steps.every(s => s === 'waiting') && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 0.6 }}
          className="text-white text-xs"
        >
          רצועת 🧪 תופיע בחלק העליון בכל מסך
        </motion.p>
      )}
    </div>
  )
}
