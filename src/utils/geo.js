// ── Haversine distance (meters) ───────────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Get current GPS position ──────────────────────────────────────────────────
export function getPosition(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 'NO_SUPPORT', message: 'הדפדפן לא תומך ב-GPS' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => {
        const msgs = {
          1: 'נדחתה גישה ל-GPS — אפשר הרשאה בהגדרות',
          2: 'לא ניתן לאתר מיקום — נסה באזור פתוח',
          3: 'פג זמן איתור המיקום — נסה שוב',
        }
        reject({ code: err.code, message: msgs[err.code] || 'שגיאת GPS' })
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    )
  })
}

// ── Check if user is within venue geofence ────────────────────────────────────
export function isWithinGeofence(userLat, userLon, venue) {
  const dist = haversineDistance(userLat, userLon, venue.latitude, venue.longitude)
  return { within: dist <= venue.geofence_radius, distance: Math.round(dist) }
}

// ── Check operating hours (20:00 – 06:00) ────────────────────────────────────
export function isOperatingHours() {
  const h = new Date().getHours()
  return h >= 20 || h < 6
}

export function nextOpeningTime() {
  const now = new Date()
  const target = new Date()
  target.setHours(20, 0, 0, 0)
  if (now.getHours() >= 20) target.setDate(target.getDate() + 1)
  const diff = target - now
  const hh = Math.floor(diff / 3600000)
  const mm = Math.floor((diff % 3600000) / 60000)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// ── Daily session key (venue_id + today's date) ───────────────────────────────
export function todayKey() {
  const d = new Date()
  // If before 6 AM, count as previous night
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function sessionKey(venueId) {
  return `${venueId}::${todayKey()}`
}
