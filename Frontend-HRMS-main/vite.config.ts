import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file for the current mode (.env, .env.development, .env.production, etc.)
  const env = loadEnv(mode, process.cwd(), '')

  const getApiUrl = () => {
    let url = env.VITE_API_URL
    if (!url || url.includes('your-backend')) {
      return 'https://hrms1-kk6q.onrender.com/api'
    }
    url = url.trim()
    if (!url.endsWith('/api')) {
      url = url.replace(/\/$/, '') + '/api'
    }
    return url
  }

  const getWsUrl = () => {
    let url = env.VITE_WS_URL
    if (!url || url.includes('your-backend')) {
      return 'wss://hrms1-kk6q.onrender.com'
    }
    url = url.trim().replace(/\/$/, '')
    if (url.endsWith('/api')) {
      url = url.slice(0, -4)
    }
    if (url.startsWith('https://')) {
      url = 'wss://' + url.substring(8)
    } else if (url.startsWith('http://')) {
      url = 'ws://' + url.substring(7)
    }
    return url
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(getApiUrl()),
      'import.meta.env.VITE_WS_URL': JSON.stringify(getWsUrl()),
    }
  }
})


