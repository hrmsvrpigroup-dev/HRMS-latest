import { Router } from 'express'
import { superAdminController } from '../controllers/superadmin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'

const router = Router()

router.use(authenticate, authorize('SUPER_ADMIN'))

import multer from 'multer'
import fs from 'fs'
import path from 'path'

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'companies')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, uploadDir)
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const uploadFields = upload.fields([
  { name: 'companyRegistrationCertificate', maxCount: 1 },
  { name: 'taxDocuments', maxCount: 1 },
  { name: 'ndaAgreements', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
])

router.get('/dashboard', superAdminController.dashboard)
router.get('/companies', superAdminController.listCompanies)
router.post('/companies', superAdminController.createCompany)
router.post('/companies/full', uploadFields, superAdminController.createCompanyWithFullDetails)
router.get('/companies/:id/invoice', superAdminController.downloadInvoice)
router.patch('/companies/:id/status', superAdminController.toggleCompanyStatus)
router.get('/companies/:id', superAdminController.getCompany)
router.put('/companies/:id/full', uploadFields, superAdminController.updateCompanyFull)
router.post('/companies/:id/credits', superAdminController.addCredits)
router.post('/companies/:id/document-request', superAdminController.sendDocumentRequest)
router.post('/companies/:id/resend-credentials', superAdminController.resendCredentials)
router.delete('/companies/:id', superAdminController.deleteCompany)

// Documents API
router.get('/documents', superAdminController.getDocuments)
router.post('/documents/upload', upload.single('file'), superAdminController.uploadDocument)
router.post('/documents/:id/replace', upload.single('file'), superAdminController.replaceDocument)
router.delete('/documents/:id', superAdminController.deleteDocument)

export default router
