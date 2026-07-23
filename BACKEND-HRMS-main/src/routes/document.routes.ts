import { Router } from 'express'

import { documentController } from '../controllers/document.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(authenticate, authorize('ADMIN', 'HR', 'EMPLOYEE'), tenantIsolation)
router.get('/', documentController.list)
router.post('/', upload.single('file'), documentController.upload)
router.put('/:id', upload.single('file'), documentController.replace)
router.put('/:id/verify', documentController.verify)
router.delete('/:id', documentController.delete)

export default router

