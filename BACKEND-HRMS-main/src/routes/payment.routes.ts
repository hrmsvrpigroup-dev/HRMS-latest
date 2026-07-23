import { Router } from 'express'
import { paymentController } from '../controllers/payment.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// All payment routes should be protected
router.use(authenticate)

router.post('/create-order', paymentController.createOrder)
router.post('/verify', paymentController.verifyPayment)
router.post('/verify-subscription', paymentController.verifySubscriptionPayment)

router.post('/phonepe/create-order', paymentController.createPhonePeOrder)
router.post('/phonepe/verify', paymentController.verifyPhonePePayment)

export default router
