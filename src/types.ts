// ── Core domain types ─────────────────────────────────────────────────────────

export interface User {
  id: string
  display_name: string
  age: number | string
  gender: 'male' | 'female' | 'other' | ''
  bio?: string
  tonight_status?: string
  preference?: 'men' | 'women' | 'all' | ''
  instagram_handle?: string
  photo1_url?: string | null
  photo2_url?: string | null
  photo3_url?: string | null
  language?: 'he' | 'en'
  onboarding_complete?: boolean
  current_venue_id?: string | null
  is_premium?: boolean
  is_admin?: boolean
  is_test_account?: boolean
  is_demo?: boolean
  created_at?: unknown
  updated_at?: unknown
}

export interface Venue {
  id: string
  name: string
  name_en?: string
  city?: string
  venue_type?: 'bar' | 'club' | 'event' | 'wedding' | 'other'
  is_active?: boolean
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  geofence_radius: number
  cover_image_url?: string | null
  active_count?: number
}

export interface Checkin {
  id: string
  user_id: string
  venue_id: string
  venue_name?: string | null
  venue_city?: string | null
  session_date: string
  session_key: string
  user_name: string
  user_age?: number | string
  user_gender?: string
  user_photo?: string | null
  user_bio?: string
  tonight_status?: string
  preference?: string
  is_active: boolean
  created_at?: unknown
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  user1_name: string
  user2_name: string
  user1_photo?: string | null
  user2_photo?: string | null
  venue_id: string
  venue_name?: string
  session_key?: string
  is_active: boolean
  created_at?: { seconds: number; nanoseconds: number } | null
  last_message?: string | null
  last_message_time?: unknown
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  sender_name: string
  text: string
  type?: 'text'
  is_active?: boolean
  created_at?: unknown
}

export interface Like {
  id: string
  from_user_id: string
  to_user_id: string
  venue_id: string
  session_key: string
  is_super_like?: boolean
  is_active: boolean
  created_at?: unknown
}

export interface Stats {
  active_checkins: number
  active_matches: number
}

export interface FeedPerson {
  id: string
  display_name: string
  age: number | string
  gender: 'male' | 'female' | 'other' | ''
  photo1_url?: string | null
  bio?: string
  tonight_status?: string
}

// ── i18n ──────────────────────────────────────────────────────────────────────
export type Lang = 'he' | 'en'

// ── App Context ───────────────────────────────────────────────────────────────
export interface AppContextValue {
  user: User | null
  firebaseUser: import('firebase/auth').User | null | undefined
  lang: Lang
  checkin: Checkin | null
  matches: Match[]
  newMatchCount: number
  initialized: boolean
  isRTL: boolean
  needsAuth: boolean
  needsOnboarding: boolean
  updateUser: (data: Partial<User>) => Promise<User | undefined>
  refreshCheckin: () => void
  toggleLang: () => void
  clearNewMatchCount: () => void
  onAuthSuccess: (fbUser: import('firebase/auth').User) => Promise<void>
}
