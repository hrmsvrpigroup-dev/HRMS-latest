import { Router } from 'express'

import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/login', authController.login)
router.post('/refresh', authController.refreshToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)
router.get('/me', authenticate, authController.me)
router.get('/check-ip', authController.checkIp)
router.post('/register', authController.register)

export default router

