import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsQR from 'jsqr'
import type { Lang } from '../types'

interface Props {
  onScan: (venueId: string) => void
  onCancel: () => void
  lang: Lang
}

// Extract venue ID from raw QR data (plain ID or URL containing ?venue=ID or /checkin/ID)
function extractVenueId(raw: string): string {
  const trimmed = raw.trim()
  return (
    trimmed.match(/[?&]venue=([^&]+)/)?.[1] ||
    trimmed.match(/\/checkin\/([^/?]+)/)?.[1] ||
    trimmed
  )
}

// BarcodeDetector is available on Chrome Android 83+ and Safari 17+
const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

export default function QRScanner({ onScan, onCancel, lang }: Props) {
  const he = lang === 'he'
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<unknown>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualId, setManualId] = useState('')

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // ── BarcodeDetector (native — most reliable on mobile) ──────────────────────
  async function tryBarcodeDetector(video: HTMLVideoElement): Promise<boolean> {
    if (!hasBarcodeDetector) return false
    try {
      // @ts-expect-error BarcodeDetector not yet in TS lib
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
      return true
    } catch {
      return false
    }
  }

  async function scanWithDetector(video: HTMLVideoElement): Promise<void> {
    if (!detectorRef.current) return
    try {
      // @ts-expect-error BarcodeDetector not yet in TS lib
      const codes = await (detectorRef.current as { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }).detect(video)
      if (codes.length > 0) {
        stopCamera()
        onScan(extractVenueId(codes[0].rawValue))
        return
      }
    } catch { /* ignore */ }
    rafRef.current = requestAnimationFrame(() => scanWithDetector(video))
  }

  // ── jsQR fallback ───────────────────────────────────────────────────────────
  function scanWithJsQR(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(() => scanWithJsQR(video, canvas))
      return
    }
    const ctx = canvas.getContext('2d')!
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // attemptBoth handles both normal AND inverted/dark QR codes
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (code?.data) {
      stopCamera()
      onScan(extractVenueId(code.data))
      return
    }
    rafRef.current = requestAnimationFrame(() => scanWithJsQR(video, canvas))
  }

  // ── Camera startup ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        streamRef.current = stream
        const video = videoRef.current!
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
        setStatus('scanning')

        const useNative = await tryBarcodeDetector(video)
        if (useNative) {
          scanWithDetector(video)
        } else {
          scanWithJsQR(video, canvasRef.current!)
        }
      } catch (e) {
        setStatus('error')
        const err = e as { name?: string }
        setErrorMsg(
          err.name === 'NotAllowedError'
            ? (he ? 'נדרשת הרשאת מצלמה — אשר בהגדרות הדפדפן' : 'Camera permission required — allow in browser settings')
            : (he ? 'לא ניתן לפתוח מצלמה' : 'Cannot open camera')
        )
        // Show manual entry automatically on camera error
        setTimeout(() => setShowManual(true), 800)
      }
    }

    startCamera()
    return stopCamera
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleManualSubmit() {
    const id = manualId.trim()
    if (!id) return
    stopCamera()
    onScan(id)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay */}
        <div className="absolute inset-0">
          {/* Scanning window */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-64 h-64">
            <div className="absolute inset-0" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }} />
            {/* Corner brackets */}
            {([
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
            ] as const).map((cls, i) => (
              <div key={i} className={`absolute w-10 h-10 ${cls}`}
                style={{ borderColor: 'hsl(290,100%,65%)' }} />
            ))}
            {/* Scanning line */}
            {status === 'scanning' && (
              <motion.div
                animate={{ y: [0, 240, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-2 right-2 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(290,100%,65%), hsl(320,100%,60%), transparent)' }}
              />
            )}
          </div>
        </div>

        {/* Status messages */}
        <div className="absolute bottom-[38%] left-0 right-0 text-center px-6">
          {status === 'starting' && (
            <p className="text-white/60 text-sm">{he ? 'פותח מצלמה...' : 'Starting camera...'}</p>
          )}
          {status === 'scanning' && (
            <p className="text-white/70 text-sm font-medium">
              {he ? 'כוון את המצלמה לQR של האירוע' : 'Point camera at the event QR code'}
            </p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm font-medium">⚠️ {errorMsg}</p>
          )}
        </div>
      </div>

      {/* Bottom area */}
      <div className="bg-black/95 px-5 py-5 space-y-3 safe-bottom">

        {/* Manual entry toggle */}
        <AnimatePresence>
          {showManual && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="space-y-2"
            >
              <p className="text-white/40 text-xs text-center">
                {he ? 'או הזן את ID הוונה ידנית' : 'Or enter venue ID manually'}
              </p>
              <div className="flex gap-2">
                <input
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                  placeholder={he ? 'למשל: rotch-rishon' : 'e.g. rotch-rishon'}
                  autoFocus
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 outline-none focus:border-[hsl(290,100%,65%)] transition-colors"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualId.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 transition-all"
                  style={{ background: 'linear-gradient(135deg, hsl(290,100%,65%), hsl(320,100%,60%))' }}
                >
                  {he ? 'כנס' : 'Go'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowManual(v => !v)}
            className="text-white/40 hover:text-white/70 text-xs transition-colors py-2 underline"
          >
            {he
              ? (showManual ? 'הסתר הזנה ידנית' : 'הזנה ידנית ←')
              : (showManual ? 'Hide manual entry' : '← Manual entry')}
          </button>
          <button
            onClick={() => { stopCamera(); onCancel() }}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors py-2 px-5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {he ? 'ביטול' : 'Cancel'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
