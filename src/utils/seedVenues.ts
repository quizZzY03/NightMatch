import { doc, setDoc, serverTimestamp, getDocs, collection, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Each venue has a FIXED document ID — so the QR code is stable forever.
 * Running seedProductionVenues() multiple times is safe (setDoc + merge:true = upsert).
 */
export const PRODUCTION_VENUES: Array<{
  id: string
  name: string
  name_en: string
  city: string
  venue_type: 'bar' | 'club' | 'event' | 'wedding' | 'other'
  lat: number
  lng: number
  geofence_radius: number
}> = [
  // ── ראשון לציון ───────────────────────────────────────────────────────────
  {
    id: 'rotch-rishon',
    name: 'רוטשילד 26', name_en: 'Rothschild 26', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9649, lng: 34.7922, geofence_radius: 150,
  },
  {
    id: 'beer-house-rishon',
    name: 'ביר האוס', name_en: 'Beer House', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9621, lng: 34.8030, geofence_radius: 150,
  },
  {
    id: 'pirate-pub-rishon',
    name: 'פאב הפיראט', name_en: 'The Pirate Pub', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9749, lng: 34.8079, geofence_radius: 150,
  },
  {
    id: 'garden83-rishon',
    name: 'גארדן 83', name_en: 'Garden 83', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9645, lng: 34.7960, geofence_radius: 150,
  },
  {
    id: 'pacho-rishon',
    name: 'פאצ\'ו', name_en: 'Pacho Bar', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9632, lng: 34.8002, geofence_radius: 150,
  },
  {
    id: 'pub55-rishon',
    name: 'פאב 55', name_en: 'Pub 55', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9797, lng: 34.7476, geofence_radius: 200,
  },
  {
    id: 'temple-bar-rishon',
    name: 'Temple Bar', name_en: 'Temple Bar', city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9635, lng: 34.8015, geofence_radius: 150,
  },
]

/**
 * Upsert all venues and deactivate any old venues not in the current list.
 * Safe to run repeatedly — idempotent.
 * Returns number of venues written.
 */
export async function seedProductionVenues(): Promise<number> {
  const activeIds = new Set(PRODUCTION_VENUES.map(v => v.id))

  // Deactivate old venues no longer in the list
  const existing = await getDocs(collection(db, 'venues'))
  await Promise.all(
    existing.docs
      .filter(d => !activeIds.has(d.id))
      .map(d => updateDoc(d.ref, { is_active: false, updated_at: serverTimestamp() }))
  )

  // Upsert current venues
  await Promise.all(
    PRODUCTION_VENUES.map(({ id, ...data }) =>
      setDoc(
        doc(db, 'venues', id),
        { ...data, is_active: true, updated_at: serverTimestamp() },
        { merge: true }
      )
    )
  )
  console.log('Seeded', PRODUCTION_VENUES.length, 'venues, deactivated', existing.docs.filter(d => !activeIds.has(d.id)).length, 'old venues')
  return PRODUCTION_VENUES.length
}
