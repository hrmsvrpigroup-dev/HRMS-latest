import multer from 'multer'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

export const ONBOARDING_FILE_FIELDS = [
  'profilePhoto',
  'resume',
  'aadhaar',
  'panCard',
  'educationCertificates',
  'experienceLetters',
  'offerLetterSignedCopy',
  'previousPayslips',
]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, acceptFile?: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error('Only pdf, jpg, jpeg, and png files are allowed.'))
    }
    callback(null, true)
  },
})

export const onboardingUpload = upload.fields(
  ONBOARDING_FILE_FIELDS.map((name) => ({ name, maxCount: 1 }))
)
