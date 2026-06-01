import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: { '@': '/src' }
  },
  // Strip console.log and debugger from production bundles
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        }
      }
    }
  }
}))
