import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { onAuthStateChanged, handleRedirectResult } from '../firebase/auth'
import { getUser, saveUser as fbSaveUser, listenMatches } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { getCurrentUser, saveUser as localSaveUser, getActiveCheckin } from '../utils/storage'
import { ADMIN_UID, ADMIN_EMAILS } from '../config/admin'
import type { User, Checkin, Match, Lang, AppContextValue } from '../types'

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined)
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLang] = useState<Lang>('he')
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [newMatchCount, setNewMatchCount] = useState(0)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // DEV-only QA bypass: set localStorage.nightmatch_qa_bypass=true to skip Firebase auth
    if (import.meta.env.DEV && localStorage.getItem('nightmatch_qa_bypass') === 'true') {
      setFirebaseUser({ uid: 'qa-test-user' } as FirebaseUser)
      return
    }

    // Complete any pending Google/Apple signInWithRedirect flow.
    // On mobile the OAuth provider redirects back to the app and Firebase needs
    // getRedirectResult() called before onAuthStateChanged fires the signed-in user.
    handleRedirectResult().catch(() => {})

    const unsub = onAuthStateChanged(fbUser => {
      setFirebaseUser(fbUser ?? null)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (firebaseUser === undefined) return

    if (firebaseUser === null) {
      // User signed out — clear state immediately so stale admin flags don't bleed into next session
      setUser(null)
      setMatches([])
      setInitialized(true)
      return
    }

    async function load() {
      setUser(null)
      const fbU = firebaseUser as FirebaseUser
      const isAdmin = FIREBASE_CONFIGURED && (fbU.uid === ADMIN_UID || ADMIN_EMAILS.includes(fbU.email ?? ''))
      let profile: User | null = null
      try {
        const isQaBypassed = import.meta.env.DEV && localStorage.getItem('nightmatch_qa_bypass') === 'true'
        if (FIREBASE_CONFIGURED && !isQaBypassed && !(firebaseUser as FirebaseUser & { is_demo?: boolean }).is_demo) {
          profile = await getUser((firebaseUser as FirebaseUser).uid)
          // Firestore returned nothing — fall back to localStorage
          if (!profile) profile = getCurrentUser()
        } else {
          profile = getCurrentUser()
        }
      } catch (e) {
        console.error('AppContext load error:', e)
        // Firestore failed — fall back to localStorage
        profile = getCurrentUser()
      } finally {
        // Admin always bypasses onboarding — merge or create minimal profile
        if (isAdmin) {
          profile = {
            ...(profile ?? {}),
            id: (firebaseUser as FirebaseUser).uid,
            display_name: profile?.display_name || ((firebaseUser as FirebaseUser & { displayName?: string }).displayName) || 'Admin',
            onboarding_complete: true,
          } as User
        }
        if (profile && !profile.is_demo) {
          const enriched: User = { ...profile, is_admin: isAdmin }
          setUser(enriched)
          if (enriched.language) setLang(enriched.language)
        }
        setCheckin(getActiveCheckin())
        setInitialized(true)
      }
    }
    load()
  }, [firebaseUser])

  useEffect(() => {
    if (!user?.id) return
    const unsub = listenMatches(user.id, (incoming: Match[]) => {
      setMatches(prev => {
        if (incoming.length > prev.length) setNewMatchCount(n => n + (incoming.length - prev.length))
        return incoming
      })
    })
    return unsub
  }, [user?.id])

  const updateUser = useCallback(async (data: Partial<User>): Promise<User | undefined> => {
    const isDemo = (firebaseUser as FirebaseUser & { is_demo?: boolean } | null)?.is_demo || user?.id === 'demo-user'
    const uid = FIREBASE_CONFIGURED && firebaseUser && !isDemo ? firebaseUser.uid : (user?.id ?? 'local')

    let updated: User | undefined
    if (FIREBASE_CONFIGURED && firebaseUser && !isDemo) {
      updated = { ...user, ...data, id: uid } as User
      setUser(updated)
      if (data.language) setLang(data.language)
      localSaveUser({ ...data, id: uid }) // backup to localStorage
      try { await fbSaveUser(uid, data) } catch (e) { console.error('Firebase save failed:', (e as Error).message) }
    } else {
      updated = localSaveUser(data)
      setUser(updated)
      if (data.language) setLang(data.language)
    }
    return updated
  }, [user, firebaseUser])

  const refreshCheckin = useCallback(() => setCheckin(getActiveCheckin()), [])

  const toggleLang = useCallback(() => {
    const next: Lang = lang === 'he' ? 'en' : 'he'
    setLang(next)
    void updateUser({ language: next })
  }, [lang, updateUser])

  const clearNewMatchCount = useCallback(() => setNewMatchCount(0), [])

  // onAuthSuccess — called after popup sign-in. Just update firebaseUser;
  // load() via useEffect handles everything else (avoids race condition).
  const onAuthSuccess = useCallback((fbUser: FirebaseUser): void => {
    setFirebaseUser(fbUser)
  }, [])

  return (
    <AppContext.Provider value={{
      user,
      firebaseUser,
      lang,
      checkin,
      matches,
      newMatchCount,
      initialized,
      isRTL: lang === 'he',
      needsAuth: firebaseUser === null,
      needsOnboarding: initialized && !user?.onboarding_complete && !user?.is_admin &&
        !ADMIN_EMAILS.includes((firebaseUser as FirebaseUser | null)?.email ?? ''),
      updateUser,
      refreshCheckin,
      toggleLang,
      clearNewMatchCount,
      onAuthSuccess,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
