import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, orderBy, limit, getDocs, DocumentData, deleteField,
} from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED } from './config'
import * as local from '../utils/storage'
import { todayKey, sessionKey } from '../utils/geo'
import type { User, Venue, Checkin, Match, Message, FeedPerson, Stats } from '../types'

// ── User ──────────────────────────────────────────────────────────────────────
export async function getUser(uid: string): Promise<User | null> {
  if (!FIREBASE_CONFIGURED) return local.getCurrentUser()
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<User, 'id'>) } : null
}

export async function saveUser(uid: string, data: Partial<User>): Promise<User> {
  if (!FIREBASE_CONFIGURED) return local.saveUser(data)
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, is_demo: deleteField(), updated_at: serverTimestamp() })
  } else {
    await setDoc(ref, { ...data, id: uid, created_at: serverTimestamp(), updated_at: serverTimestamp() })
  }
  return { id: uid, ...data } as User
}

/** Delete all user-owned Firestore data: profile, check-ins, likes, matches. */
export async function deleteUserData(uid: string): Promise<void> {
  if (!FIREBASE_CONFIGURED) return
  // Delete user document
  try { await deleteDoc(doc(db, 'users', uid)) } catch {}
  // Delete all check-ins
  try {
    const snap = await getDocs(query(collection(db, 'checkins'), where('user_id', '==', uid)))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  } catch {}
  // Delete all likes sent by this user
  try {
    const snap = await getDocs(query(collection(db, 'likes'), where('from_user_id', '==', uid)))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  } catch {}
  // Deactivate matches (security rules forbid delete; mark inactive instead)
  try {
    const [m1, m2] = await Promise.all([
      getDocs(query(collection(db, 'matches'), where('user1_id', '==', uid), where('is_active', '==', true))),
      getDocs(query(collection(db, 'matches'), where('user2_id', '==', uid), where('is_active', '==', true))),
    ])
    await Promise.all([...m1.docs, ...m2.docs].map(d => updateDoc(d.ref, { is_active: false })))
  } catch {}
}

// ── Venues ────────────────────────────────────────────────────────────────────
export async function getVenues(): Promise<Venue[]> {
  if (!FIREBASE_CONFIGURED) return local.getVenues()
  const snap = await getDocs(query(collection(db, 'venues'), where('is_active', '==', true)))
  if (snap.empty) return local.getVenues()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Venue, 'id'>) }))
}

export async function getVenueById(id: string): Promise<Venue | null> {
  if (!FIREBASE_CONFIGURED) return local.getVenueById(id) ?? null
  const snap = await getDoc(doc(db, 'venues', id))
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Venue, 'id'>) } : null
}

// ── CheckIn ───────────────────────────────────────────────────────────────────
export async function checkIn(venueId: string, user: User): Promise<Checkin> {
  if (!FIREBASE_CONFIGURED) return local.checkIn(venueId, user)
  const today = todayKey()
  const sKey = sessionKey(venueId)

  const prev = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', user.id),
    where('is_active', '==', true)
  ))
  await Promise.all(prev.docs.map(d => updateDoc(d.ref, { is_active: false })))

  const checkinData = {
    user_id: user.id,
    venue_id: venueId,
    session_date: today,
    session_key: sKey,
    user_name: user.display_name,
    user_age: user.age,
    user_gender: user.gender,
    user_photo: user.photo1_url ?? null,
    user_bio: user.bio ?? '',
    tonight_status: user.tonight_status ?? '',
    preference: user.preference ?? 'all',
    is_active: true,
    created_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'checkins'), checkinData)

  try { await updateDoc(doc(db, 'users', user.id), { current_venue_id: venueId }) } catch { /* non-fatal */ }

  const venueSnap = await getDoc(doc(db, 'venues', venueId))
  const venueData = venueSnap.exists() ? (venueSnap.data() as Venue) : null
  local.checkIn(venueId, user, venueData)

  return { id: ref.id, ...checkinData } as unknown as Checkin
}

export async function updateCheckinProfile(userId: string, data: {
  display_name?: string; age?: number | string; gender?: string;
  photo1_url?: string | null; bio?: string; tonight_status?: string
}): Promise<void> {
  if (!FIREBASE_CONFIGURED) return
  const snap = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', userId),
    where('is_active', '==', true)
  ))
  const patch: Record<string, unknown> = {}
  if (data.display_name !== undefined) patch.user_name = data.display_name
  if (data.age !== undefined) patch.user_age = data.age
  if (data.gender !== undefined) patch.user_gender = data.gender
  if (data.photo1_url !== undefined) patch.user_photo = data.photo1_url
  if (data.bio !== undefined) patch.user_bio = data.bio
  if (data.tonight_status !== undefined) patch.tonight_status = data.tonight_status
  if (Object.keys(patch).length > 0) {
    await Promise.all(snap.docs.map(d => updateDoc(d.ref, patch)))
  }
}

export async function checkOut(userId: string): Promise<void> {
  if (!FIREBASE_CONFIGURED) { local.checkOut(); return }
  const prev = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', userId),
    where('is_active', '==', true)
  ))
  await Promise.all(prev.docs.map(d => updateDoc(d.ref, { is_active: false })))
  await updateDoc(doc(db, 'users', userId), { current_venue_id: null })
  local.checkOut()
}

// ── Feed ──────────────────────────────────────────────────────────────────────
export function listenFeed(
  venueId: string,
  currentUserId: string,
  preference: string,
  callback: (people: FeedPerson[]) => void
): () => void {
  // Bypass Firestore for demo users and dev QA bypass (no real Firebase auth token)
  const isQaBypassed = import.meta.env.DEV && localStorage.getItem('nightmatch_qa_bypass') === 'true'
  if (!FIREBASE_CONFIGURED || currentUserId === 'demo-user' || isQaBypassed) {
    callback(local.getFeedPeople(venueId, preference))
    return () => {}
  }
  const sKey = sessionKey(venueId)
  // Single-field query only — no composite index needed. Filter is_active in memory.
  const q = query(
    collection(db, 'checkins'),
    where('session_key', '==', sKey),
    limit(100)
  )
  return onSnapshot(q, async snap => {
    const [likedSnap, blockedSnap] = await Promise.all([
      getDocs(query(collection(db, 'likes'), where('from_user_id', '==', currentUserId))),
      getDocs(query(collection(db, 'blocks'), where('blocker_id', '==', currentUserId))),
    ])
    const seen = new Set(
      likedSnap.docs
        .filter(d => d.data().session_key === sKey)
        .map(d => (d.data() as DocumentData).to_user_id as string)
    )
    const blocked = new Set(blockedSnap.docs.map(d => d.data().blocked_id as string))

    const people: FeedPerson[] = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as DocumentData) }))
      .filter(p => p.is_active !== false)
      .filter(p => p.user_id !== currentUserId && !seen.has(p.user_id as string) && !blocked.has(p.user_id as string))
      .filter(p => {
        // preference stored as 'men'/'women'/'all' (Profile page) — normalise both forms
        if (preference === 'men'   || preference === 'male')   return p.user_gender === 'male'
        if (preference === 'women' || preference === 'female') return p.user_gender === 'female'
        return true
      })
      .map(p => ({
        id: p.user_id as string,
        display_name: p.user_name as string,
        age: p.user_age as number,
        gender: p.user_gender as FeedPerson['gender'],
        photo1_url: (p.user_photo as string | null) ?? null,
        bio: (p.user_bio as string) ?? '',
        tonight_status: p.tonight_status as string,
      }))
    callback(people)
  })
}

// ── Likes & Matches ───────────────────────────────────────────────────────────
export async function likePerson(fromUser: User, toUserId: string, venueId: string): Promise<Match | null> {
  if (!FIREBASE_CONFIGURED) return local.likePerson(toUserId)
  const sKey = sessionKey(venueId)

  await addDoc(collection(db, 'likes'), {
    from_user_id: fromUser.id,
    from_user_name: fromUser.display_name ?? '',
    from_user_photo: fromUser.photo1_url ?? null,
    from_user_age: fromUser.age ?? null,
    from_user_gender: fromUser.gender ?? null,
    to_user_id: toUserId,
    venue_id: venueId,
    session_key: sKey,
    is_active: true,
    created_at: serverTimestamp(),
  })

  const mutual = await getDocs(query(
    collection(db, 'likes'),
    where('from_user_id', '==', toUserId),
    where('to_user_id', '==', fromUser.id),
    where('session_key', '==', sKey)
  ))
  if (!mutual.empty) return createMatch(fromUser, toUserId, venueId, sKey)
  return null
}

async function createMatch(fromUser: User, toUserId: string, venueId: string, sKey: string): Promise<Match> {
  const otherSnap = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', toUserId),
    where('session_key', '==', sKey)
  ))
  const other = otherSnap.empty ? null : (otherSnap.docs[0].data() as DocumentData)

  const venueSnap = await getDoc(doc(db, 'venues', venueId))
  const venueName = venueSnap.exists() ? (venueSnap.data() as Venue).name : ''

  const match = {
    user1_id: fromUser.id,
    user2_id: toUserId,
    user1_name: fromUser.display_name,
    user2_name: (other?.user_name as string) ?? '',
    user1_photo: fromUser.photo1_url ?? null,
    user2_photo: (other?.user_photo as string | null) ?? null,
    venue_id: venueId,
    venue_name: venueName,
    session_key: sKey,
    is_active: true,
    created_at: serverTimestamp(),
    last_message: null,
    last_message_time: null,
  }
  const ref = await addDoc(collection(db, 'matches'), match)
  return { id: ref.id, ...match } as unknown as Match
}

// ── Matches listener ──────────────────────────────────────────────────────────
export function listenMatches(userId: string, callback: (matches: Match[]) => void): () => void {
  if (!FIREBASE_CONFIGURED || userId === 'demo-user') { callback(local.getMatches()); return () => {} }

  const cache: { as1: Match[]; as2: Match[] } = { as1: [], as2: [] }

  function merge(): void {
    const seen = new Set<string>()
    const merged = [...cache.as1, ...cache.as2]
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      .sort((a, b) => ((b.created_at as { seconds?: number } | null)?.seconds ?? 0) - ((a.created_at as { seconds?: number } | null)?.seconds ?? 0))
    callback(merged)
  }

  const q1 = query(collection(db, 'matches'), where('user1_id', '==', userId), where('is_active', '==', true), orderBy('created_at', 'desc'))
  const q2 = query(collection(db, 'matches'), where('user2_id', '==', userId), where('is_active', '==', true), orderBy('created_at', 'desc'))

  const unsub1 = onSnapshot(q1, snap => { cache.as1 = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })); merge() })
  const unsub2 = onSnapshot(q2, snap => { cache.as2 = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })); merge() })

  return () => { unsub1(); unsub2() }
}

// ── Incoming likes (who liked me) ─────────────────────────────────────────────
export interface IncomingLike {
  id: string
  from_user_id: string
  from_user_name: string
  from_user_photo: string | null
  from_user_age: number | null
  from_user_gender: string | null
}

export function listenIncomingLikes(
  userId: string,
  sKey: string,
  callback: (likes: IncomingLike[]) => void
): () => void {
  if (!FIREBASE_CONFIGURED) return () => {}
  const q = query(
    collection(db, 'likes'),
    where('to_user_id', '==', userId),
    where('session_key', '==', sKey)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id,
      from_user_id: d.data().from_user_id as string,
      from_user_name: (d.data().from_user_name as string) ?? '?',
      from_user_photo: (d.data().from_user_photo as string | null) ?? null,
      from_user_age: (d.data().from_user_age as number | null) ?? null,
      from_user_gender: (d.data().from_user_gender as string | null) ?? null,
    })))
  })
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function listenMessages(matchId: string, callback: (msgs: Message[]) => void, userId?: string): () => void {
  if (!FIREBASE_CONFIGURED || matchId.startsWith('demo-') || userId === 'demo-user') {
    callback(local.getMessages(matchId))
    const interval = setInterval(() => callback(local.getMessages(matchId)), 1500)
    return () => clearInterval(interval)
  }
  const q = query(
    collection(db, 'messages'),
    where('match_id', '==', matchId),
    orderBy('created_at', 'asc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })))
  })
}

export async function sendMessage(matchId: string, text: string, senderId: string, senderName: string): Promise<Message> {
  if (!FIREBASE_CONFIGURED || senderId === 'demo-user') return local.sendMessage(matchId, text, senderId, senderName)
  const msg = { match_id: matchId, sender_id: senderId, sender_name: senderName, text, type: 'text' as const, is_active: true, created_at: serverTimestamp() }
  const ref = await addDoc(collection(db, 'messages'), msg)
  await updateDoc(doc(db, 'matches', matchId), { last_message: text, last_message_time: serverTimestamp() })
  return { id: ref.id, ...msg } as unknown as Message
}

// ── Unmatch ───────────────────────────────────────────────────────────────────
export async function unmatchUser(matchId: string): Promise<void> {
  // Demo matches live only in localStorage — Firestore has no doc for them
  if (!FIREBASE_CONFIGURED || local.getCurrentUser()?.id === 'demo-user') {
    local.unmatchMatch(matchId)
    return
  }
  await updateDoc(doc(db, 'matches', matchId), { is_active: false })
}

// ── Block / Report ────────────────────────────────────────────────────────────
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!FIREBASE_CONFIGURED || blockerId === 'demo-user') {
    local.blockPerson(blockedId)
    return
  }
  await setDoc(doc(db, 'blocks', `${blockerId}_${blockedId}`), {
    blocker_id: blockerId,
    blocked_id: blockedId,
    created_at: serverTimestamp(),
  })
}

export async function reportUser(reporterId: string, reportedId: string, reason: string): Promise<void> {
  if (!FIREBASE_CONFIGURED || reporterId === 'demo-user') return
  await addDoc(collection(db, 'reports'), {
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    created_at: serverTimestamp(),
  })
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  if (!FIREBASE_CONFIGURED) return []
  const snap = await getDocs(query(collection(db, 'blocks'), where('blocker_id', '==', userId)))
  return snap.docs.map(d => d.data().blocked_id as string)
}

// ── Live stats ────────────────────────────────────────────────────────────────
export function listenStats(callback: (stats: Stats) => void): () => void {
  if (!FIREBASE_CONFIGURED) { callback(local.getLiveStats()); return () => {} }
  const today = todayKey()
  const q = query(collection(db, 'checkins'), where('session_date', '==', today), where('is_active', '==', true))
  return onSnapshot(q, snap => {
    callback({ active_checkins: snap.size, active_matches: Math.floor(snap.size * 0.24) })
  })
}
