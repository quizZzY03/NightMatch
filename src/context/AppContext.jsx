import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from '../firebase/auth.js'
import { getUser, saveUser as fbSaveUser, listenMatches } from '../firebase/db.js'
import { FIREBASE_CONFIGURED } from '../firebase/config.js'
import { getCurrentUser, saveUser as localSaveUser, getActiveCheckin } from '../utils/storage.js'

const TEST_PHONE = '+972500000000'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [user, setUser] = useState(null)
  const [lang, setLang] = useState('he')
  const [checkin, setCheckin] = useState(null)
  const [matches, setMatches] = useState([])
  const [newMatchCount, setNewMatchCount] = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(fbUser => {
      setFirebaseUser(fbUser ?? null)
    })
    return unsub
  }, [])

  // Load user profile when Firebase auth resolves
  useEffect(() => {
    if (firebaseUser === undefined) return // still loading

    async function load() {
      try {
        let profile = null
        if (FIREBASE_CONFIGURED && firebaseUser) {
          profile = await getUser(firebaseUser.uid)
        } else {
          profile = getCurrentUser()
        }
        if (profile) {
          const isTest = FIREBASE_CONFIGURED && firebaseUser?.phoneNumber === TEST_PHONE
          const enriched = isTest ? { ...profile, is_test_account: true } : profile
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

  // Real-time matches listener
  useEffect(() => {
    if (!user?.id) return
    const unsub = listenMatches(user.id, incoming => {
      setMatches(prev => {
        if (incoming.length > prev.length) setNewMatchCount(n => n + (incoming.length - prev.length))
        return incoming
      })
    })
    return unsub
  }, [user?.id])

  const updateUser = useCallback(async (data) => {
    const uid = FIREBASE_CONFIGURED && firebaseUser ? firebaseUser.uid : (user?.id || 'local')
    let updated
    if (FIREBASE_CONFIGURED && firebaseUser) {
      updated = await fbSaveUser(uid, data)
      // merge with current local state
      updated = { ...user, ...data, id: uid }
    } else {
      updated = localSaveUser(data)
    }
    setUser(updated)
    if (data.language) setLang(data.language)
    return updated
  }, [user, firebaseUser])

  const refreshCheckin = useCallback(() => setCheckin(getActiveCheckin()), [])

  const toggleLang = useCallback(() => {
    const next = lang === 'he' ? 'en' : 'he'
    setLang(next)
    updateUser({ language: next })
  }, [lang, updateUser])

  const clearNewMatchCount = useCallback(() => setNewMatchCount(0), [])

  // Called after phone auth succeeds — links Firebase user to profile
  const onAuthSuccess = useCallback(async (fbUser) => {
    setFirebaseUser(fbUser)
    let profile = null
    if (FIREBASE_CONFIGURED) {
      profile = await getUser(fbUser.uid)
    } else {
      profile = getCurrentUser()
    }
    if (profile) {
      const isTest = FIREBASE_CONFIGURED && fbUser?.phoneNumber === TEST_PHONE
      const enriched = isTest ? { ...profile, is_test_account: true } : profile
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

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
