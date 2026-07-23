import { createReadStream } from 'fs'
import { access } from 'fs/promises'
import { Request, Response } from 'express'

import { AuthRequest } from '../middleware/auth.middleware'
import { sendError, sendSuccess } from '../utils/response.utils'
import { onboardingService } from '../services/onboarding.service'

export const onboardingController = {
  async createInvite(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const createdById = req.user?.id

    if (!tenantId || !createdById) {
      return sendError(res, 'Tenant context not found', 400)
    }

    const { firstName, lastName, personalEmail, phoneNumber, department, designation, employmentType, joiningDate, baseSalary, workLocation, experienceLevel } = req.body

    if (!firstName || !lastName || !personalEmail || !department || !designation || !employmentType || !joiningDate) {
      return sendError(
        res,
        'Required fields firstName, lastName, personalEmail, department, designation, employmentType, and joiningDate are missing.',
        400
      )
    }

    try {
      const invite = await onboardingService.createInvite(
        {
          firstName,
          lastName,
          personalEmail,
          phoneNumber,
          department,
          designation,
          employmentType,
          joiningDate,
          baseSalary: Number(baseSalary) || 0,
          workLocation,
          experienceLevel,
        },
        createdById,
        tenantId
      )

      return sendSuccess(res, invite, 'Onboarding invitation created successfully', 201)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create onboarding invitation', 400)
    }
  },

  async listInvites(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const invites = await onboardingService.listInvites(tenantId)
      return sendSuccess(res, invites)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch onboarding invites', 500)
    }
  },

  async getInviteById(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const { inviteId } = req.params
    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const invite = await onboardingService.getInviteById(inviteId, tenantId)
      return sendSuccess(res, invite)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch onboarding invite', 404)
    }
  },

  async getInviteByToken(req: Request, res: Response) {
    const { token } = req.params
    try {
      const invite = await onboardingService.getInviteByToken(token)
      return sendSuccess(res, invite)
    } catch (error: any) {
      return sendError(res, error.message || 'Invalid onboarding link', 404)
    }
  },

  async submitOnboarding(req: any, res: Response) {
    const { token } = req.params
    try {
      const invite = await onboardingService.submitOnboarding(token, req.body?.payload, req.files)
      return sendSuccess(res, invite, 'Onboarding form submitted successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit onboarding form', 400)
    }
  },

  async reviewDocument(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const { inviteId, documentId } = req.params
    const { decision, comments } = req.body as { decision?: string; comments?: string }

    if (!tenantId || !req.user) {
      return sendError(res, 'Tenant context not found', 400)
    }

    if (!decision) {
      return sendError(res, 'Document review decision is required', 422)
    }

    try {
      const normalizedDecision = decision?.toLowerCase() === 'approved' ? 'approved' : 'rejected'
      const result = await onboardingService.reviewDocument({
        inviteId,
        documentId,
        tenantId,
        verifierId: req.user.id,
        verifierRole: req.user.role,
        decision: normalizedDecision,
        comments,
      })
      return sendSuccess(res, result, 'Document review updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to review document', 400)
    }
  },

  async approveInvite(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const { inviteId } = req.params

    if (!tenantId || !req.user) {
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined)
      const result = await onboardingService.approveInvite({
        inviteId,
        tenantId,
        approverId: req.user.id,
        origin,
      })
      return sendSuccess(res, result, 'Employee onboarding approved successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to approve onboarding', 400)
    }
  },

  async downloadDocument(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const { documentId } = req.params

    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const document = await onboardingService.getDocumentFile(documentId, tenantId)
      await access(document.storagePath)

      const disposition = req.query.download === '1' ? 'attachment' : 'inline'
      res.setHeader('Content-Type', document.mimeType)
      res.setHeader('Content-Disposition', `${disposition}; filename="${document.originalName}"`)
      const stream = createReadStream(document.storagePath)
      stream.on('error', () => {
        if (!res.headersSent) {
          sendError(res, 'Failed to stream document', 500)
        }
      })
      return stream.pipe(res)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to download document', 404)
    }
  },
}
