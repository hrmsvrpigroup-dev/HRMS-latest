import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { adminController } from '../controllers/admin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/rbac.middleware'
import { tenantIsolation } from '../middleware/tenant.middleware'

const router = Router()

// Setup multer for profile picture upload
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'))
    }
  },
})

router.use(authenticate, authorize('ADMIN'), tenantIsolation)

router.get('/dashboard', adminController.dashboard)
router.get('/hrs', adminController.listHRs)
router.post('/hrs', adminController.createHR)
router.delete('/hrs/:id', adminController.deleteHR)

// Provision HR Operator Module Routes
router.post('/hr-operators/provision', upload.single('profilePicture'), adminController.provisionHROperator)
router.get('/departments', adminController.getDepartments)
router.get('/branches', adminController.getBranches)
router.get('/roles', adminController.getRoles)
router.get('/permissions', adminController.getPermissions)
router.get('/attendance-summary', adminController.getAttendanceCalendarSummary)
router.get('/attendance/details', adminController.getAttendanceDetails)
router.get('/employees/:id/portfolio', adminController.getEmployeePortfolio)

export default router
