import { Router } from 'express'

import { creditController } from '../controllers/credit.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

const router = Router()

router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), tenantIsolation)
router.get('/', creditController.list)
router.get('/balance', creditController.balance)

export default router

