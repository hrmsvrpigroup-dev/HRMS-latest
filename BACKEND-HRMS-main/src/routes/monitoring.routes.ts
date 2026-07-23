import { Router } from 'express'

import { monitoringController } from '../controllers/monitoring.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

const router = Router()

router.use(authenticate, tenantIsolation)
router.get('/screenshots', authorize('ADMIN', 'HR'), monitoringController.screenshots)
router.post('/screenshots', authorize('EMPLOYEE'), monitoringController.uploadScreenshot)

export default router

