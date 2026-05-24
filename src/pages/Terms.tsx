import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Terms() {
  const { lang, isRTL } = useApp()
  const navigate = useNavigate()
  const he = lang === 'he'

  const sections = he ? [
    {
      title: '1. שירות NightMatch',
      body: 'NightMatch היא פלטפורמה לחיבורים חברתיים בזמן אמת בין אנשים הנמצאים באותו מקום פיזי. השירות מופעל בישראל ומיועד למשתמשים מגיל 18 ומעלה בלבד.',
    },
    {
      title: '2. גיל מינימלי',
      body: 'השימוש באפליקציה מותר לבני 18 ומעלה בלבד. על ידי שימוש בשירות, אתה מאשר שאתה בן 18 לפחות.',
    },
    {
      title: '3. תוכן והתנהגות',
      body: 'אסור לפרסם תוכן פוגעני, הטרדות מיניות, גזענות, או תוכן לא חוקי. NightMatch שומרת לעצמה הזכות להסיר תכנים ולהשעות חשבונות בכל עת.',
    },
    {
      title: '4. פרטיות ונתונים',
      body: 'אנו אוספים מידע שאתה מסכים לשתף (שם, גיל, תמונה, מיקום כללי לצ\'ק-אין). הנתונים מאוחסנים ב-Firebase (Google) בשרתים מאובטחים. פרופילים מתאפסים אוטומטית בתום כל לילה.',
    },
    {
      title: '5. מיקום',
      body: 'האפליקציה משתמשת ב-GPS לצורך אימות שאתה נמצא פיזית בוונה. נתוני המיקום אינם נשמרים לאחר הצ\'ק-אין.',
    },
    {
      title: '6. ביטול חשבון',
      body: 'תוכל למחוק את חשבונך בכל עת דרך הפרופיל שלך. עם המחיקה, כל הנתונים שלך יוסרו לצמיתות.',
    },
    {
      title: '7. הגבלת אחריות',
      body: 'NightMatch אינה אחראית לתוצאות המפגשים בין משתמשים. השירות ניתן "כמות שהוא" (as-is) ללא אחריות מכל סוג.',
    },
    {
      title: '8. צור קשר',
      body: 'לשאלות ופניות: support@nightmatch.app',
    },
  ] : [
    {
      title: '1. NightMatch Service',
      body: 'NightMatch is a real-time social connection platform between people at the same physical venue. The service is intended for users aged 18 and over.',
    },
    {
      title: '2. Minimum Age',
      body: 'Use of the app is permitted to users aged 18 and over only. By using the service, you confirm that you are at least 18 years old.',
    },
    {
      title: '3. Content & Behavior',
      body: 'Posting offensive content, sexual harassment, racism, or illegal content is strictly prohibited. NightMatch reserves the right to remove content and suspend accounts at any time.',
    },
    {
      title: '4. Privacy & Data',
      body: 'We collect information you agree to share (name, age, photo, general location for check-in). Data is stored on Firebase (Google) secure servers. Profiles reset automatically at the end of each night.',
    },
    {
      title: '5. Location',
      body: 'The app uses GPS to verify you are physically present at the venue. Location data is not stored after check-in.',
    },
    {
      title: '6. Account Deletion',
      body: 'You can delete your account at any time through your profile. Upon deletion, all your data will be permanently removed.',
    },
    {
      title: '7. Limitation of Liability',
      body: 'NightMatch is not responsible for the outcomes of meetings between users. The service is provided "as-is" without warranty of any kind.',
    },
    {
      title: '8. Contact',
      body: 'For questions and inquiries: support@nightmatch.app',
    },
  ]

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-4 pt-6 pb-12 max-w-lg mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm">
            {isRTL ? '›' : '‹'} {he ? 'חזרה' : 'Back'}
          </button>
          <div className="text-3xl mb-3">📋</div>
          <h1 className="text-2xl font-black text-white mb-1">
            {he ? 'תנאי שימוש ופרטיות' : 'Terms & Privacy'}
          </h1>
          <p className="text-white/40 text-sm">
            {he ? 'עודכן לאחרונה: מאי 2026' : 'Last updated: May 2026'}
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-5">
          {sections.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card border border-white/8 rounded-2xl p-4">
              <h2 className="font-bold text-white text-sm mb-2">{s.title}</h2>
              <p className="text-white/50 text-sm leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-white/20 text-xs">© 2026 NightMatch · All rights reserved</p>
        </div>
      </div>
    </div>
  )
}
