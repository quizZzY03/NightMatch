import { useCallback } from 'react'

export function usePushNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }, [])

  const notify = useCallback(async (title, body, icon) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(title, { body, icon: icon || '/icon.svg', badge: '/icon.svg', vibrate: [200, 100, 200] })
    } catch {}
  }, [])

  const notifyMatch = useCallback(async (name, lang = 'he') => {
    const title = lang === 'he' ? `🔥 מאץ' חדש!` : '🔥 New Match!'
    const body = lang === 'he' ? `התאמת עם ${name}` : `You matched with ${name}`
    await notify(title, body)
  }, [notify])

  return { requestPermission, notify, notifyMatch }
}
