import { Router } from 'express'
import { attendanceController } from '../controllers/attendance.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

const router = Router()

router.use(authenticate, authorize('ADMIN', 'HR', 'EMPLOYEE'), tenantIsolation)

router.get('/', attendanceController.list)
router.post('/clock-in', attendanceController.clockIn)
router.post('/clock-out', attendanceController.clockOut)
router.get('/today', attendanceController.todayStatus)
router.post('/idle', attendanceController.logIdle)
router.delete('/:id/reset', attendanceController.resetShift)
router.post('/:id/continue', attendanceController.continueShift)
router.post('/manual-clock-in', authorize('ADMIN', 'HR'), attendanceController.manualClockIn)

export default router