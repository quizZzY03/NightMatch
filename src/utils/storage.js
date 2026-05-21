// localStorage-based data layer — swap with BASE 44 entity calls in production
const KEY = 'nightmatch_'

const get = (k) => { try { return JSON.parse(localStorage.getItem(KEY + k)) } catch { return null } }
const set = (k, v) => localStorage.setItem(KEY + k, JSON.stringify(v))
const del = (k) => localStorage.removeItem(KEY + k)

export const storage = { get, set, del }

// ── User / Auth ──────────────────────────────────────────────────────────────
export function getCurrentUser() { return get('user') }

export function saveUser(data) {
  const existing = get('user') || {}
  const updated = { ...existing, ...data, id: existing.id || crypto.randomUUID() }
  set('user', updated)
  return updated
}

export function signOut() { del('user') }

import { sessionKey, todayKey } from './geo.js'

// ── Venues (with GPS + geofence) ─────────────────────────────────────────────
const MOCK_VENUES = [
  { id: 'v1', name: 'בר הנמל', name_en: 'Port Bar', city: 'תל אביב', venue_type: 'bar', is_active: true, cover_image_url: null, active_count: 34, latitude: 32.0967, longitude: 34.7668, geofence_radius: 250 },
  { id: 'v2', name: 'קלאב הסנסציה', name_en: 'Sensation Club', city: 'תל אביב', venue_type: 'club', is_active: true, cover_image_url: null, active_count: 89, latitude: 32.0853, longitude: 34.7818, geofence_radius: 200 },
  { id: 'v3', name: 'חתונת כהן', name_en: 'Cohen Wedding', city: 'רמת גן', venue_type: 'wedding', is_active: true, cover_image_url: null, active_count: 120, latitude: 32.0824, longitude: 34.8137, geofence_radius: 500 },
  { id: 'v4', name: 'ערב פרייד', name_en: 'Pride Night', city: 'חיפה', venue_type: 'event', is_active: true, cover_image_url: null, active_count: 67, latitude: 32.8191, longitude: 34.9983, geofence_radius: 400 },
  { id: 'v5', name: 'רוף טופ בר', name_en: 'Rooftop Bar', city: 'ירושלים', venue_type: 'bar', is_active: true, cover_image_url: null, active_count: 22, latitude: 31.7683, longitude: 35.2137, geofence_radius: 200 },
]

export function getVenues() {
  const stored = get('venues')
  return stored || MOCK_VENUES
}

export function getVenueById(id) {
  return getVenues().find(v => v.id === id)
}

// ── CheckIn (session-based: venue + date) ────────────────────────────────────
export function getActiveCheckin() {
  const c = get('active_checkin')
  if (!c) return null
  // Auto-expire: if stored date ≠ today's night, clear it
  if (c.session_date !== todayKey()) {
    del('active_checkin')
    const user = get('user')
    if (user) set('user', { ...user, current_venue_id: null })
    return null
  }
  return c
}

export function checkIn(venueId, user) {
  const today = todayKey()
  const checkin = {
    id: crypto.randomUUID(),
    user_id: user.id,
    venue_id: venueId,
    session_date: today,           // ties this check-in to today's night session
    session_key: sessionKey(venueId), // unique per venue+date
    user_name: user.display_name,
    user_photo: user.photo1_url || null,
    is_active: true,
    created_at: Date.now(),
  }
  set('active_checkin', checkin)
  set('user', { ...user, current_venue_id: venueId })
  return checkin
}

export function checkOut() {
  del('active_checkin')
  const user = get('user')
  if (user) set('user', { ...user, current_venue_id: null })
}

// ── Feed (people at same venue) ───────────────────────────────────────────────
const MOCK_PEOPLE = [
  { id: 'p1', display_name: 'נועה', age: 24, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    tonight_status: 'פנויה לרומנטיקה 💞', bio: 'אוהבת ריקודים ויין טוב 🍷' },
  { id: 'p2', display_name: 'יובל', age: 27, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    tonight_status: 'כאן לבלות 🎉', bio: 'DJ בסופ"ש, מתכנת בשבוע 🎧' },
  { id: 'p3', display_name: 'מיכל', age: 22, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/68.jpg',
    tonight_status: 'מחפשת חברים חדשים 👥', bio: 'סטודנטית לאמנות 🎨' },
  { id: 'p4', display_name: 'אלון', age: 29, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/54.jpg',
    tonight_status: 'פנוי לכל מה שיבוא ✨', bio: 'שף ואוהב חיים 🍕' },
  { id: 'p5', display_name: 'שירה', age: 25, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/17.jpg',
    tonight_status: 'כאן לבלות 🎉', bio: 'רוקדת סלסה וטנגו 💃' },
  { id: 'p6', display_name: 'עמית', age: 31, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/11.jpg',
    tonight_status: 'סתם מסתכל 👀', bio: 'היי, מה נשמע? 😎' },
  { id: 'p7', display_name: 'לירן', age: 26, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/29.jpg',
    tonight_status: 'פנויה לרומנטיקה 💞', bio: 'יוגה, קפה ומוזיקה חיה ☕' },
  { id: 'p8', display_name: 'גל', age: 23, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/76.jpg',
    tonight_status: 'כאן לבלות 🎉', bio: 'ספורטאי ואוהב ים 🏄' },
  { id: 'p9', display_name: 'תמר', age: 28, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/90.jpg',
    tonight_status: 'פנויה לכל מה שיבוא ✨', bio: 'עורכת דין ביום, רוקדת בלילה 👩‍⚖️' },
  { id: 'p10', display_name: 'רון', age: 30, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/43.jpg',
    tonight_status: 'מחפש חברים חדשים 👥', bio: 'מטייל, צלם, שמח 📸' },
  { id: 'p11', display_name: 'אביגיל', age: 21, gender: 'female',
    photo1_url: 'https://randomuser.me/api/portraits/women/56.jpg',
    tonight_status: 'כאן לבלות 🎉', bio: 'בשנה א\' — לומדת לחיות 🎓' },
  { id: 'p12', display_name: 'דניאל', age: 33, gender: 'male',
    photo1_url: 'https://randomuser.me/api/portraits/men/88.jpg',
    tonight_status: 'פנוי לרומנטיקה 💞', bio: 'רופא ומגדל כלב 🐕' },
]

export function getFeedPeople(venueId, filter = 'all') {
  const user = getCurrentUser()
  const liked = get('liked_ids') || []
  const passed = get('passed_ids') || []
  const seen = [...liked, ...passed]
  return MOCK_PEOPLE.filter(p => {
    if (p.id === user?.id) return false
    if (seen.includes(p.id)) return false
    if (filter === 'male' && p.gender !== 'male') return false
    if (filter === 'female' && p.gender !== 'female') return false
    return true
  })
}

// ── Likes & Matches ───────────────────────────────────────────────────────────
export function likePerson(targetId) {
  const liked = get('liked_ids') || []
  set('liked_ids', [...liked, targetId])
  // Simulate 40% mutual like → create match
  if (Math.random() < 0.4) {
    return createMatch(targetId)
  }
  return null
}

export function passPerson(targetId) {
  const passed = get('passed_ids') || []
  set('passed_ids', [...passed, targetId])
}

function createMatch(targetId) {
  const user = getCurrentUser()
  const target = MOCK_PEOPLE.find(p => p.id === targetId)
  const checkin = getActiveCheckin()
  const venue = checkin ? getVenueById(checkin.venue_id) : null
  if (!target) return null
  const match = {
    id: crypto.randomUUID(),
    user1_id: user.id,
    user2_id: target.id,
    user1_name: user.display_name,
    user2_name: target.display_name,
    user1_photo: user.photo1_url,
    user2_photo: target.photo1_url,
    venue_id: checkin?.venue_id,
    venue_name: venue?.name || 'הלילה',
    chat_id: crypto.randomUUID(),
    is_active: true,
    created_at: Date.now(),
    last_message: null,
    last_message_time: null,
  }
  const matches = get('matches') || []
  set('matches', [match, ...matches])
  return match
}

export function getMatches() {
  return (get('matches') || []).filter(m => m.is_active)
}

export function getMatchById(id) {
  return getMatches().find(m => m.id === id)
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function getMessages(matchId) {
  return (get('msgs_' + matchId) || []).filter(m => m.is_active)
}

export function sendMessage(matchId, text, senderId, senderName) {
  const msg = { id: crypto.randomUUID(), match_id: matchId, sender_id: senderId, sender_name: senderName, text, type: 'text', is_active: true, created_at: Date.now() }
  const msgs = get('msgs_' + matchId) || []
  set('msgs_' + matchId, [...msgs, msg])
  // Update match last_message
  const matches = get('matches') || []
  set('matches', matches.map(m => m.id === matchId ? { ...m, last_message: text, last_message_time: Date.now() } : m))
  // Simulate reply after 2-4s
  setTimeout(() => {
    const match = getMatchById(matchId)
    if (!match) return
    const replies = ['😊', 'כן בטח!', 'נראה טוב 🔥', 'איפה אתה?', 'בוא נדבר!', '💃', 'יאללה!']
    const reply = replies[Math.floor(Math.random() * replies.length)]
    const replyMsg = { id: crypto.randomUUID(), match_id: matchId, sender_id: match.user2_id, sender_name: match.user2_name, text: reply, type: 'text', is_active: true, created_at: Date.now() }
    const cur = get('msgs_' + matchId) || []
    set('msgs_' + matchId, [...cur, replyMsg])
  }, 2000 + Math.random() * 2000)
  return msg
}

// ── Demo mode ────────────────────────────────────────────────────────────────
export function startDemo() {
  const today = todayKey()
  const venueId = 'v2' // קלאב הסנסציה

  const demoUser = {
    id: 'demo-user',
    display_name: 'אורח',
    age: 25,
    gender: 'male',
    bio: 'מצב דמו של NightMatch 🎮',
    tonight_status: 'כאן לבלות 🎉',
    preference: 'all',
    photo1_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    onboarding_complete: true,
    is_demo: true,
  }
  set('user', demoUser)

  const checkin = {
    id: 'demo-checkin',
    user_id: 'demo-user',
    venue_id: venueId,
    session_date: today,
    session_key: sessionKey(venueId),
    is_active: true,
    created_at: Date.now(),
  }
  set('active_checkin', checkin)

  // Reset swipe state for fresh demo
  del('liked_ids')
  del('passed_ids')
  del('super_likes')
  del('matches')

  // Seed 2 existing demo matches with chat history
  const match1 = {
    id: 'demo-match-1',
    user1_id: 'demo-user', user2_id: 'p5',
    user1_name: 'אורח', user2_name: 'שירה',
    user1_photo: demoUser.photo1_url,
    user2_photo: 'https://randomuser.me/api/portraits/women/17.jpg',
    venue_id: venueId, venue_name: 'קלאב הסנסציה',
    is_active: true, created_at: Date.now() - 600000,
    last_message: 'היי! 😊', last_message_time: Date.now() - 300000,
  }
  const match2 = {
    id: 'demo-match-2',
    user1_id: 'demo-user', user2_id: 'p7',
    user1_name: 'אורח', user2_name: 'לירן',
    user1_photo: demoUser.photo1_url,
    user2_photo: 'https://randomuser.me/api/portraits/women/29.jpg',
    venue_id: venueId, venue_name: 'קלאב הסנסציה',
    is_active: true, created_at: Date.now() - 1200000,
    last_message: '🔥 מה נשמע?', last_message_time: Date.now() - 900000,
  }
  set('matches', [match1, match2])

  // Seed chat messages for match1
  set('msgs_demo-match-1', [
    { id: 'm1', match_id: 'demo-match-1', sender_id: 'p5', sender_name: 'שירה', text: 'היי! 😊', type: 'text', is_active: true, created_at: Date.now() - 300000 },
    { id: 'm2', match_id: 'demo-match-1', sender_id: 'demo-user', sender_name: 'אורח', text: 'היי שירה! איך הלילה?', type: 'text', is_active: true, created_at: Date.now() - 260000 },
    { id: 'm3', match_id: 'demo-match-1', sender_id: 'p5', sender_name: 'שירה', text: 'ממש כיף! רוקד/ת? 💃', type: 'text', is_active: true, created_at: Date.now() - 220000 },
  ])

  return { user: demoUser, checkin }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function getLiveStats() {
  return { active_checkins: 847 + Math.floor(Math.random() * 10), active_matches: 203 + Math.floor(Math.random() * 5) }
}

// ── Super Likes ───────────────────────────────────────────────────────────────
const SUPER_LIKE_FREE_LIMIT = 3
// Codes stored as simple hashes (djb2) — validate server-side in production
const _h = s => [...s].reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)
const PREMIUM_HASHES = new Set([-1690018729, 1727293579, -1029576005]) // NIGHTVIP, NIGHTPASS1, FOUNDER

export function getSuperLikesUsed() {
  const data = get('super_likes') || {}
  if (data.date !== todayKey()) return 0
  return data.count || 0
}

export function useSuperLike() {
  const today = todayKey()
  const count = getSuperLikesUsed()
  set('super_likes', { date: today, count: count + 1 })
  return count + 1
}

export function canSuperLike(user) {
  if (user?.is_premium) return true
  return getSuperLikesUsed() < SUPER_LIKE_FREE_LIMIT
}

export function getSuperLikesRemaining(user) {
  if (user?.is_premium) return null // null = unlimited
  return Math.max(0, SUPER_LIKE_FREE_LIMIT - getSuperLikesUsed())
}

export function activatePremiumCode(code) {
  if (PREMIUM_HASHES.has(_h(code.trim().toUpperCase()))) {
    const user = getCurrentUser()
    if (user) set('user', { ...user, is_premium: true })
    return true
  }
  return false
}

export function superLikePerson(targetId) {
  const liked = get('liked_ids') || []
  set('liked_ids', [...liked, targetId])
  if (Math.random() < 0.6) return createMatch(targetId) // higher match chance for super like
  return null
}

// ── Daily flush ───────────────────────────────────────────────────────────────
export function resetForNewDay() {
  del('active_checkin')
  del('liked_ids')
  del('passed_ids')
  del('matches')
  del('super_likes')
  const user = getCurrentUser()
  if (user) set('user', { ...user, current_venue_id: null })
}
