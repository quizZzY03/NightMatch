import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ConfirmationResult,
  User,
} from 'firebase/auth'
import { auth, FIREBASE_CONFIGURED } from './config'

let recaptchaVerifier: RecaptchaVerifier | null = null

export function setupRecaptcha(containerId = 'recaptcha-container'): RecaptchaVerifier | null {
  if (!FIREBASE_CONFIGURED) return null
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch {}
    recaptchaVerifier = null
  }
  const old = document.getElementById(containerId)
  if (old?.parentNode) {
    const fresh = document.createElement('div')
    fresh.id = containerId
    old.parentNode.replaceChild(fresh, old)
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { recaptchaVerifier = null },
  })
  return recaptchaVerifier
}

export async function sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const verifier = setupRecaptcha()
  if (!verifier) throw new Error('reCAPTCHA not available')
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

export async function verifyOTP(confirmationResult: ConfirmationResult, code: string): Promise<User> {
  const credential = await confirmationResult.confirm(code)
  return credential.user
}

export async function sendEmailLink(email: string): Promise<void> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  await sendSignInLinkToEmail(auth, email, {
    url: window.location.origin,
    handleCodeInApp: true,
  })
  window.localStorage.setItem('nightmatch_email_signin', email)
}

export function hasPendingEmailLink(): boolean {
  if (!FIREBASE_CONFIGURED) return false
  return isSignInWithEmailLink(auth, window.location.href)
}

export async function completeEmailLink(): Promise<User | null> {
  if (!FIREBASE_CONFIGURED) return null
  if (!isSignInWithEmailLink(auth, window.location.href)) return null
  const email = window.localStorage.getItem('nightmatch_email_signin')
  if (!email) return null
  const result = await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem('nightmatch_email_signin')
  window.history.replaceState(null, '', window.location.pathname)
  return result.user
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent)
}

export async function signInWithGoogle(): Promise<User> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  // Android (both browser and installed PWA): use redirect — popups are blocked
  if (isAndroid()) {
    await signInWithRedirect(auth, provider)
    return {} as User // page navigates away — never reached
  }

  // iOS Safari / desktop: use popup (redirect doesn't work reliably in iOS Safari / PWA)
  // Fall back to redirect if popup is blocked
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider)
      return {} as User
    }
    throw err
  }
}

export async function signInWithApple(): Promise<User> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  // Apple sign-in: always try popup first; fall back to redirect
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider)
      return {} as User
    }
    throw err
  }
}

export async function signOut(): Promise<void> {
  if (!FIREBASE_CONFIGURED) return
  await fbSignOut(auth)
}

/** Delete the current Firebase Auth account. Throws 'auth/requires-recent-login' if session is stale. */
export async function deleteAccount(): Promise<void> {
  if (!FIREBASE_CONFIGURED) return
  const user = auth.currentUser
  if (!user) throw new Error('no-user')
  await deleteUser(user)
}

export function getCurrentFirebaseUser(): User | null {
  if (!FIREBASE_CONFIGURED) return null
  return auth.currentUser
}

export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!FIREBASE_CONFIGURED) { callback(null); return () => {} }
  return auth.onAuthStateChanged(callback)
}

/**
 * Must be called once on app start to complete Google/Apple signInWithRedirect flows.
 * On mobile, after the OAuth redirect returns the user to the app, Firebase needs
 * this call to finalize the credential exchange. Without it, onAuthStateChanged fires null.
 */
export async function handleRedirectResult(): Promise<User | null> {
  if (!FIREBASE_CONFIGURED) return null
  try {
    const result = await getRedirectResult(auth)
    return result?.user ?? null
  } catch {
    // e.g. popup_closed_by_user — safe to ignore
    return null
  }
}
