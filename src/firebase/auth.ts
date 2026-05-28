import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia('(display-mode: standalone)').matches
}

export async function signInWithGoogle(): Promise<User> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  if (isMobile()) {
    await signInWithRedirect(auth, provider)
    return {} as User // page navigates away — never reached
  }
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signInWithApple(): Promise<User> {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOut(): Promise<void> {
  if (!FIREBASE_CONFIGURED) return
  await fbSignOut(auth)
}

export function getCurrentFirebaseUser(): User | null {
  if (!FIREBASE_CONFIGURED) return null
  return auth.currentUser
}

export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!FIREBASE_CONFIGURED) { callback(null); return () => {} }
  return auth.onAuthStateChanged(callback)
}
