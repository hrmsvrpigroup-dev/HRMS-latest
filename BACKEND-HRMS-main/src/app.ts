import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import helmet from 'helmet'
import morgan from 'morgan'

import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { resolveTenant } from './middleware/tenant.middleware'

dotenv.config()

const app = express()

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://hrmsvrpigroup.com',
  'https://www.hrmsvrpigroup.com'
]

// Add FRONTEND_URL from env (e.g. Vercel deployment URL)
if (process.env.FRONTEND_URL) {
  const frontendUrls = process.env.FRONTEND_URL.split(',').map(u => u.trim())
  frontendUrls.forEach(url => {
    if (url && !allowedOrigins.includes(url)) {
      allowedOrigins.push(url)
    }
  })
}

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true)
      
      let isAllowed = allowedOrigins.includes(origin) || 
                      origin.startsWith('http://localhost:') || 
                      origin.startsWith('http://127.0.0.1:')

      try {
        const originHost = new URL(origin).hostname
        
        // Allow any subdomain on localhost for development (e.g. tenant.localhost, superadmin.localhost)
        if (originHost.endsWith('.localhost') || originHost === 'localhost') {
          isAllowed = true
        }

        // Allow any subdomain of production allowed origins (e.g. tenant.domain.com, superadmin.domain.com)
        if (!isAllowed) {
          isAllowed = allowedOrigins.some(allowed => {
            try {
              const allowedHost = new URL(allowed).hostname
              return originHost === allowedHost || originHost.endsWith('.' + allowedHost)
            } catch {
              return false
            }
          })
        }
      } catch (err) {
        console.error('CORS URL parsing error:', err)
      }

      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Health check route that bypasses tenant resolution
app.get('/api/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'HRMS API is healthy',
    timestamp: new Date().toISOString(),
  })
})

app.use(resolveTenant)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app

