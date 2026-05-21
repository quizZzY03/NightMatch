# NightMatch — Project Context for Claude Code

## What is this?
A nightlife dating app (React + Vite + Firebase). Users check in to venues via QR code + GPS, swipe on people at the same venue, and match in real time. Sessions reset nightly at 06:00.

## Tech Stack
- React 18 + Vite 5 + Tailwind CSS 3
- Framer Motion (animations)
- React Router v6
- Firebase Auth (Google, Apple, Phone, Email Magic Link)
- Firestore (real-time)
- PWA with push notifications

## Firebase Project
- Project ID: `nightmatch-34424`
- `FIREBASE_CONFIGURED = true` in `src/firebase/config.js`
- Real credentials are already in the config file

## Key Architecture Rules
- Demo user has `id: 'demo-user'` and `is_demo: true` — must route to **localStorage**, NOT Firebase
- All db.js functions check `!FIREBASE_CONFIGURED || userId === 'demo-user'` to decide which layer to use
- Session key = `venue_id::YYYY-MM-DD` (day boundary at 06:00 AM via `todayKey()` in geo.js)
- Test account phone: `+972500000000` (add to Firebase Console test phone numbers with code `123456`)

## File Structure
```
src/
  pages/         Home, Feed, Matches, Chat, Profile, CheckIn, Onboarding, PhoneAuth
  components/    Layout, SwipeCard, MatchModal, SuperLikeModal, Avatar, GpsVerify, QRScanner, NeonButton, CountdownTimer
  context/       AppContext.jsx  ← central state, Firebase auth, user/checkin/matches
  firebase/      config.js, auth.js, db.js
  utils/         storage.js (localStorage layer), i18n.js, geo.js, seedTestData.js
  hooks/         usePushNotifications.js, useCountdown.js
```

## Important Patterns
- `AppContext` provides: `user, checkin, matches, lang, isRTL, needsAuth, needsOnboarding, updateUser, refreshCheckin`
- `needsAuth = firebaseUser === null` → shows PhoneAuth
- `needsOnboarding = initialized && !user?.onboarding_complete` → shows Onboarding
- `load()` in AppContext is wrapped in try/catch/finally — `setInitialized(true)` always runs
- Demo mode: `startDemo()` in storage.js, triggered from Home page only (not PhoneAuth, not Onboarding)

## Language
- App is bilingual: Hebrew (RTL, default) + English
- All strings via `t(lang, key)` from `src/utils/i18n.js`
- `isRTL = lang === 'he'`

## Premium / Super Likes
- 3 free super likes per night
- Premium codes stored as djb2 hashes in storage.js (not plaintext)
- Premium activated via `activatePremiumCode(code)` or `is_premium: true` on user

## Dev Tools
- Long-press the "👤 פרופיל" header in Profile page (2 sec) → reveals seed/clear test users panel
- Test accounts (`is_test_account: true`) see dev tools without long-press
- `seedTestCheckins(venueId)` — seeds 10 test users (5F + 5M) with randomuser.me photos

## Firestore Security Rules (must be applied in Firebase Console)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /venues/{venueId} {
      allow read: if true;
      allow write: if false;
    }
    match /checkins/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
    match /matches/{matchId} {
      allow read, write: if request.auth != null
                         && (resource.data.user1_id == request.auth.uid || resource.data.user2_id == request.auth.uid);
      allow create: if request.auth != null
                    && (request.resource.data.user1_id == request.auth.uid || request.resource.data.user2_id == request.auth.uid);
    }
    match /messages/{msgId} {
      allow read, write: if request.auth != null
                         && exists(/databases/$(database)/documents/matches/$(resource.data.match_id))
                         && (get(/databases/$(database)/documents/matches/$(resource.data.match_id)).data.user1_id == request.auth.uid
                          || get(/databases/$(database)/documents/matches/$(resource.data.match_id)).data.user2_id == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.sender_id == request.auth.uid;
    }
    match /likes/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.from_user_id == request.auth.uid;
      allow delete: if request.auth != null && resource.data.from_user_id == request.auth.uid;
    }
  }
}
```

## Known Working State
- Auth: Google ✅ Apple ✅ Phone (needs region enabled in Firebase Console) ✅ Email magic link ✅
- Onboarding saves with `await updateUser(...)` — profile persists across sessions
- Chat finds matches from AppContext state (Firebase) with localStorage fallback
- Bio field is saved in checkin and returned in feed
- reCAPTCHA fix: container innerHTML cleared before new RecaptchaVerifier

## Pending / Not Done
- Real payment (Stripe) — currently "בקרוב" placeholder
- Server-side GPS verification (currently client-side only)
- Admin panel for QR code generation
- Venues must be added manually to Firestore `venues` collection with fields: `name, lat, lng, geofence_radius, is_active, city`
