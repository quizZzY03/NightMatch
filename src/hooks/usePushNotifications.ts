import { useCallback } from 'react'
import type { Lang } from '../types'

interface PushNotificationsHook {
  requestPermission: () => Promise<boolean>
  notify: (title: string, body: string, icon?: string) => Promise<void>
  notifyMatch: (name: string, lang?: Lang) => Promise<void>
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

  return { requestPermission, notify, notifyMatch }
}
