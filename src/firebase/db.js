import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, orderBy, limit, getDocs
} from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED } from './config.js'
import * as local from '../utils/storage.js'
import { todayKey, sessionKey } from '../utils/geo.js'

// ── User ──────────────────────────────────────────────────────────────────────
export async function getUser(uid) {
  if (!FIREBASE_CONFIGURED) return local.getCurrentUser()
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveUser(uid, data) {
  if (!FIREBASE_CONFIGURED) return local.saveUser(data)
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
  } else {
    await setDoc(ref, { ...data, id: uid, created_at: serverTimestamp(), updated_at: serverTimestamp() })
  }
  return { id: uid, ...data }
}

// ── Venues ────────────────────────────────────────────────────────────────────
export async function getVenues() {
  if (!FIREBASE_CONFIGURED) return local.getVenues()
  const snap = await getDocs(query(collection(db, 'venues'), where('is_active', '==', true)))
  if (snap.empty) return local.getVenues() // fallback to mock data
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getVenueById(id) {
  if (!FIREBASE_CONFIGURED) return local.getVenueById(id)
  const snap = await getDoc(doc(db, 'venues', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── CheckIn (session-based) ───────────────────────────────────────────────────
export async function checkIn(venueId, user) {
  if (!FIREBASE_CONFIGURED) return local.checkIn(venueId, user)
  const today = todayKey()
  const sKey = sessionKey(venueId)

  // Deactivate any previous check-in for this user
  const prev = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', user.id),
    where('is_active', '==', true)
  ))
  await Promise.all(prev.docs.map(d => updateDoc(d.ref, { is_active: false })))

  const checkin = {
    user_id: user.id,
    venue_id: venueId,
    session_date: today,
    session_key: sKey,
    user_name: user.display_name,
    user_age: user.age,
    user_gender: user.gender,
    user_photo: user.photo1_url || null,
    user_bio: user.bio || '',
    tonight_status: user.tonight_status || '',
    preference: user.preference || 'all',
    is_active: true,
    created_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'checkins'), checkin)

  // Update user's current_venue_id
  await updateDoc(doc(db, 'users', user.id), { current_venue_id: venueId })

  // Also update local cache
  local.checkIn(venueId, user)
  return { id: ref.id, ...checkin }
}

export async function checkOut(userId) {
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

// ── Feed: people at same venue + session ─────────────────────────────────────
export function listenFeed(venueId, currentUserId, preference, callback) {
  if (!FIREBASE_CONFIGURED || currentUserId === 'demo-user') {
    callback(local.getFeedPeople(venueId, preference))
    return () => {}
  }
  const sKey = sessionKey(venueId)
  const q = query(
    collection(db, 'checkins'),
    where('session_key', '==', sKey),
    where('is_active', '==', true),
    limit(50)
  )
  return onSnapshot(q, async snap => {
    const likedSnap = await getDocs(query(
      collection(db, 'likes'),
      where('from_user_id', '==', currentUserId),
      where('session_key', '==', sKey)
    ))
    const seen = new Set(likedSnap.docs.map(d => d.data().to_user_id))

    const people = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.user_id !== currentUserId && !seen.has(p.user_id))
      .filter(p => {
        if (preference === 'male') return p.user_gender === 'male'
        if (preference === 'female') return p.user_gender === 'female'
        return true
      })
      .map(p => ({
        id: p.user_id,
        display_name: p.user_name,
        age: p.user_age,
        gender: p.user_gender,
        photo1_url: p.user_photo,
        bio: p.user_bio || '',
        tonight_status: p.tonight_status,
      }))
    callback(people)
  })
}

// ── Likes & Matches ───────────────────────────────────────────────────────────
export async function likePerson(fromUser, toUserId, venueId) {
  if (!FIREBASE_CONFIGURED) return local.likePerson(toUserId)
  const sKey = sessionKey(venueId)

  await addDoc(collection(db, 'likes'), {
    from_user_id: fromUser.id,
    to_user_id: toUserId,
    venue_id: venueId,
    session_key: sKey,
    is_active: true,
    created_at: serverTimestamp(),
  })

  // Check mutual like
  const mutual = await getDocs(query(
    collection(db, 'likes'),
    where('from_user_id', '==', toUserId),
    where('to_user_id', '==', fromUser.id),
    where('session_key', '==', sKey)
  ))
  if (!mutual.empty) return createMatch(fromUser, toUserId, venueId, sKey)
  return null
}

async function createMatch(fromUser, toUserId, venueId, sKey) {
  // Get other user's info from checkins
  const otherSnap = await getDocs(query(
    collection(db, 'checkins'),
    where('user_id', '==', toUserId),
    where('session_key', '==', sKey)
  ))
  const other = otherSnap.empty ? null : otherSnap.docs[0].data()

  // Get venue name
  const venueSnap = await getDoc(doc(db, 'venues', venueId))
  const venueName = venueSnap.exists() ? venueSnap.data().name : ''

  const match = {
    user1_id: fromUser.id,
    user2_id: toUserId,
    user1_name: fromUser.display_name,
    user2_name: other?.user_name || '',
    user1_photo: fromUser.photo1_url || null,
    user2_photo: other?.user_photo || null,
    venue_id: venueId,
    venue_name: venueName,
    session_key: sKey,
    is_active: true,
    created_at: serverTimestamp(),
    last_message: null,
    last_message_time: null,
  }
  const ref = await addDoc(collection(db, 'matches'), match)
  return { id: ref.id, ...match }
}

// ── Super Like ────────────────────────────────────────────────────────────────
export async function superLikePerson(fromUser, toUserId, venueId) {
  if (!FIREBASE_CONFIGURED) return local.superLikePerson(toUserId)
  const sKey = sessionKey(venueId)

  await addDoc(collection(db, 'likes'), {
    from_user_id: fromUser.id,
    to_user_id: toUserId,
    venue_id: venueId,
    session_key: sKey,
    is_super_like: true,
    is_active: true,
    created_at: serverTimestamp(),
  })

  // Notify target of super like
  await addDoc(collection(db, 'notifications'), {
    user_id: toUserId,
    type: 'super_like',
    from_user_id: fromUser.id,
    from_user_name: fromUser.display_name,
    from_user_photo: fromUser.photo1_url || null,
    venue_id: venueId,
    session_key: sKey,
    is_read: false,
    created_at: serverTimestamp(),
  })

  // Check mutual like
  const mutual = await getDocs(query(
    collection(db, 'likes'),
    where('from_user_id', '==', toUserId),
    where('to_user_id', '==', fromUser.id),
    where('session_key', '==', sKey)
  ))
  if (!mutual.empty) return createMatch(fromUser, toUserId, venueId, sKey)
  return null
}

// ── Matches listener ──────────────────────────────────────────────────────────
export function listenMatches(userId, callback) {
  if (!FIREBASE_CONFIGURED || userId === 'demo-user') { callback(local.getMatches()); return () => {} }
  const q = query(
    collection(db, 'matches'),
    where('is_active', '==', true),
    orderBy('created_at', 'desc')
  )
  return onSnapshot(q, snap => {
    const matches = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.user1_id === userId || m.user2_id === userId)
    callback(matches)
  })
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function listenMessages(matchId, callback) {
  if (!FIREBASE_CONFIGURED || matchId.startsWith('demo-')) {
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
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function sendMessage(matchId, text, senderId, senderName) {
  if (!FIREBASE_CONFIGURED || senderId === 'demo-user') return local.sendMessage(matchId, text, senderId, senderName)
  const msg = { match_id: matchId, sender_id: senderId, sender_name: senderName, text, type: 'text', is_active: true, created_at: serverTimestamp() }
  const ref = await addDoc(collection(db, 'messages'), msg)
  await updateDoc(doc(db, 'matches', matchId), { last_message: text, last_message_time: serverTimestamp() })
  return { id: ref.id, ...msg }
}

// ── Live stats ────────────────────────────────────────────────────────────────
export function listenStats(callback) {
  if (!FIREBASE_CONFIGURED) { callback(local.getLiveStats()); return () => {} }
  const today = todayKey()
  const q = query(collection(db, 'checkins'), where('session_date', '==', today), where('is_active', '==', true))
  return onSnapshot(q, snap => {
    callback({ active_checkins: snap.size, active_matches: Math.floor(snap.size * 0.24) })
  })
}
