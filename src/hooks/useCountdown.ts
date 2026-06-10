import { useState, useEffect } from 'react'

function getSecondsUntil6AM(): number {
  const now = new Date()
  const target = new Date()
  target.setHours(6, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return Math.floor((target.getTime() - now.getTime()) / 1000)
}

interface CountdownResult {
  seconds: number
  h: number
  m: number
  s: number
  formatted: string
}

export function useCountdown(): CountdownResult {
  const [seconds, setSeconds] = useState<number>(getSecondsUntil6AM)

  useEffect(() => {
    const id = setInterval(() => setSeconds(getSecondsUntil6AM()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number): string => String(n).padStart(2, '0')

  return { seconds, h, m, s, formatted: `${pad(h)}:${pad(m)}:${pad(s)}` }
}
