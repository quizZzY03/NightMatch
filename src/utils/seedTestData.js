import { collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { sessionKey, todayKey } from './geo.js'

const TEST_VENUE_ID = 'v2'

const TEST_USERS = [
  { id: 'test-1', display_name: 'נועה', age: 24, gender: 'female', photo: 'https://randomuser.me/api/portraits/women/44.jpg', status: 'פנויה לרומנטיקה 💞', bio: 'אוהבת ריקודים ויין טוב 🍷' },
  { id: 'test-2', display_name: 'שירה', age: 25, gender: 'female', photo: 'https://randomuser.me/api/portraits/women/17.jpg', status: 'כאן לבלות 🎉', bio: 'רוקדת סלסה וטנגו 💃' },
  { id: 'test-3', display_name: 'מיכל', age: 22, gender: 'female', photo: 'https://randomuser.me/api/portraits/women/68.jpg', status: 'מחפשת חברים חדשים 👥', bio: 'סטודנטית לאמנות 🎨' },
  { id: 'test-4', display_name: 'לירן', age: 26, gender: 'female', photo: 'https://randomuser.me/api/portraits/women/29.jpg', status: 'פנויה לכל מה שיבוא ✨', bio: 'יוגה, קפה ומוזיקה חיה ☕' },
  { id: 'test-5', display_name: 'תמר', age: 28, gender: 'female', photo: 'https://randomuser.me/api/portraits/women/90.jpg', status: 'כאן לבלות 🎉', bio: 'עורכת דין ביום, רוקדת בלילה 👩‍⚖️' },
  { id: 'test-6', display_name: 'יובל', age: 27, gender: 'male', photo: 'https://randomuser.me/api/portraits/men/32.jpg', status: 'כאן לבלות 🎉', bio: 'DJ בסופ"ש, מתכנת בשבוע 🎧' },
  { id: 'test-7', display_name: 'אלון', age: 29, gender: 'male', photo: 'https://randomuser.me/api/portraits/men/54.jpg', status: 'פנוי לכל מה שיבוא ✨', bio: 'שף ואוהב חיים 🍕' },
  { id: 'test-8', display_name: 'גל', age: 23, gender: 'male', photo: 'https://randomuser.me/api/portraits/men/76.jpg', status: 'כאן לבלות 🎉', bio: 'ספורטאי ואוהב ים 🏄' },
  { id: 'test-9', display_name: 'רון', age: 30, gender: 'male', photo: 'https://randomuser.me/api/portraits/men/43.jpg', status: 'מחפש חברים חדשים 👥', bio: 'מטייל, צלם, שמח 📸' },
  { id: 'test-10', display_name: 'דניאל', age: 33, gender: 'male', photo: 'https://randomuser.me/api/portraits/men/88.jpg', status: 'פנוי לרומנטיקה 💞', bio: 'רופא ומגדל כלב 🐕' },
]

export async function seedTestCheckins(venueId = TEST_VENUE_ID) {
  const sKey = sessionKey(venueId)
  const today = todayKey()

  // Clean up old test checkins first
  await clearTestCheckins(venueId)

  // Create fresh test checkins
  const promises = TEST_USERS.map(u =>
    addDoc(collection(db, 'checkins'), {
      user_id: u.id,
      venue_id: venueId,
      session_date: today,
      session_key: sKey,
      user_name: u.display_name,
      user_age: u.age,
      user_gender: u.gender,
      user_photo: u.photo,
      tonight_status: u.status,
      bio: u.bio,
      preference: 'all',
      is_active: true,
      is_test: true,
      created_at: new Date(),
    })
  )
  await Promise.all(promises)
  return TEST_USERS.length
}

export async function clearTestCheckins(venueId = TEST_VENUE_ID) {
  const sKey = sessionKey(venueId)
  const snap = await getDocs(query(
    collection(db, 'checkins'),
    where('session_key', '==', sKey),
    where('is_test', '==', true)
  ))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  return snap.size
}
