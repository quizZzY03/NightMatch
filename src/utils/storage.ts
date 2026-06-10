// localStorage-based data layer
import { sessionKey, todayKey } from './geo'
import type { User, Venue, Checkin, Match, Message, FeedPerson, Stats } from '../types'

const KEY = 'nightmatch_'

const get = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(KEY + k) ?? 'null') as T } catch { return null } }
const set = (k: string, v: unknown): void => localStorage.setItem(KEY + k, JSON.stringify(v))
const del = (k: string): void => localStorage.removeItem(KEY + k)

export const storage = { get, set, del }

// ── User / Auth ──────────────────────────────────────────────────────────────
export function getCurrentUser(): User | null { return get<User>('user') }

export function saveUser(data: Partial<User>): User {
  const existing = get<User>('user') ?? {}
  const updated = { ...existing, ...data, id: (existing as User).id || crypto.randomUUID() } as User
  set('user', updated)
  return updated
}

export function signOut(): void { del('user') }

// ── Venues (with GPS + geofence) ─────────────────────────────────────────────
const MOCK_VENUES: Venue[] = [
  { id: 'v1', name: 'בר הנמל', name_en: 'Port Bar', city: 'תל אביב', venue_type: 'bar', is_active: true, cover_image_url: null, active_count: 34, latitude: 32.0967, longitude: 34.7668, geofence_radius: 250 },
  { id: 'v2', name: 'קלאב הסנסציה', name_en: 'Sensation Club', city: 'תל אביב', venue_type: 'club', is_active: true, cover_image_url: null, active_count: 89, latitude: 32.0853, longitude: 34.7818, geofence_radius: 200 },
  { id: 'v3', name: 'חתונת כהן', name_en: 'Cohen Wedding', city: 'רמת גן', venue_type: 'wedding', is_active: true, cover_image_url: null, active_count: 120, latitude: 32.0824, longitude: 34.8137, geofence_radius: 500 },
  { id: 'v4', name: 'ערב פרייד', name_en: 'Pride Night', city: 'חיפה', venue_type: 'event', is_active: true, cover_image_url: null, active_count: 67, latitude: 32.8191, longitude: 34.9983, geofence_radius: 400 },
  { id: 'v5', name: 'רוף טופ בר', name_en: 'Rooftop Bar', city: 'ירושלים', venue_type: 'bar', is_active: true, cover_image_url: null, active_count: 22, latitude: 31.7683, longitude: 35.2137, geofence_radius: 200 },
]

export function getVenues(): Venue[] {
  const stored = get<Venue[]>('venues')
  return stored ?? MOCK_VENUES
}

export function getVenueById(id: string): Venue | undefined {
  return getVenues().find(v => v.id === id)
}

// ── CheckIn ───────────────────────────────────────────────────────────────────
export function getActiveCheckin(): Checkin | null {
  const c = get<Checkin>('active_checkin')
  if (!c) return null
  if (c.session_date !== todayKey()) {
    del('active_checkin')
    const user = get<User>('user')
    if (user) set('user', { ...user, current_venue_id: null })
    return null
  }
  return c
}

export function checkIn(venueId: string, user: User, venueData?: Pick<Venue, 'name' | 'city'> | null): Checkin {
  const today = todayKey()
  const checkin: Checkin = {
    id: crypto.randomUUID(),
    user_id: user.id,
    venue_id: venueId,
    venue_name: venueData?.name ?? null,
    venue_city: venueData?.city ?? null,
    session_date: today,
    session_key: sessionKey(venueId),
    user_name: user.display_name,
    user_photo: user.photo1_url ?? null,
    is_active: true,
    created_at: Date.now(),
  }
  set('active_checkin', checkin)
  set('user', { ...user, current_venue_id: venueId })
  return checkin
}

export function checkOut(): void {
  del('active_checkin')
  const user = get<User>('user')
  if (user) set('user', { ...user, current_venue_id: null })
}

// ── Feed ──────────────────────────────────────────────────────────────────────
const MOCK_PEOPLE: FeedPerson[] = [
  { id: 'p1', display_name: 'נועה', age: 24, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/44.jpg', tonight_status: 'פנויה לרומנטיקה 💞', bio: 'אוהבת ריקודים ויין טוב 🍷' },
  { id: 'p2', display_name: 'יובל', age: 27, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/32.jpg', tonight_status: 'כאן לבלות 🎉', bio: 'DJ בסופ"ש, מתכנת בשבוע 🎧' },
  { id: 'p3', display_name: 'מיכל', age: 22, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/68.jpg', tonight_status: 'מחפשת חברים חדשים 👥', bio: 'סטודנטית לאמנות 🎨' },
  { id: 'p4', display_name: 'אלון', age: 29, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/54.jpg', tonight_status: 'פנוי לכל מה שיבוא ✨', bio: 'שף ואוהב חיים 🍕' },
  { id: 'p5', display_name: 'שירה', age: 25, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/17.jpg', tonight_status: 'כאן לבלות 🎉', bio: 'רוקדת סלסה וטנגו 💃' },
  { id: 'p6', display_name: 'עמית', age: 31, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/11.jpg', tonight_status: 'סתם מסתכל 👀', bio: 'היי, מה נשמע? 😎' },
  { id: 'p7', display_name: 'לירן', age: 26, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/29.jpg', tonight_status: 'פנויה לרומנטיקה 💞', bio: 'יוגה, קפה ומוזיקה חיה ☕' },
  { id: 'p8', display_name: 'גל', age: 23, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/76.jpg', tonight_status: 'כאן לבלות 🎉', bio: 'ספורטאי ואוהב ים 🏄' },
  { id: 'p9', display_name: 'תמר', age: 28, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/90.jpg', tonight_status: 'פנויה לכל מה שיבוא ✨', bio: 'עורכת דין ביום, רוקדת בלילה 👩‍⚖️' },
  { id: 'p10', display_name: 'רון', age: 30, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/43.jpg', tonight_status: 'מחפש חברים חדשים 👥', bio: 'מטייל, צלם, שמח 📸' },
  { id: 'p11', display_name: 'אביגיל', age: 21, gender: 'female', photo1_url: 'https://randomuser.me/api/portraits/women/56.jpg', tonight_status: 'כאן לבלות 🎉', bio: 'בשנה א\' — לומדת לחיות 🎓' },
  { id: 'p12', display_name: 'דניאל', age: 33, gender: 'male', photo1_url: 'https://randomuser.me/api/portraits/men/88.jpg', tonight_status: 'פנוי לרומנטיקה 💞', bio: 'רופא ומגדל כלב 🐕' },
]

export function getFeedPeople(venueId: string, filter = 'all'): FeedPerson[] {
  const user = getCurrentUser()
  const liked = get<string[]>('liked_ids') ?? []
  const passed = get<string[]>('passed_ids') ?? []
  const blocked = get<string[]>('blocked_ids') ?? []
  const seen = [...liked, ...passed, ...blocked]
  const pool = get<FeedPerson[]>('demo_feed_people') ?? MOCK_PEOPLE
  return pool.filter(p => {
    if (p.id === user?.id) return false
    if (seen.includes(p.id)) return false
    if ((filter === 'male'   || filter === 'men')   && p.gender !== 'male')   return false
    if ((filter === 'female' || filter === 'women') && p.gender !== 'female') return false
    return true
  })
}

// ── Likes & Matches ───────────────────────────────────────────────────────────
export function likePerson(targetId: string): Match | null {
  const liked = get<string[]>('liked_ids') ?? []
  set('liked_ids', [...liked, targetId])
  if (Math.random() < 0.4) return createMatch(targetId)
  return null
}

export function passPerson(targetId: string): void {
  const passed = get<string[]>('passed_ids') ?? []
  set('passed_ids', [...passed, targetId])
}

function createMatch(targetId: string): Match | null {
  const user = getCurrentUser()
  const target = MOCK_PEOPLE.find(p => p.id === targetId)
  const checkin = getActiveCheckin()
  const venue = checkin ? getVenueById(checkin.venue_id) : undefined
  if (!target || !user) return null
  const match: Match = {
    id: crypto.randomUUID(),
    user1_id: user.id,
    user2_id: target.id,
    user1_name: user.display_name,
    user2_name: target.display_name,
    user1_photo: user.photo1_url ?? null,
    user2_photo: target.photo1_url ?? null,
    venue_id: checkin?.venue_id ?? '',
    venue_name: venue?.name ?? 'הלילה',
    is_active: true,
    created_at: null,
    last_message: null,
    last_message_time: null,
  }
  const matches = get<Match[]>('matches') ?? []
  set('matches', [match, ...matches])
  return match
}

export function getMatches(): Match[] {
  return (get<Match[]>('matches') ?? []).filter(m => m.is_active)
}

export function unmatchMatch(matchId: string): void {
  const matches = get<Match[]>('matches') ?? []
  set('matches', matches.map(m => m.id === matchId ? { ...m, is_active: false } : m))
}

export function blockPerson(blockedId: string): void {
  const blocked = get<string[]>('blocked_ids') ?? []
  if (!blocked.includes(blockedId)) set('blocked_ids', [...blocked, blockedId])
}

export function getMatchById(id: string): Match | undefined {
  return getMatches().find(m => m.id === id)
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function getMessages(matchId: string): Message[] {
  return (get<Message[]>('msgs_' + matchId) ?? []).filter(m => m.is_active)
}

export function sendMessage(matchId: string, text: string, senderId: string, senderName: string): Message {
  const msg: Message = { id: crypto.randomUUID(), match_id: matchId, sender_id: senderId, sender_name: senderName, text, type: 'text', is_active: true, created_at: Date.now() }
  const msgs = get<Message[]>('msgs_' + matchId) ?? []
  set('msgs_' + matchId, [...msgs, msg])
  const matches = get<Match[]>('matches') ?? []
  set('matches', matches.map(m => m.id === matchId ? { ...m, last_message: text, last_message_time: Date.now() } : m))
  setTimeout(() => {
    const match = getMatchById(matchId)
    if (!match) return
    const replies = ['😊', 'כן בטח!', 'נראה טוב 🔥', 'איפה אתה?', 'בוא נדבר!', '💃', 'יאללה!']
    const reply = replies[Math.floor(Math.random() * replies.length)]
    const replyMsg: Message = { id: crypto.randomUUID(), match_id: matchId, sender_id: match.user2_id, sender_name: match.user2_name, text: reply, type: 'text', is_active: true, created_at: Date.now() }
    const cur = get<Message[]>('msgs_' + matchId) ?? []
    set('msgs_' + matchId, [...cur, replyMsg])
  }, 2000 + Math.random() * 2000)
  return msg
}

// ── Demo mode ─────────────────────────────────────────────────────────────────
export function startDemo(): { user: User; checkin: Checkin } {
  const today = todayKey()
  const venueId = 'v2'
  const demoUser: User = {
    id: 'demo-user', display_name: 'אורח', age: 25, gender: 'male',
    bio: 'מצב דמו של NightMatch 🎮', tonight_status: 'כאן לבלות 🎉',
    preference: 'all', photo1_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    onboarding_complete: true, is_demo: true,
  }
  set('user', demoUser)
  const checkin: Checkin = {
    id: 'demo-checkin', user_id: 'demo-user', venue_id: venueId,
    session_date: today, session_key: sessionKey(venueId),
    user_name: demoUser.display_name, is_active: true, created_at: Date.now(),
  }
  set('active_checkin', checkin)
  del('liked_ids'); del('passed_ids'); del('matches')
  return { user: demoUser, checkin }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function getLiveStats(): Stats {
  return { active_checkins: 847 + Math.floor(Math.random() * 10), active_matches: 203 + Math.floor(Math.random() * 5) }
}

export function resetForNewDay(): void {
  del('active_checkin'); del('liked_ids'); del('passed_ids'); del('matches')
  const user = getCurrentUser()
  if (user) set('user', { ...user, current_venue_id: null })
}

export function setDemoFeedPeople(people: FeedPerson[]): void {
  set('demo_feed_people', people)
  del('liked_ids')
  del('passed_ids')
}

export function clearDemoFeedPeople(): void {
  del('demo_feed_people')
}
