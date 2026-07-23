import { Router } from 'express'
import { mobileQrController } from '../controllers/mobileQr.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// Create session — employee must be logged in on desktop
router.post('/create', authenticate, mobileQrController.createSession)

// Verify selfie — called from mobile (no JWT, uses session token instead)
router.post('/verify', mobileQrController.verifySelfie)

// Check session status — called by desktop after socket event
router.get('/status/:sessionId', mobileQrController.getSessionStatus)

export default router
