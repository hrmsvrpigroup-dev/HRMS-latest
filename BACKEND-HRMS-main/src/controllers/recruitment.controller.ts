import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth.middleware'
import { sendError, sendSuccess } from '../utils/response.utils'

export const recruitmentController = {
  // Get all jobs and applicants
  async jobs(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const jobs = await prisma.jobPosting.findMany({
        where: { tenantId },
        include: {
          applications: {
            orderBy: { appliedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return sendSuccess(res, jobs)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to load recruitment data', 500)
    }
  },

  // Stage 1: Create a Job Posting
  async createJob(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const { title, department, description, location, mediaUrl } = req.body
      if (!title || !department || !description) {
        return sendError(res, 'Title, department, and description are required', 400)
      }

      const job = await prisma.jobPosting.create({
        data: {
          tenantId,
          title,
          department,
          description,
          mediaUrl: mediaUrl || null,
          status: 'OPEN',
        }
      })

      return sendSuccess(res, job, 'Job posting created successfully', 201)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create job posting', 500)
    }
  },

  // Stage 2: Toggle Job Status
  async updateJobStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { status } = req.body
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const job = await prisma.jobPosting.update({
        where: { id, tenantId },
        data: { status }
      })

      return sendSuccess(res, job, 'Job status updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update job status', 500)
    }
  },

  // Stage 3: Create Applicant/Application manually
  async createApplication(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const { jobId, firstName, lastName, email, phone, experience, source, skills } = req.body
      if (!jobId || !firstName || !lastName || !email) {
        return sendError(res, 'Job ID, first name, last name, and email are required', 400)
      }

      const job = await prisma.jobPosting.findFirst({
        where: { id: jobId, tenantId }
      })
      if (!job) {
        return sendError(res, 'Job posting not found or unauthorized access', 404)
      }

      const application = await prisma.jobApplication.create({
        data: {
          jobId,
          name: `${firstName} ${lastName}`,
          email,
          phone: phone || null,
          experience: experience || null,
          source: source || 'Direct',
          skills: skills ? skills.split(',').map((s: string) => s.trim()) : [],
          resumeUrl: 'uploaded-resume.pdf',
          status: 'APPLIED'
        }
      })

      return sendSuccess(res, application, 'Application submitted successfully', 201)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit application', 500)
    }
  },

  // Update Application Status
  async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { status } = req.body
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: { status }
      })

      return sendSuccess(res, updated, 'Application status updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update application status', 500)
    }
  },

  // Stage 4: Run AI Screen on candidate
  async aiScreenCandidate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      // Generate a mock semantic match score based on details (e.g. 70-98)
      const aiScore = Math.floor(Math.random() * 28) + 70

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: {
          aiScore,
          status: 'AI_SCREENING'
        }
      })

      return sendSuccess(res, updated, 'Candidate screened successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'AI Screening failed', 500)
    }
  },

  // Stage 6: Schedule/Resolve Interview
  async scheduleInterview(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { interviewDate, interviewTime, interviewType, interviewer, decision } = req.body
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      const updateData: any = {}
      if (interviewDate) updateData.interviewDate = new Date(interviewDate)
      if (interviewTime) updateData.interviewTime = interviewTime
      if (interviewType) updateData.interviewType = interviewType
      if (interviewer) updateData.interviewer = interviewer
      if (decision) {
        updateData.status = decision === 'pass' ? 'OFFER' : 'REJECTED'
      } else {
        updateData.status = 'INTERVIEW'
      }

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: updateData
      })

      return sendSuccess(res, updated, 'Interview details updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update interview', 500)
    }
  },

  // Stage 7: Draft, extend, accept offers
  async manageOffer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { offerSalary, offerJoiningDate, offerStatus } = req.body
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      const updateData: any = {}
      if (offerSalary) updateData.offerSalary = Number(offerSalary)
      if (offerJoiningDate) updateData.offerJoiningDate = new Date(offerJoiningDate)
      if (offerStatus) {
        updateData.offerStatus = offerStatus
        if (offerStatus === 'ACCEPTED') {
          updateData.status = 'DOCUMENTS'
        }
      }

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: updateData
      })

      return sendSuccess(res, updated, 'Offer updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to manage offer', 500)
    }
  },

  // Stage 8: Document Verification
  async verifyDocuments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { verified } = req.body
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: {
          documentsVerified: !!verified,
          status: verified ? 'HIRED' : 'DOCUMENTS'
        }
      })

      return sendSuccess(res, updated, 'Document verification updated successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to verify documents', 500)
    }
  },

  // Stage 9: Initiate Onboarding Invite
  async initiateOnboarding(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const tenantId = req.tenantId ?? req.user?.tenantId
      const createdById = req.user?.id
      if (!tenantId || !createdById) {
        return sendError(res, 'Tenant context not found or user context missing', 400)
      }

      const application = await prisma.jobApplication.findFirst({
        where: { id, job: { tenantId } },
        include: { job: true }
      })
      if (!application) {
        return sendError(res, 'Application not found or unauthorized access', 404)
      }

      if (application.onboarded && application.onboardingInviteId) {
        const invite = await prisma.onboardingInvite.findUnique({
          where: { id: application.onboardingInviteId }
        })
        return sendSuccess(res, { invite, application }, 'Candidate has already been onboarded')
      }

      const nameParts = application.name.split(' ')
      const firstName = nameParts[0] || 'Candidate'
      const lastName = nameParts.slice(1).join(' ') || 'Candidate'

      const { onboardingService } = require('../services/onboarding.service')
      const invite = await onboardingService.createInvite(
        {
          firstName,
          lastName,
          personalEmail: application.email,
          phoneNumber: application.phone || '',
          department: application.job.department || 'General',
          designation: application.job.title || 'Specialist',
          employmentType: 'FULL_TIME',
          joiningDate: application.offerJoiningDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          baseSalary: application.offerSalary || 50000,
          workLocation: 'Remote'
        },
        createdById,
        tenantId
      )

      const updated = await prisma.jobApplication.update({
        where: { id },
        data: {
          onboarded: true,
          onboardingInviteId: invite.id,
          status: 'HIRED'
        }
      })

      return sendSuccess(res, { invite, application: updated }, 'Onboarding invitation created successfully', 201)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to initiate onboarding invite', 500)
    }
  },

  // Attachments Handling
  async addAttachment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { attachmentImage } = req.body

      if (!attachmentImage) {
        return sendError(res, 'Attachment image base64 data is required', 400)
      }

      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findUnique({
        where: { id },
        include: { job: true },
      })

      if (!application || application.job.tenantId !== tenantId) {
        return sendError(res, 'Job application not found or unauthorized access', 404)
      }

      const updatedApplication = await prisma.jobApplication.update({
        where: { id },
        data: {
          attachmentImages: {
            push: attachmentImage,
          },
        },
      })

      return sendSuccess(res, updatedApplication, 'Attachment added successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add attachment', 500)
    }
  },

  async removeAttachment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { attachmentImage } = req.body

      if (!attachmentImage) {
        return sendError(res, 'Attachment image identifier is required', 400)
      }

      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) {
        return sendError(res, 'Tenant context not found', 400)
      }

      const application = await prisma.jobApplication.findUnique({
        where: { id },
        include: { job: true },
      })

      if (!application || application.job.tenantId !== tenantId) {
        return sendError(res, 'Job application not found or unauthorized access', 404)
      }

      const newAttachments = application.attachmentImages.filter(img => img !== attachmentImage)

      const updatedApplication = await prisma.jobApplication.update({
        where: { id },
        data: {
          attachmentImages: newAttachments,
        },
      })

      return sendSuccess(res, updatedApplication, 'Attachment removed successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to remove attachment', 500)
    }
  }
}
