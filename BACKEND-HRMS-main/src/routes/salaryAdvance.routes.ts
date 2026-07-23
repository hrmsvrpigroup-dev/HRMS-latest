import { Router } from 'express'
import { salaryAdvanceController } from '../controllers/salaryAdvance.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

const router = Router()

router.use(authenticate, tenantIsolation)

router.get('/stats',            authorize('HR', 'ADMIN'), salaryAdvanceController.getStats)
router.get('/',                 authorize('HR', 'ADMIN'), salaryAdvanceController.list)
router.post('/',                authorize('HR', 'ADMIN'), salaryAdvanceController.create)
router.patch('/:id/approve',    authorize('HR', 'ADMIN'), salaryAdvanceController.approve)
router.patch('/:id/reject',     authorize('HR', 'ADMIN'), salaryAdvanceController.reject)
router.patch('/:id/disburse',   authorize('HR', 'ADMIN'), salaryAdvanceController.disburse)
router.patch('/:id/repayment',  authorize('HR', 'ADMIN'), salaryAdvanceController.recordRepayment)

export default router
