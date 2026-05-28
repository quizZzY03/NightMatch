import { collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { sessionKey, todayKey } from './geo'
import type { FeedPerson } from '../types'

export const TEST_VENUE_ID = 'rotch-rishon'

const TEST_USERS = [
  // ── נשים ───────────────────────────────────────────────────────────────────
  {
    id: 'test-f1', display_name: 'נועה', age: 24, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/44.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/45.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/46.jpg',
    status: 'פנויה לרומנטיקה 💞',
    bio: 'אוהבת ריקודים ויין טוב 🍷 | תל אביביית עד העצם',
    instagram: 'noa.tlv',
  },
  {
    id: 'test-f2', display_name: 'שירה', age: 26, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/17.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/18.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/19.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'רוקדת סלסה וטנגו 💃 | מדריכת כושר | קפה בכל שעה ☕',
    instagram: 'shira.dance',
  },
  {
    id: 'test-f3', display_name: 'מיכל', age: 22, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/68.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/69.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/70.jpg',
    status: 'מחפשת חברים חדשים 👥',
    bio: 'סטודנטית לאמנות 🎨 | מאמינה גדולה בפסטה ובחתולים 🐱',
    instagram: '',
  },
  {
    id: 'test-f4', display_name: 'לירן', age: 27, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/29.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/30.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/31.jpg',
    status: 'פנויה לכל מה שיבוא ✨',
    bio: 'יוגה, קפה ומוזיקה חיה ☕ | היזמת הטק שלכם 💻',
    instagram: 'liran.yoga',
  },
  {
    id: 'test-f5', display_name: 'תמר', age: 29, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/90.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/91.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/92.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'עורכת דין ביום, רוקדת בלילה 👩‍⚖️ | אוהבת סושי ואנשים מעניינים 🍣',
    instagram: 'tamar.law',
  },
  {
    id: 'test-f6', display_name: 'ריטה', age: 25, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/55.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/56.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/57.jpg',
    status: 'פנויה לרומנטיקה 💞',
    bio: 'רופאת שיניים 🦷 | גרה בתל אביב | מת\'פיל על כדורסל 🏀',
    instagram: 'rita.smile',
  },
  {
    id: 'test-f7', display_name: 'איה', age: 23, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/33.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/34.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/35.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'מעצבת גרפית 🎨 | אוהבת מוזיקה אלקטרונית ונסיעות 🌍',
    instagram: 'aya.design',
  },
  {
    id: 'test-f8', display_name: 'שני', age: 31, gender: 'female',
    photo1: 'https://randomuser.me/api/portraits/women/77.jpg',
    photo2: 'https://randomuser.me/api/portraits/women/78.jpg',
    photo3: 'https://randomuser.me/api/portraits/women/79.jpg',
    status: 'מחפשת חברים חדשים 👥',
    bio: 'יועצת עסקית ☕ | אמא לכלבה בשם סוכר 🐶 | חיה לפי הוייב',
    instagram: 'shani.biz',
  },
  // ── גברים ──────────────────────────────────────────────────────────────────
  {
    id: 'test-m1', display_name: 'יובל', age: 27, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/32.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/33.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/34.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'DJ בסופ"ש, מתכנת בשבוע 🎧 | גדלתי על טראנס ופיצה',
    instagram: 'yuval.dj',
  },
  {
    id: 'test-m2', display_name: 'אלון', age: 30, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/54.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/55.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/56.jpg',
    status: 'פנוי לכל מה שיבוא ✨',
    bio: 'שף אמביציוזי 🍕 | טיול באסיה שינה אותי | אוהב לבשל לאנשים',
    instagram: 'alon.chef',
  },
  {
    id: 'test-m3', display_name: 'גל', age: 24, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/76.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/77.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/78.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'גולש ים 🏄 | פיזיו ספורט | חי לפי הגלים ולא לפי הלו"ז',
    instagram: 'gal.surf',
  },
  {
    id: 'test-m4', display_name: 'רון', age: 32, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/43.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/44.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/45.jpg',
    status: 'מחפש חברים חדשים 👥',
    bio: 'צלם ומטייל 📸 | 40 מדינות ועוד לא נגמר | מאמין שהחיים על הדרך',
    instagram: 'ron.photo',
  },
  {
    id: 'test-m5', display_name: 'דניאל', age: 34, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/88.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/89.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/90.jpg',
    status: 'פנוי לרומנטיקה 💞',
    bio: 'רופא ילדים 🩺 | מגדל לברדור בשם פסטה 🐕 | ג\'אז ויין 🎷',
    instagram: 'dr.daniel',
  },
  {
    id: 'test-m6', display_name: 'עמית', age: 28, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/12.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/13.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/14.jpg',
    status: 'כאן לבלות 🎉',
    bio: 'יזם סדרתי 🚀 | אוהב ברביקיו ופוקר | בא לפה כל שישי',
    instagram: 'amit.startup',
  },
  {
    id: 'test-m7', display_name: 'טל', age: 26, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/62.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/63.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/64.jpg',
    status: 'פנוי לכל מה שיבוא ✨',
    bio: 'מוזיקאי ומלחין 🎸 | מלמד גיטרה | אוהב שיחות עמוקות ב-2 בלילה',
    instagram: 'tal.music',
  },
  {
    id: 'test-m8', display_name: 'ניר', age: 29, gender: 'male',
    photo1: 'https://randomuser.me/api/portraits/men/36.jpg',
    photo2: 'https://randomuser.me/api/portraits/men/37.jpg',
    photo3: 'https://randomuser.me/api/portraits/men/38.jpg',
    status: 'מחפש חברים חדשים 👥',
    bio: 'מהנדס אזרחי 🏗️ | ריצה למרתון | חושב שאוכל טוב הוא אמנות',
    instagram: 'nir.run',
  },
]

export const TEST_USERS_AS_FEED: FeedPerson[] = TEST_USERS.map(u => ({
  id: u.id,
  display_name: u.display_name,
  age: u.age,
  gender: u.gender as FeedPerson['gender'],
  photo1_url: u.photo1,
  bio: u.bio,
  tonight_status: u.status,
}))

export async function seedTestCheckins(venueId = TEST_VENUE_ID) {
  const sKey = sessionKey(venueId)
  const today = todayKey()

  await clearTestCheckins(venueId)

  const promises = TEST_USERS.map(u =>
    addDoc(collection(db, 'checkins'), {
      user_id: u.id,
      venue_id: venueId,
      session_date: today,
      session_key: sKey,
      user_name: u.display_name,
      user_age: u.age,
      user_gender: u.gender,
      user_photo: u.photo1,
      tonight_status: u.status,
      user_bio: u.bio,
      preference: 'all',
      is_active: true,
      is_test: true,
      created_at: new Date(),
    })
  )

  // Also seed user profiles in Firestore so ProfileModal can fetch photo2+photo3
  const { doc, setDoc } = await import('firebase/firestore')
  const profilePromises = TEST_USERS.map(u =>
    setDoc(doc(db, 'users', u.id), {
      id: u.id,
      display_name: u.display_name,
      age: u.age,
      gender: u.gender,
      photo1_url: u.photo1,
      photo2_url: u.photo2,
      photo3_url: u.photo3,
      bio: u.bio,
      tonight_status: u.status,
      instagram_handle: u.instagram,
      preference: 'all',
      is_test: true,
      onboarding_complete: true,
    })
  )

  await Promise.all([...promises, ...profilePromises])
  return TEST_USERS.length
}

export async function clearUserLikesForSession(userId: string, venueId = TEST_VENUE_ID) {
  const sKey = sessionKey(venueId)
  const snap = await getDocs(query(
    collection(db, 'likes'),
    where('from_user_id', '==', userId)
  ))
  const toDelete = snap.docs.filter(d => d.data().session_key === sKey)
  await Promise.all(toDelete.map(d => deleteDoc(d.ref)))
  return toDelete.length
}

export async function clearTestCheckins(venueId = TEST_VENUE_ID) {
  const sKey = sessionKey(venueId)
  const snap = await getDocs(query(
    collection(db, 'checkins'),
    where('session_key', '==', sKey)
  ))
  const testDocs = snap.docs.filter(d => d.data().is_test === true)
  await Promise.all(testDocs.map(d => deleteDoc(d.ref)))
  return testDocs.length
}
