import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { auth, FIREBASE_CONFIGURED } from './config.js'

let recaptchaVerifier = null

export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!FIREBASE_CONFIGURED) return null
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch {}
    recaptchaVerifier = null
  }
  const container = document.getElementById(containerId)
  if (container) container.innerHTML = ''
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { recaptchaVerifier = null },
  })
  return recaptchaVerifier
}

export async function sendOTP(phoneNumber) {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const verifier = setupRecaptcha()
  const result = await signInWithPhoneNumber(auth, phoneNumber, verifier)
  return result
}

export async function verifyOTP(confirmationResult, code) {
  const credential = await confirmationResult.confirm(code)
  return credential.user
}

// ── Email magic link (free, no SMS cost) ──────────────────────────────────
export async function sendEmailLink(email) {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  window.localStorage.setItem('nightmatch_email_signin', email)
}

export function hasPendingEmailLink() {
  if (!FIREBASE_CONFIGURED) return false
  return isSignInWithEmailLink(auth, window.location.href)
}

export async function completeEmailLink() {
  if (!FIREBASE_CONFIGURED) return null
  if (!isSignInWithEmailLink(auth, window.location.href)) return null
  const email = window.localStorage.getItem('nightmatch_email_signin')
  if (!email) return null
  const result = await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem('nightmatch_email_signin')
  // Clean the URL so the link isn't reused
  window.history.replaceState(null, '', window.location.pathname)
  return result.user
}

// ── Google Sign-In (free) ─────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  return result.user
}

// ── Apple Sign-In (free, requires Apple Developer setup) ──────────────────
export async function signInWithApple() {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured')
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOut() {
  if (!FIREBASE_CONFIGURED) return
  await fbSignOut(auth)
}

export function getCurrentFirebaseUser() {
  if (!FIREBASE_CONFIGURED) return null
  return auth.currentUser
}

export function onAuthStateChanged(callback) {
  if (!FIREBASE_CONFIGURED) { callback(null); return () => {} }
  return auth.onAuthStateChanged(callback)
}
