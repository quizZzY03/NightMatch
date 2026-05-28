import { useCallback } from 'react'
import type { Lang } from '../types'

interface PushNotificationsHook {
  requestPermission: () => Promise<boolean>
  notify: (title: string, body: string, icon?: string) => Promise<void>
  notifyMatch: (name: string, lang?: Lang) => Promise<void>
  schedulePreResetNotification: (lang?: Lang) => void
}

export function usePushNotifications(): PushNotificationsHook {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }, [])

  const notify = useCallback(async (title: string, body: string, icon?: string): Promise<void> => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const iconUrl = icon ?? '/icon-192.png'
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          void reg.showNotification(title, { body, icon: iconUrl, badge: iconUrl, vibrate: [200, 100, 200] })
          return
        }
      }
      new Notification(title, { body, icon: iconUrl })
    } catch {}
  }, [])

  const notifyMatch = useCallback(async (name: string, lang: Lang = 'he'): Promise<void> => {
    const title = lang === 'he' ? `🔥 מאץ' חדש!` : '🔥 New Match!'
    const body = lang === 'he' ? `התאמת עם ${name}` : `You matched with ${name}`
    await notify(title, body)
  }, [notify])

  // Schedule a notification at 05:00 (1 hour before session resets at 06:00)
  const schedulePreResetNotification = useCallback((lang: Lang = 'he'): void => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const now = new Date()
    const target = new Date()
    target.setHours(5, 0, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const msUntil = target.getTime() - now.getTime()
    window.setTimeout(() => {
      const title = lang === 'he' ? '⏰ שעה אחרונה הלילה!' : '⏰ Last hour tonight!'
      const body = lang === 'he' ? 'הסשן מאופס ב-06:00 — תנצל/י את הזמן' : 'Session resets at 06:00 — make the most of it'
      void notify(title, body)
    }, msUntil)
  }, [notify])

  return { requestPermission, notify, notifyMatch, schedulePreResetNotification }
}
