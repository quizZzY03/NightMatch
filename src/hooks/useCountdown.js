import { useState, useEffect } from 'react'

function getSecondsUntil6AM() {
  const now = new Date()
  const target = new Date()
  target.setHours(6, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return Math.floor((target - now) / 1000)
}

export function useCountdown() {
  const [seconds, setSeconds] = useState(getSecondsUntil6AM)

  useEffect(() => {
    const id = setInterval(() => setSeconds(getSecondsUntil6AM()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = n => String(n).padStart(2, '0')

  return { seconds, h, m, s, formatted: `${pad(h)}:${pad(m)}:${pad(s)}` }
}
