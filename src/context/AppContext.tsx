import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { onAuthStateChanged } from '../firebase/auth'
import { getUser, saveUser as fbSaveUser, listenMatches } from '../firebase/db'
import { FIREBASE_CONFIGURED } from '../firebase/config'
import { getCurrentUser, saveUser as localSaveUser, getActiveCheckin } from '../utils/storage'
import type { User, Checkin, Match, Lang, AppContextValue } from '../types'

const TEST_PHONE = '+972500000000'

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
    const unsub = onAuthStateChanged(fbUser => {
      setFirebaseUser(fbUser ?? null)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (firebaseUser === undefined) return

    async function load() {
      try {
        let profile: User | null = null
        if (FIREBASE_CONFIGURED && firebaseUser && !(firebaseUser as FirebaseUser & { is_demo?: boolean }).is_demo) {
          profile = await getUser(firebaseUser.uid)
        } else {
          profile = getCurrentUser()
        }
        if (profile) {
          const isTest = FIREBASE_CONFIGURED && (firebaseUser as FirebaseUser | null)?.phoneNumber === TEST_PHONE
          const enriched: User = isTest ? { ...profile, is_test_account: true } : profile
          setUser(enriched)
          if (enriched.language) setLang(enriched.language)
        }
        setCheckin(getActiveCheckin())
      } catch (e) {
        console.error('AppContext load error:', e)
      } finally {
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

  const onAuthSuccess = useCallback(async (fbUser: FirebaseUser): Promise<void> => {
    setFirebaseUser(fbUser)
    let profile: User | null = null
    if (FIREBASE_CONFIGURED) {
      profile = await getUser(fbUser.uid)
    } else {
      profile = getCurrentUser()
    }
    if (profile) {
      const isTest = FIREBASE_CONFIGURED && fbUser.phoneNumber === TEST_PHONE
      const enriched: User = isTest ? { ...profile, is_test_account: true } : profile
      setUser(enriched)
      if (enriched.language) setLang(enriched.language)
    }
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
      needsOnboarding: initialized && !user?.onboarding_complete,
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
