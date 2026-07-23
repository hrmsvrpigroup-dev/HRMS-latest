import api from './axios'

export type OnboardingStatus =
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'approved'
  | 'expired'

export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected'

export type OnboardingDocument = {
  id: string
  tenantId: string
  inviteId: string
  documentType: string
  originalName: string
  storedName: string
  storagePath: string
  mimeType: string
  fileSize: number
  status: DocumentReviewStatus
  reviewComment?: string | null
  reviewedById?: string | null
  reviewedAt?: string | null
  uploadedAt: string
  reviewedBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  verifications?: Array<{
    id: string
    decision: 'approved' | 'rejected'
    comments?: string | null
    createdAt: string
    verifier?: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
    }
  }>
}

export type OnboardingInvite = {
  id: string
  tenantId: string
  token: string
  status: OnboardingStatus
  expiryAt: string
  createdById: string
  firstName: string
  lastName: string
  personalEmail: string
  phoneNumber?: string | null
  department: string
  designation: string
  employmentType: string
  joiningDate: string
  baseSalary: number
  workLocation?: string | null
  experienceLevel?: string | null
  onboardingData?: Record<string, unknown> | null
  submittedAt?: string | null
  workEmail?: string | null
  username?: string | null
  employeeId?: string | null
  employeeUserId?: string | null
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  documents?: OnboardingDocument[]
  verifications?: Array<{
    id: string
    documentId: string
    decision: 'approved' | 'rejected'
    verifierRole: string
    comments?: string | null
    createdAt: string
    verifier?: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
    }
  }>
  statusLogs?: Array<{
    id: string
    previousStatus?: string | null
    nextStatus: string
    action: string
    notes?: string | null
    createdAt: string
    actor?: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
    } | null
  }>
  credentialsAudit?: {
    id: string
    employeeCode: string
    loginEmail: string
    username: string
    passwordResetRequired: boolean
    firstLoginCompleted: boolean
    tempPasswordIssuedAt: string
    tempPasswordExpiresAt?: string | null
  } | null
  onboardingUrl?: string
  documentSummary?: {
    total: number
    approved: number
    rejected: number
    pending: number
  }
}

export type CreateInvitePayload = {
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

export type OnboardingSubmissionPayload = {
  personalDetails: Record<string, unknown>
  addressDetails: Record<string, unknown>
  employmentDetails: Record<string, unknown>
  payrollDetails: Record<string, unknown>
  preferredEmployeeId?: string
  reportingManager?: string
}

export const onboardingApi = {
  createInvite: async (payload: CreateInvitePayload) => {
    const response = await api.post<{ success: boolean; data: OnboardingInvite }>('/onboarding/invites', payload)
    return response.data.data
  },

  listInvites: async () => {
    const response = await api.get<{ success: boolean; data: OnboardingInvite[] }>('/onboarding/invites')
    return response.data.data
  },

  getInviteById: async (inviteId: string) => {
    const response = await api.get<{ success: boolean; data: OnboardingInvite }>(`/onboarding/invites/${inviteId}`)
    return response.data.data
  },

  getInviteByToken: async (token: string) => {
    const response = await api.get<{ success: boolean; data: OnboardingInvite }>(`/onboarding/invite/${token}`)
    return response.data.data
  },

  submitOnboarding: async (token: string, formData: FormData) => {
    const response = await api.post<{ success: boolean; data: OnboardingInvite }>(`/onboarding/invite/${token}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  reviewDocument: async (inviteId: string, documentId: string, decision: 'approved' | 'rejected', comments?: string) => {
    const response = await api.patch<{ success: boolean; data: { invite: OnboardingInvite; document: OnboardingDocument } }>(
      `/onboarding/invites/${inviteId}/documents/${documentId}/review`,
      { decision, comments }
    )
    return response.data.data
  },

  approveInvite: async (inviteId: string) => {
    const response = await api.post<{
      success: boolean
      data: {
        invite: OnboardingInvite
        employee: Record<string, unknown>
        credentials: {
          employeeCode: string
          loginEmail: string
          username: string
          temporaryPassword: string
          resetLink: string
          portalUrl: string
          welcomeLink: string
        }
        notificationSent: boolean
      }
    }>(`/onboarding/invites/${inviteId}/approve`)
    return response.data.data
  },

  downloadDocument: async (documentId: string, download = false) => {
    const response = await api.get(`/onboarding/documents/${documentId}${download ? '?download=1' : ''}`, {
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
