import type { Venue } from '../types'

// ── Haversine distance (meters) ───────────────────────────────────────────────
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number): number => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface Position {
  lat: number
  lon: number
  accuracy: number
}

interface GpsError {
  code: number | string
  message: string
}

// ── Get current GPS position ──────────────────────────────────────────────────
export function getPosition(timeout = 10000): Promise<Position> {
  return new Promise((resolve, reject: (reason: GpsError) => void) => {
    if (!navigator.geolocation) {
      reject({ code: 'NO_SUPPORT', message: 'הדפדפן לא תומך ב-GPS' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => {
        const msgs: Record<number, string> = {
          1: 'נדחתה גישה ל-GPS — אפשר הרשאה בהגדרות',
          2: 'לא ניתן לאתר מיקום — נסה באזור פתוח',
          3: 'פג זמן איתור המיקום — נסה שוב',
        }
        reject({ code: err.code, message: msgs[err.code] ?? 'שגיאת GPS' })
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    )
  })
}

interface GeofenceResult {
  within: boolean
  distance: number
}

// ── Check if user is within venue geofence ────────────────────────────────────
export function isWithinGeofence(userLat: number, userLon: number, venue: Venue): GeofenceResult {
  const lat = venue.latitude ?? venue.lat ?? 0
  const lon = venue.longitude ?? venue.lng ?? 0
  const dist = haversineDistance(userLat, userLon, lat, lon)
  return { within: dist <= venue.geofence_radius, distance: Math.round(dist) }
}

// ── Check operating hours (20:00 – 06:00) ────────────────────────────────────
export function isOperatingHours(): boolean {
  const h = new Date().getHours()
  return h >= 20 || h < 6
}

export function nextOpeningTime(): string {
  const now = new Date()
  const target = new Date()
  target.setHours(20, 0, 0, 0)
  if (now.getHours() >= 20) target.setDate(target.getDate() + 1)
  const diff = target.getTime() - now.getTime()
  const hh = Math.floor(diff / 3600000)
  const mm = Math.floor((diff % 3600000) / 60000)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// ── Daily session key (venue_id + today's date) ───────────────────────────────
export function todayKey(): string {
  const d = new Date()
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function sessionKey(venueId: string): string {
  return `${venueId}::${todayKey()}`
}
