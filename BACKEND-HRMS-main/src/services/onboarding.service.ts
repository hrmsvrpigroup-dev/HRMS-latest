import { randomBytes } from 'crypto'
import fs from 'fs/promises'
import path from 'path'

import { CreditType, EmployeeStatus, UserRole } from '@prisma/client'

import { prisma } from '../config/database'
import { hashPassword } from '../utils/password.utils'
import { notificationService } from './notification.service'

let baseFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
try {
  baseFrontendUrl = new URL(baseFrontendUrl).origin
} catch (e) {
  baseFrontendUrl = baseFrontendUrl.replace(/\/login\/?$/, '')
}
const FRONTEND_URL = baseFrontendUrl.replace(/\/$/, '')
const STORAGE_ROOT = path.join(__dirname, '../../storage/onboarding')
const INVITE_EXPIRY_DAYS = 7
const TEMP_PASSWORD_EXPIRY_DAYS = 30
const EMPLOYEE_ONBOARDING_COST = 37

const DOCUMENT_FIELD_LABELS: Record<string, string> = {
  profilePhoto: 'Profile Photo',
  resume: 'Resume',
  aadhaar: 'Aadhaar',
  panCard: 'PAN Card',
  educationCertificates: 'Education Certificates',
  experienceLetters: 'Experience Letters',
  offerLetterSignedCopy: 'Offer Letter Signed Copy',
  previousPayslips: 'Previous Payslips',
}

const SUPPORTED_REVIEW_STATUSES = new Set(['pending', 'submitted', 'under_review', 'verified', 'rejected', 'approved'])

type InviteInput = {
  firstName: string
  lastName: string
  personalEmail: string
  phoneNumber?: string
  department: string
  designation: string
  employmentType: string
  joiningDate: string
  baseSalary: number
  workLocation?: string
  experienceLevel?: string
}

type SubmissionPayload = {
  personalDetails?: Record<string, unknown>
  addressDetails?: Record<string, unknown>
  employmentDetails?: Record<string, unknown>
  payrollDetails?: Record<string, unknown>
  preferredEmployeeId?: string
  reportingManager?: string
}

type ReviewDecision = 'approved' | 'rejected'

type DocumentBucket = Record<string, Express.Multer.File[] | undefined>

const buildCompanyPortalUrl = (subdomain?: string, origin?: string) => {
  return 'https://hrmsvrpigroup.com/login'
}
const buildOnboardingLink = (token: string) => `${FRONTEND_URL}/onboarding/${token}`
const buildWelcomeLink = (inviteId: string) => `${FRONTEND_URL}/admin/onboarding/welcome/${inviteId}`
const buildPasswordResetLink = (token: string, subdomain?: string, origin?: string) => {
  const base = origin || FRONTEND_URL
  const parsed = new URL(base)
  if (subdomain === 'superadmin') {
    let hostname = parsed.hostname
    if (hostname !== 'localhost') {
      const parts = hostname.split('.')
      if (parts.length > 2) {
        hostname = parts.slice(-2).join('.')
      }
      parsed.hostname = `${subdomain}.${hostname}`
    } else {
      parsed.hostname = `${subdomain}.localhost`
    }
  }
  parsed.pathname = '/reset-password'
  parsed.searchParams.set('token', token)
  return parsed.toString()
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'employee'

const createSecureToken = () => randomBytes(32).toString('hex')

const createTempPassword = () => `Temp-${randomBytes(6).toString('base64url')}`

const getFieldLabel = (field: string) => DOCUMENT_FIELD_LABELS[field] || field

const getExtension = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase()
  return ext || '.bin'
}

const ensureStorageDir = async (inviteId: string) => {
  const dir = path.join(STORAGE_ROOT, inviteId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

const buildCompanyName = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, subdomain: true },
  })

  return {
    name: tenant?.name || 'Company',
    subdomain: tenant?.subdomain || 'company',
  }
}

const generateUniqueEmployeeCode = async (tenantId: string, subdomain: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString('hex').toUpperCase()
    const employeeCode = `EMP-${subdomain.slice(0, 4).toUpperCase()}-${suffix}`
    const existing = await prisma.employee.findUnique({
      where: { tenantId_employeeCode: { tenantId, employeeCode } },
      select: { id: true },
    })
    if (!existing) {
      return employeeCode
    }
  }

  throw new Error('Unable to generate a unique employee code.')
}

const generateUniqueUsername = async (tenantId: string, firstName: string, lastName: string) => {
  const base = `${slugify(firstName)}.${slugify(lastName)}`

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(2).toString('hex')
    const username = `${base}.${suffix}`
    const existing = await prisma.user.findFirst({
      where: { tenantId, username },
      select: { id: true },
    })
    if (!existing) {
      return username
    }
  }

  throw new Error('Unable to generate a unique username.')
}

const generateUniqueLoginEmail = async (username: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${username}@hrms.local`
    const existing = await prisma.user.findUnique({
      where: { email: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
  }

  throw new Error('Unable to generate a unique login email.')
}

const buildInvitationEmail = (params: {
  companyName: string
  firstName: string
  lastName: string
  link: string
  expiryLabel: string
}) => {
  const { companyName, firstName, lastName, link, expiryLabel } = params
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 12px;font-size:24px;">Complete your secure onboarding</h2>
        <p style="font-size:15px;line-height:1.7;">Hello ${firstName} ${lastName},</p>
        <p style="font-size:15px;line-height:1.7;">
          ${companyName} has started your employee onboarding workflow. Please use the secure link below to complete your profile, upload required documents, and confirm your payroll and employment details.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#475569;">
          This link expires on <strong>${expiryLabel}</strong> and is uniquely tied to your onboarding request.
        </p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:14px;font-weight:700;">
          Start Onboarding
        </a>
        <p style="font-size:13px;line-height:1.6;color:#64748b;">
          For security, please do not forward this link to anyone else.
        </p>
      </div>
    </div>
  `
}

const buildSubmissionEmail = (params: { companyName: string; firstName: string; lastName: string }) => {
  const { companyName, firstName, lastName } = params
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 12px;font-size:22px;">Onboarding submitted</h2>
        <p style="font-size:15px;line-height:1.7;">${firstName} ${lastName} has completed the onboarding form for ${companyName}.</p>
        <p style="font-size:15px;line-height:1.7;">Please review the submitted documents from the HR onboarding panel.</p>
      </div>
    </div>
  `
}

const buildWelcomeEmail = (params: {
  companyName: string
  employeeName: string
  employeeId: string
  loginEmail: string
  username: string
  tempPassword: string
  joiningDateLabel: string
  department: string
  hrContact?: string
  resetLink: string
  portalUrl: string
}) => {
  const {
    companyName,
    employeeName,
    employeeId,
    loginEmail,
    username,
    tempPassword,
    joiningDateLabel,
    department,
    hrContact,
    resetLink,
    portalUrl,
  } = params

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 12px;font-size:24px;">Welcome to ${companyName}</h2>
        <p style="font-size:15px;line-height:1.7;">Hello ${employeeName}, your employee account has been activated.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0 8px;">
          <tr><td style="padding:8px 0;color:#64748b;">Employee ID</td><td style="padding:8px 0;font-weight:700;">${employeeId}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Login Email</td><td style="padding:8px 0;font-weight:700;">${loginEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Username</td><td style="padding:8px 0;font-weight:700;">${username}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Temporary Password</td><td style="padding:8px 0;font-weight:700;">${tempPassword}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Joining Date</td><td style="padding:8px 0;font-weight:700;">${joiningDateLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Department</td><td style="padding:8px 0;font-weight:700;">${department}</td></tr>
        </table>
        <a href="${portalUrl}" style="display:inline-block;margin:20px 0;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:14px;font-weight:700;">
          Open Employee Portal
        </a>
        <p style="font-size:14px;line-height:1.7;color:#334155;">
          You will be prompted to reset your password on first login.
        </p>
        <p style="font-size:14px;line-height:1.7;color:#334155;">
          Password reset link: <a href="${resetLink}">${resetLink}</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#64748b;">
          Security notice: keep your login credentials confidential and change your password immediately after signing in.
        </p>
        ${hrContact ? `<p style="font-size:13px;line-height:1.6;color:#64748b;">HR contact: ${hrContact}</p>` : ''}
      </div>
    </div>
  `
}

const createStatusLog = async (params: {
  tenantId: string
  inviteId: string
  previousStatus: string | null
  nextStatus: string
  action: string
  actorId?: string | null
  notes?: string | null
  tx?: any
}) => {
  const { tx, ...data } = params
  const client = tx || prisma
  return client.onboardingStatusLog.create({
    data: {
      tenantId: data.tenantId,
      inviteId: data.inviteId,
      previousStatus: data.previousStatus ?? undefined,
      nextStatus: data.nextStatus,
      action: data.action,
      actorId: data.actorId ?? null,
      notes: data.notes ?? null,
    },
  })
}

const getInviteInclude = () => ({
  tenant: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  documents: {
    include: {
      reviewedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      verifications: {
        include: {
          verifier: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
    },
    orderBy: { uploadedAt: 'desc' as const },
  },
  verifications: {
    include: {
      verifier: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      document: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  statusLogs: {
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  credentialsAudit: {
    include: {
      employee: true,
      employeeUser: true,
      issuedBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
  },
})

const normalizeReviewStatus = (status: string) => {
  const next = status.toLowerCase()
  if (!SUPPORTED_REVIEW_STATUSES.has(next)) {
    throw new Error('Invalid onboarding status.')
  }
  return next
}

const mapInviteResponse = (invite: any) => ({
  ...invite,
  onboardingUrl: buildOnboardingLink(invite.token),
  documentSummary: {
    total: invite.documents?.length || 0,
    approved: invite.documents?.filter((doc: any) => doc.status === 'approved').length || 0,
    rejected: invite.documents?.filter((doc: any) => doc.status === 'rejected').length || 0,
    pending: invite.documents?.filter((doc: any) => doc.status === 'pending').length || 0,
  },
})

const storeUploadedFiles = async (inviteId: string, files: DocumentBucket | undefined) => {
  const inviteDir = await ensureStorageDir(inviteId)
  const uploads: Array<{
    documentType: string
    originalName: string
    storedName: string
    storagePath: string
    mimeType: string
    fileSize: number
  }> = []

  const fileEntries = Object.entries(files || {})
  for (const [fieldName, fileList] of fileEntries) {
    const file = fileList?.[0]
    if (!file) continue

    const documentType = getFieldLabel(fieldName)
    const storedName = `${fieldName}-${Date.now()}-${randomBytes(6).toString('hex')}${getExtension(file.originalname)}`
    const storagePath = path.join(inviteDir, storedName)
    await fs.writeFile(storagePath, file.buffer)

    uploads.push({
      documentType,
      originalName: file.originalname,
      storedName,
      storagePath,
      mimeType: file.mimetype,
      fileSize: file.size,
    })
  }

  return uploads
}

const deriveInviteStatus = (documents: any[]) => {
  if (!documents.length) return 'submitted'
  if (documents.some((doc) => doc.status === 'rejected')) return 'rejected'
  if (documents.every((doc) => doc.status === 'approved')) return 'verified'
  if (documents.some((doc) => doc.status === 'approved')) return 'under_review'
  return 'submitted'
}

const generateCredentials = async (params: {
  tenantId: string
  subdomain: string
  firstName: string
  lastName: string
}) => {
  const { tenantId, subdomain, firstName, lastName } = params
  const employeeCode = await generateUniqueEmployeeCode(tenantId, subdomain)
  const username = await generateUniqueUsername(tenantId, firstName, lastName)
  const loginEmail = await generateUniqueLoginEmail(username)
  const temporaryPassword = createTempPassword()
  const temporaryPasswordHash = await hashPassword(temporaryPassword)
  const resetToken = createSecureToken()
  const resetExpiry = new Date(Date.now() + TEMP_PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  return {
    employeeCode,
    username,
    loginEmail,
    temporaryPassword,
    temporaryPasswordHash,
    resetToken,
    resetExpiry,
  }
}

export const onboardingService = {
  async createInvite(input: InviteInput, createdById: string, tenantId: string) {
    const { name: companyName, subdomain } = await buildCompanyName(tenantId)
    const existingDuplicate = await prisma.onboardingInvite.findFirst({
      where: {
        tenantId,
        personalEmail: input.personalEmail.toLowerCase(),
        status: { in: ['pending', 'submitted', 'under_review', 'verified'] },
      },
      select: { id: true, token: true, status: true },
    })

    if (existingDuplicate) {
      throw new Error('An onboarding invite for this personal email already exists.')
    }

    const token = createSecureToken()
    const expiryAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    const invite = await prisma.onboardingInvite.create({
      data: {
        tenantId,
        token,
        expiryAt,
        createdById,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        personalEmail: input.personalEmail.toLowerCase().trim(),
        phoneNumber: input.phoneNumber?.trim() || null,
        department: input.department.trim(),
        designation: input.designation.trim(),
        employmentType: input.employmentType.trim(),
        joiningDate: new Date(input.joiningDate),
        baseSalary: Number(input.baseSalary) || 0,
        workLocation: input.workLocation?.trim() || null,
        experienceLevel: input.experienceLevel || 'fresher',
        status: 'pending',
      },
    })

    await createStatusLog({
      tenantId,
      inviteId: invite.id,
      previousStatus: null,
      nextStatus: 'pending',
      action: 'Invitation created',
      actorId: createdById,
    })

    const link = buildOnboardingLink(token)
    const expiryLabel = expiryAt.toLocaleDateString()
    await notificationService.sendEmail(
      invite.personalEmail,
      `Onboarding invitation from ${companyName}`,
      buildInvitationEmail({
        companyName,
        firstName: invite.firstName,
        lastName: invite.lastName,
        link,
        expiryLabel,
      })
    )

    return mapInviteResponse({
      ...invite,
      onboardingUrl: link,
      companyName,
      expiryLabel,
    })
  },

  async listInvites(tenantId: string) {
    const invites = await prisma.onboardingInvite.findMany({
      where: { tenantId },
      include: getInviteInclude(),
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return invites.map(mapInviteResponse)
  },

  async getInviteByToken(token: string) {
    const invite = await prisma.onboardingInvite.findUnique({
      where: { token },
      include: getInviteInclude(),
    })

    if (!invite) {
      throw new Error('Invalid onboarding link.')
    }

    if (invite.expiryAt < new Date() && invite.status !== 'approved') {
      const expiredInvite = await prisma.onboardingInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
        include: getInviteInclude(),
      })
      await createStatusLog({
        tenantId: invite.tenantId,
        inviteId: invite.id,
        previousStatus: invite.status,
        nextStatus: 'expired',
        action: 'Invite expired',
      })
      return mapInviteResponse(expiredInvite)
    }

    return mapInviteResponse(invite)
  },

  async getInviteById(inviteId: string, tenantId: string) {
    const invite = await prisma.onboardingInvite.findFirst({
      where: { id: inviteId, tenantId },
      include: getInviteInclude(),
    })

    if (!invite) {
      throw new Error('Onboarding invite not found.')
    }

    return mapInviteResponse(invite)
  },

  async submitOnboarding(token: string, rawPayload: string | undefined, files: DocumentBucket | undefined) {
    const invite = await prisma.onboardingInvite.findUnique({
      where: { token },
      include: { documents: true },
    })

    if (!invite) {
      throw new Error('Invalid onboarding link.')
    }

    if (invite.expiryAt < new Date()) {
      await prisma.onboardingInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      })
      throw new Error('This onboarding link has expired.')
    }

    if (invite.status === 'submitted' || invite.status === 'approved') {
      throw new Error('This onboarding form was already submitted.')
    }

    const payload = rawPayload ? (JSON.parse(rawPayload) as SubmissionPayload) : {}
    const uploads = await storeUploadedFiles(invite.id, files)

    const updated = await prisma.$transaction(async (tx) => {
      for (const upload of uploads) {
        await tx.onboardingDocument.create({
          data: {
            tenantId: invite.tenantId,
            inviteId: invite.id,
            documentType: upload.documentType,
            originalName: upload.originalName,
            storedName: upload.storedName,
            storagePath: upload.storagePath,
            mimeType: upload.mimeType,
            fileSize: upload.fileSize,
            status: 'pending',
          },
        })
      }

      const nextData = {
        ...payload,
        submittedOn: new Date().toISOString(),
        documents: uploads.map((upload) => ({
          documentType: upload.documentType,
          originalName: upload.originalName,
          storedName: upload.storedName,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        })),
      }

      const updatedInvite = await tx.onboardingInvite.update({
        where: { id: invite.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          onboardingData: nextData as any,
        },
      })

      await createStatusLog({
        tenantId: invite.tenantId,
        inviteId: invite.id,
        previousStatus: invite.status,
        nextStatus: 'submitted',
        action: 'Candidate submitted onboarding form',
        notes: 'Onboarding form completed by the employee.',
        tx,
      })

      return updatedInvite
    })

    const { name: companyName } = await buildCompanyName(invite.tenantId)
    const hrUsers = await prisma.user.findMany({
      where: {
        tenantId: invite.tenantId,
        role: { in: [UserRole.ADMIN, UserRole.HR] },
      },
      select: { email: true, firstName: true, lastName: true },
    })

    await Promise.all(
      hrUsers.map((hrUser) =>
        notificationService.sendEmail(
          hrUser.email,
          `Onboarding submitted - ${invite.firstName} ${invite.lastName}`,
          buildSubmissionEmail({
            companyName,
            firstName: invite.firstName,
            lastName: invite.lastName,
          })
        )
      )
    )

    return this.getInviteById(updated.id, invite.tenantId)
  },

  async reviewDocument(params: {
    inviteId: string
    documentId: string
    tenantId: string
    verifierId: string
    verifierRole: string
    decision: ReviewDecision
    comments?: string
  }) {
    const { inviteId, documentId, tenantId, verifierId, verifierRole, decision, comments } = params
    const invite = await prisma.onboardingInvite.findFirst({
      where: { id: inviteId, tenantId },
      include: { documents: true },
    })

    if (!invite) {
      throw new Error('Onboarding invite not found.')
    }

    const targetDocument = await prisma.onboardingDocument.findFirst({
      where: { id: documentId, inviteId, tenantId },
    })

    if (!targetDocument) {
      throw new Error('Document not found for this onboarding invite.')
    }

    const nextDocumentStatus = decision === 'approved' ? 'approved' : 'rejected'
    const updatedDocument = await prisma.onboardingDocument.update({
      where: { id: documentId },
      data: {
        status: nextDocumentStatus,
        reviewComment: comments || null,
        reviewedById: verifierId,
        reviewedAt: new Date(),
      },
    })

    await prisma.onboardingVerification.create({
      data: {
        tenantId,
        inviteId,
        documentId,
        verifierId,
        verifierRole,
        decision,
        comments: comments || null,
      },
    })

    const refreshedInvite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
      include: { documents: true },
    })

    const derivedStatus = deriveInviteStatus(refreshedInvite?.documents || [])
    const updatedInvite = await prisma.onboardingInvite.update({
      where: { id: inviteId },
      data: { status: derivedStatus },
    })

    await createStatusLog({
      tenantId,
      inviteId,
      previousStatus: invite.status,
      nextStatus: derivedStatus,
      action: `Document ${decision}`,
      actorId: verifierId,
      notes: comments || null,
    })

    return {
      invite: await this.getInviteById(inviteId, tenantId),
      document: updatedDocument,
    }
  },

  async approveInvite(params: {
    inviteId: string
    tenantId: string
    approverId: string
    origin?: string
  }) {
    const { inviteId, tenantId, approverId, origin } = params
    const invite = await prisma.onboardingInvite.findFirst({
      where: { id: inviteId, tenantId },
      include: getInviteInclude(),
    })

    if (!invite) {
      throw new Error('Onboarding invite not found.')
    }

    const pendingDocument = invite.documents.find((doc: any) => doc.status === 'pending')
    const rejectedDocument = invite.documents.find((doc: any) => doc.status === 'rejected')
    if (pendingDocument) {
      throw new Error('All documents must be reviewed before final approval.')
    }
    if (rejectedDocument) {
      throw new Error('Rejected documents must be resolved before final approval.')
    }

    const approvedDocTypes = invite.documents
      .filter((doc: any) => doc.status === 'approved')
      .map((doc: any) => doc.documentType)

    const requiredDocs = ['Aadhaar', 'PAN Card', 'Resume']
    if (invite.experienceLevel === 'experienced') {
      requiredDocs.push('Previous Payslips')
    }

    const missingDocs = requiredDocs.filter((req) => !approvedDocTypes.includes(req))
    if (missingDocs.length > 0) {
      throw new Error(
        `Cannot approve onboarding. The following required documents must be uploaded and approved: ${missingDocs.join(', ')}`
      )
    }

    const { name: companyName, subdomain } = await buildCompanyName(tenantId)
    const hrUsers = await prisma.user.findMany({
      where: { tenantId, role: UserRole.HR },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { createdAt: 'asc' },
    })
    const resolvedHrUserId = invite.createdBy?.role === UserRole.HR ? invite.createdById : hrUsers[0]?.id ?? null
    const credentials = await generateCredentials({
      tenantId,
      subdomain,
      firstName: invite.firstName,
      lastName: invite.lastName,
    })

    const joiningDateLabel = new Date(invite.joiningDate).toLocaleDateString()
    const resetLink = buildPasswordResetLink(credentials.resetToken, subdomain, origin)

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { credits: true },
      })

      if (!tenant) {
        throw new Error('Tenant company not found.')
      }

      if (tenant.credits < EMPLOYEE_ONBOARDING_COST) {
        throw new Error(
          `Insufficient credits. Onboarding an employee requires ${EMPLOYEE_ONBOARDING_COST.toLocaleString()} credits (current balance: ${tenant.credits.toLocaleString()}).`
        )
      }

      const department = await tx.department.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: invite.department,
          },
        },
        update: {},
        create: {
          tenantId,
          name: invite.department,
        },
      })

      const designation = await tx.designation.upsert({
        where: {
          tenantId_title_grade: {
            tenantId,
            title: invite.designation,
            grade: 'Standard',
          },
        },
        update: {},
        create: {
          tenantId,
          title: invite.designation,
          grade: 'Standard',
        },
      })

      const user = await tx.user.create({
        data: {
          tenantId,
          email: credentials.loginEmail,
          username: credentials.username,
          password: credentials.temporaryPasswordHash,
          role: UserRole.EMPLOYEE,
          firstName: invite.firstName,
          lastName: invite.lastName,
          phone: invite.phoneNumber || undefined,
          passwordResetToken: credentials.resetToken,
          passwordResetExpiry: credentials.resetExpiry,
          isActive: true,
        },
      })

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          employeeCode: credentials.employeeCode,
          firstName: invite.firstName,
          lastName: invite.lastName,
          email: credentials.loginEmail,
          personalEmail: invite.personalEmail,
          phone: invite.phoneNumber || undefined,
          joiningDate: invite.joiningDate,
          salaryGross: invite.baseSalary,
          status: EmployeeStatus.ACTIVE,
          departmentId: department.id,
          designationId: designation.id,
          hrUserId: resolvedHrUserId,
          gender: null,
          experienceLevel: invite.experienceLevel || 'fresher',
        },
      })

      // Extract onboarding data to populate Employee profile
      const onboardingData = (invite.onboardingData || {}) as SubmissionPayload
      const personal = onboardingData.personalDetails || {}
      const address = onboardingData.addressDetails || {}
      const payroll = onboardingData.payrollDetails || {}

      // 1. Create EmployeePayrollDetails with sync bank coordinates
      await tx.employeePayrollDetails.create({
        data: {
          employeeId: employee.id,
          salaryStructure: 'STANDARD',
          basicSalary: invite.baseSalary * 0.5, // BASIC is 50% of CTC
          paymentType: 'Bank Transfer',
          bankName: String(payroll.bankName || ''),
          accountNumber: String(payroll.accountNumber || ''),
          ifscCode: String(payroll.ifscCode || ''),
          panNumber: String(payroll.panNumber || ''),
          uanNumber: String(payroll.uanPfNumber || ''),
          pfEnabled: !!payroll.uanPfNumber, // Enable if UAN is provided
          esiEnabled: false,
        },
      })

      // 2. Create EmployeeAddress
      await tx.employeeAddress.create({
        data: {
          employeeId: employee.id,
          country: String(address.country || ''),
          state: String(address.state || ''),
          city: String(address.city || ''),
          addressLine1: String(address.currentAddress || ''),
          addressLine2: String(address.permanentAddress || ''),
          postalCode: String(address.pincode || ''),
        },
      })

      // 3. Create EmployeeEmergencyContact
      if (personal.emergencyContact) {
        await tx.employeeEmergencyContact.create({
          data: {
            employeeId: employee.id,
            name: String(personal.emergencyContact),
            relationship: 'Emergency Contact',
            mobile: String(personal.phoneNumber || invite.phoneNumber || ''),
          },
        })
      }

      // 4. Copy approved candidate OnboardingDocuments into dynamic documents explorer uploads
      const approvedDocs = invite.documents.filter((d: any) => d.status === 'approved')
      const dirName = `${employee.firstName.replace(/\s+/g, '')}${employee.lastName.replace(/\s+/g, '')}_${employee.employeeCode}`
      const employeeDir = path.join(process.cwd(), 'uploads', 'documents', dirName)

      await fs.mkdir(employeeDir, { recursive: true })

      for (const doc of approvedDocs) {
        const fieldNameMap: Record<string, string> = {
          'Profile Photo': 'profilePhoto',
          'Resume': 'resume',
          'Aadhaar': 'aadhaarCard', // map to HR fieldNames
          'PAN Card': 'panCard',
          'Education Certificates': 'educationalCertificates',
          'Experience Letters': 'experienceLetters',
          'Offer Letter Signed Copy': 'offerLetter',
          'Previous Payslips': 'previousPayslips',
        }
        const fieldName = fieldNameMap[doc.documentType] || 'document'
        const destName = `${fieldName}-${Date.now()}-${randomBytes(4).toString('hex')}${path.extname(doc.storedName)}`
        const destPath = path.join(employeeDir, destName)

        try {
          await fs.copyFile(doc.storagePath, destPath)
          
          let fileSize: number | null = null
          try {
            const stat = await fs.stat(doc.storagePath)
            fileSize = stat.size
          } catch (e) {}

          const fileUrl = `/uploads/documents/${dirName}/${destName}`

          await tx.employeeDocument.create({
            data: {
              employeeId: employee.id,
              documentType: fieldName,
              fileName: doc.originalName,
              fileUrl,
            },
          })

          await tx.document.create({
            data: {
              tenantId,
              employeeId: employee.id,
              name: doc.originalName,
              type: fieldName,
              fileUrl,
              fileSize,
              verified: true, // Candidate onboarding documents were already reviewed and approved
            },
          })
        } catch (copyErr) {
          console.error(`Failed to copy onboarding document ${doc.id} to dynamic documents folder:`, copyErr)
        }
      }

      const nextBalance = tenant.credits - EMPLOYEE_ONBOARDING_COST
      await tx.tenant.update({
        where: { id: tenantId },
        data: { credits: nextBalance },
      })

      await tx.creditTransaction.create({
        data: {
          tenantId,
          type: CreditType.DEBIT,
          amount: EMPLOYEE_ONBOARDING_COST,
          description: `Onboarded employee: ${credentials.employeeCode} (${credentials.loginEmail})`,
          balanceAfter: nextBalance,
        },
      })

      const audit = await tx.employeeCredentialsAudit.create({
        data: {
          tenantId,
          inviteId,
          employeeId: employee.id,
          employeeUserId: user.id,
          employeeCode: credentials.employeeCode,
          loginEmail: credentials.loginEmail,
          username: credentials.username,
          temporaryPasswordHash: credentials.temporaryPasswordHash,
          tempPasswordIssuedAt: new Date(),
          tempPasswordExpiresAt: credentials.resetExpiry,
          passwordResetRequired: true,
          firstLoginCompleted: false,
          issuedById: approverId,
        },
      })

      const updatedInvite = await tx.onboardingInvite.update({
        where: { id: inviteId },
        data: {
          status: 'approved',
          employeeId: employee.id,
          employeeUserId: user.id,
          workEmail: credentials.loginEmail,
          username: credentials.username,
        },
      })

      await createStatusLog({
        tenantId,
        inviteId,
        previousStatus: invite.status,
        nextStatus: 'approved',
        action: 'Employee approved and account activated',
        actorId: approverId,
        tx,
      })

      return { employee, user, updatedInvite, audit }
    })

    const hrContacts = await prisma.user.findMany({
      where: { tenantId, role: { in: [UserRole.ADMIN, UserRole.HR] } },
      select: { email: true, firstName: true, lastName: true },
      take: 5,
    })
    const hrContact = hrContacts[0] ? `${hrContacts[0].firstName} ${hrContacts[0].lastName} <${hrContacts[0].email}>` : undefined

    await notificationService.sendEmail(
      invite.personalEmail,
      `Welcome to ${companyName} - Your Employee Portal Access`,
      buildWelcomeEmail({
        companyName,
        employeeName: `${invite.firstName} ${invite.lastName}`,
        employeeId: result.audit.employeeCode,
        loginEmail: result.audit.loginEmail,
        username: result.audit.username,
        tempPassword: credentials.temporaryPassword,
        joiningDateLabel,
        department: invite.department,
        hrContact,
        resetLink,
        portalUrl: buildCompanyPortalUrl(subdomain, origin),
      })
    )

    return {
      invite: await this.getInviteById(inviteId, tenantId),
      employee: result.employee,
      credentials: {
        employeeCode: result.audit.employeeCode,
        loginEmail: result.audit.loginEmail,
        username: result.audit.username,
        temporaryPassword: credentials.temporaryPassword,
        resetLink,
        portalUrl: buildCompanyPortalUrl(subdomain, origin),
        welcomeLink: buildWelcomeLink(inviteId),
      },
      notificationSent: true,
    }
  },

  async getDocumentFile(documentId: string, tenantId: string) {
    const document = await prisma.onboardingDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { invite: true },
    })

    if (!document) {
      throw new Error('Document not found.')
    }

    return document
  },

  async markFirstLoginComplete(userId: string) {
    const audit = await prisma.employeeCredentialsAudit.findFirst({
      where: { employeeUserId: userId },
    })

    if (!audit) {
      return null
    }

    return prisma.employeeCredentialsAudit.update({
      where: { inviteId: audit.inviteId },
      data: {
        passwordResetRequired: false,
        firstLoginCompleted: true,
        activatedAt: new Date(),
      },
    })
  },

  buildPasswordResetLink,
  buildOnboardingLink,
  buildWelcomeLink,
  buildCompanyPortalUrl,
  normalizeReviewStatus,
  getInviteInclude,
  createStatusLog,
  getFieldLabel,
  storeUploadedFiles,
  deriveInviteStatus,
}
