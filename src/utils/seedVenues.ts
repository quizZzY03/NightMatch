import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
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
  // ── תל אביב ───────────────────────────────────────────────────────────────
  {
    id: 'port-bar-tlv',
    name: 'בר הנמל', name_en: 'Port Bar', city: 'תל אביב',
    venue_type: 'bar', lat: 32.0967, lng: 34.7668, geofence_radius: 300,
  },
  {
    id: 'sensation-club-tlv',
    name: 'קלאב הסנסציה', name_en: 'Sensation Club', city: 'תל אביב',
    venue_type: 'club', lat: 32.0853, lng: 34.7818, geofence_radius: 200,
  },
  {
    id: 'rooftop-bar-tlv',
    name: 'הגג — רוף בר', name_en: 'The Rooftop Bar', city: 'תל אביב',
    venue_type: 'bar', lat: 32.0790, lng: 34.7720, geofence_radius: 200,
  },
  {
    id: 'rothschild-club-tlv',
    name: 'קלאב רוטשילד', name_en: 'Rothschild Club', city: 'תל אביב',
    venue_type: 'club', lat: 32.0613, lng: 34.7745, geofence_radius: 250,
  },
  {
    id: 'barbara-bar-tlv',
    name: 'ברברה בר', name_en: 'Barbara Bar', city: 'תל אביב',
    venue_type: 'bar', lat: 32.0665, lng: 34.7720, geofence_radius: 150,
  },
  {
    id: 'shishkin-tlv',
    name: 'שישקין', name_en: 'Shishkin', city: 'תל אביב',
    venue_type: 'bar', lat: 32.0780, lng: 34.7810, geofence_radius: 150,
  },
  // ── ראשון לציון ───────────────────────────────────────────────────────────
  {
    id: 'rotch-rishon',
    name: 'רוטצ׳', name_en: "Rotch", city: 'ראשון לציון',
    venue_type: 'bar', lat: 31.9649, lng: 34.7922, geofence_radius: 150,
  },
  // ── אירועים ───────────────────────────────────────────────────────────────
  {
    id: 'wedding-venue-rg',
    name: 'חתונה כללית', name_en: 'Wedding Venue', city: 'רמת גן',
    venue_type: 'wedding', lat: 32.0824, lng: 34.8137, geofence_radius: 500,
  },
  {
    id: 'pride-night-tlv',
    name: 'ערב פרייד', name_en: 'Pride Night', city: 'תל אביב',
    venue_type: 'event', lat: 32.0731, lng: 34.7737, geofence_radius: 400,
  },
]

/**
 * Upsert all venues (setDoc with merge:true) — idempotent, safe to run repeatedly.
 * Returns number of venues written.
 */
export async function seedProductionVenues(): Promise<number> {
  await Promise.all(
    PRODUCTION_VENUES.map(({ id, ...data }) =>
      setDoc(
        doc(db, 'venues', id),
        { ...data, is_active: true, updated_at: serverTimestamp() },
        { merge: true }
      )
    )
  )
  console.log('Seeded', PRODUCTION_VENUES.length, 'venues')
  return PRODUCTION_VENUES.length
}
