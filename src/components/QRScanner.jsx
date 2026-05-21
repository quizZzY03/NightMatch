import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import jsQR from 'jsqr'

export default function QRScanner({ onScan, onCancel, lang }) {
  const he = lang === 'he'
  const videoRef = useRef()
  const canvasRef = useRef()
  const rafRef = useRef()
  const streamRef = useRef()
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', true)
      await videoRef.current.play()
      setStatus('scanning')
      scanFrame()
    } catch (e) {
      setStatus('error')
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? (he ? 'נדרשת הרשאת מצלמה — אשר בדפדפן' : 'Camera permission required — allow in browser')
          : (he ? 'לא ניתן לפתוח מצלמה' : 'Cannot open camera')
      )
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code?.data) {
      stopCamera()
      // QR data can be a plain venue_id or a URL containing ?venue=ID
      const raw = code.data.trim()
      const fromUrl = raw.match(/[?&]venue=([^&]+)/)?.[1] || raw.match(/\/checkin\/([^/?]+)/)?.[1]
      onScan(fromUrl || raw)
      return
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Dark overlay with scanning window */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/55" />
          {/* Cutout hole effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-64 h-64">
            <div className="absolute inset-0 bg-transparent"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
            {/* Corner brackets */}
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-10 h-10 ${cls}`}
                style={{ borderColor: 'hsl(290,100%,65%)' }} />
            ))}
            {/* Scanning line */}
            {status === 'scanning' && (
              <motion.div
                animate={{ y: [0, 240, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-2 right-2 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(290,100%,65%), hsl(320,100%,60%), transparent)' }} />
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="absolute bottom-[40%] left-0 right-0 text-center">
          {status === 'starting' && (
            <p className="text-white/60 text-sm">{he ? 'פותח מצלמה...' : 'Starting camera...'}</p>
          )}
          {status === 'scanning' && (
            <p className="text-white/70 text-sm font-medium">
              {he ? 'כוון את המצלמה לQR של האירוע' : 'Point camera at the event QR code'}
            </p>
          )}
          {status === 'error' && (
            <div className="px-8">
              <p className="text-red-400 text-sm font-medium mb-2">⚠️ {errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-black px-6 py-6 flex flex-col items-center gap-3 safe-bottom">
        <p className="text-white/30 text-xs text-center">
          {he ? 'הQR קבוע — הסשן מתחלף אוטומטית כל לילה 🔄' : 'QR is permanent — session resets each night 🔄'}
        </p>
        <button onClick={onCancel}
          className="text-white/50 hover:text-white text-sm font-medium transition-colors py-2 px-6 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          {he ? 'ביטול' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
