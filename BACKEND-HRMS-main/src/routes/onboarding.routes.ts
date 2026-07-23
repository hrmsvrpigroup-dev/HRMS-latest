import { Router } from 'express'

import { onboardingController } from '../controllers/onboarding.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'
import { onboardingUpload } from '../middleware/onboarding.middleware'

const router = Router()

router.get('/invite/:token', onboardingController.getInviteByToken)
router.post('/invite/:token/submit', onboardingUpload, onboardingController.submitOnboarding)

router.use(authenticate, authorize('ADMIN', 'HR'), tenantIsolation)

router.post('/invites', onboardingController.createInvite)
router.get('/invites', onboardingController.listInvites)
router.get('/invites/:inviteId', onboardingController.getInviteById)
router.get('/documents/:documentId', onboardingController.downloadDocument)
router.patch('/invites/:inviteId/documents/:documentId/review', onboardingController.reviewDocument)
router.post('/invites/:inviteId/approve', authorize('ADMIN'), onboardingController.approveInvite)

export default router
