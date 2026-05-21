import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCmOG51fsTnuAeEmN1rG084mfaJhbenRrk",
  authDomain: "nightmatch-34424.firebaseapp.com",
  projectId: "nightmatch-34424",
  storageBucket: "nightmatch-34424.firebasestorage.app",
  messagingSenderId: "1006217179219",
  appId: "1:1006217179219:web:a2a46ca155fac47f5d16a6",
  measurementId: "G-GTDD0HRKV9"
}

export const FIREBASE_CONFIGURED = true

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
