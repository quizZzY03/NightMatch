import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {})

let _counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++_counter
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed top-4 inset-x-4 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl"
              style={{
                background: t.type === 'success'
                  ? 'linear-gradient(135deg, hsl(290,100%,40%), hsl(320,100%,35%))'
                  : t.type === 'error'
                  ? 'linear-gradient(135deg, #b91c1c, #9f1239)'
                  : 'rgba(30,12,60,0.97)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(16px)',
                boxShadow: t.type === 'success'
                  ? '0 8px 32px hsl(290,100%,40%,0.4)'
                  : '0 8px 32px rgba(0,0,0,0.5)',
              }}>
              <span className="text-base">
                {t.type === 'success' ? '✓' : t.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
