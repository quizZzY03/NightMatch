/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a12',
        'neon-purple': 'hsl(290, 100%, 65%)',
        'neon-pink': 'hsl(320, 100%, 60%)',
        'neon-cyan': 'hsl(185, 100%, 55%)',
        glass: 'rgba(255,255,255,0.06)',
        'glass-border': 'rgba(255,255,255,0.12)',
      },
      fontFamily: {
        sans: ['Heebo', 'Inter', 'sans-serif'],
        hebrew: ['Heebo', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px hsl(290,100%,65%,0.5), 0 0 40px hsl(290,100%,65%,0.2)',
        'neon-pink': '0 0 20px hsl(320,100%,60%,0.5), 0 0 40px hsl(320,100%,60%,0.2)',
        'neon-cyan': '0 0 20px hsl(185,100%,55%,0.5), 0 0 40px hsl(185,100%,55%,0.2)',
        glass: '0 8px 32px rgba(0,0,0,0.4)',
      },
      backdropBlur: { glass: '12px' },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { textShadow: '0 0 10px hsl(290,100%,65%), 0 0 20px hsl(290,100%,65%)' },
          to: { textShadow: '0 0 20px hsl(320,100%,60%), 0 0 40px hsl(320,100%,60%)' },
        },
      },
    },
  },
  plugins: [],
}
