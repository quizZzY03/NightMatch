import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import CheckIn from './pages/CheckIn'
import Feed from './pages/Feed'
import Matches from './pages/Matches'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'
import PhoneAuth from './pages/PhoneAuth'
import Admin from './pages/Admin'
import Terms from './pages/Terms'

function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="particle" style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          background: i % 3 === 0 ? 'hsl(290,100%,65%)' : i % 3 === 1 ? 'hsl(320,100%,60%)' : 'hsl(185,100%,55%)',
          animationDuration: `${10 + Math.random() * 14}s`,
          animationDelay: `${Math.random() * 12}s`,
          opacity: 0.25 + Math.random() * 0.35,
        }} />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl animate-float">🌙</div>
        <div className="text-white/30 text-sm font-medium">טוען...</div>
      </div>
    </div>
  )
}

export default function App() {
  const { initialized, needsAuth, needsOnboarding, onAuthSuccess, firebaseUser } = useApp()

  // Still waiting for Firebase auth to resolve
  if (!initialized && firebaseUser === undefined) {
    return (
      <div className="h-full relative">
        <Particles />
        <div className="relative z-10 h-full"><Spinner /></div>
      </div>
    )
  }

  // Phone auth required
  if (needsAuth) {
    return (
      <div className="h-full relative">
        <Particles />
        <div className="relative z-10 h-full">
          <PhoneAuth onSuccess={onAuthSuccess} />
        </div>
      </div>
    )
  }

  // Onboarding (new user — no profile yet)
  if (needsOnboarding) {
    return (
      <div className="h-full relative">
        <Particles />
        <div className="relative z-10 h-full"><Onboarding /></div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="h-full relative">
        <Particles />
        <div className="relative z-10 h-full"><Spinner /></div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <Particles />
      <div className="relative z-10 h-full">
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/chat/:matchId" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </div>
  )
}
