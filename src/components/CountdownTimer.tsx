import { useCountdown } from '../hooks/useCountdown'
import { useApp } from '../context/AppContext'
import { t } from '../utils/i18n'

export function CountdownTimerCompact() {
  const { formatted } = useCountdown()
  return (
    <span className="font-mono text-[hsl(185,100%,55%)] font-bold tabular-nums" style={{ textShadow: '0 0 8px hsl(185,100%,55%,0.6)' }}>
      {formatted}
    </span>
  )
}

export default function CountdownTimer() {
  const { h, m, s } = useCountdown()
  const { lang } = useApp()
  const pad = n => String(n).padStart(2, '0')

  return (
    <div className="flex items-center gap-2 justify-center" dir="ltr">
      {[
        { val: pad(h), label: t(lang, 'hours') },
        { val: pad(m), label: t(lang, 'minutes') },
        { val: pad(s), label: t(lang, 'seconds') },
      ].map(({ val, label }, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="glass-card px-3 py-2 min-w-[52px] text-center">
            <span className="font-mono text-2xl font-bold text-[hsl(185,100%,55%)]" style={{ textShadow: '0 0 10px hsl(185,100%,55%,0.6)' }}>
              {val}
            </span>
          </div>
          <span className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  )
}
