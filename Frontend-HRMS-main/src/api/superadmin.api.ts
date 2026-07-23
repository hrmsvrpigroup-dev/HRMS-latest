import api from './axios'

export type Company = {
  id: string
  name: string
  subdomain: string
  logoUrl?: string
  registrationDocs?: string[]
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'PENDING'
  credits: number
  createdAt: string
  updatedAt: string
  users?: {
    email: string
    firstName: string
    lastName: string
    phone?: string | null
  }[]
}

export type SuperAdminDashboardData = {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  totalCreditsAllocated: number
}

export const superAdminApi = {
  async getDashboard() {
    const response = await api.get<{ success: boolean; data: SuperAdminDashboardData }>('/superadmin/dashboard')
    return response.data.data
  },

  async getCompanies() {
    const response = await api.get<{ success: boolean; data: Company[] }>('/superadmin/companies')
    return response.data.data
  },

  async createCompany(data: {
    name: string
    subdomain: string
    adminEmail: string
    adminFirstName: string
    adminLastName: string
    initialCredits: number
  }) {
    const response = await api.post<{ success: boolean; data: Company }>('/superadmin/companies', data)
    return response.data.data
  },

  async toggleCompanyStatus(id: string, status: string) {
    const response = await api.patch<{ success: boolean; data: Company }>(`/superadmin/companies/${id}/status`, { status })
    return response.data.data
  },

  async addCredits(id: string, amount: number, description: string) {
    const response = await api.post<{ success: boolean; data: Company }>(`/superadmin/companies/${id}/credits`, { amount, description })
    return response.data.data
  },

  async deleteCompany(id: string, password: string) {
    const response = await api.delete<{ success: boolean }>(`/superadmin/companies/${id}`, { data: { password } })
    return response.data
  },

  async createCompanyWithFullDetails(formData: FormData) {
    const response = await api.post<{ success: boolean; data: Company }>('/superadmin/companies/full', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async downloadInvoice(id: string) {
    const response = await api.get(`/superadmin/companies/${id}/invoice`, {
      responseType: 'blob',
    })
    return response.data
  },

  async createPaymentOrder(amount: number) {
    const response = await api.post('/payments/create-order', { credits: amount })
    return response.data
  },

  async sendDocumentRequest(id: string) {
    const response = await api.post<{ success: boolean; data: { sent: boolean }; message: string }>(`/superadmin/companies/${id}/document-request`)
    return response.data
  },

  async getCompany(id: string) {
    const response = await api.get<{ success: boolean; data: any }>(`/superadmin/companies/${id}`)
    return response.data.data
  },

  async resendCredentials(id: string) {
    const response = await api.post<{ success: boolean; message: string }>(`/superadmin/companies/${id}/resend-credentials`)
    return response.data
  },

  async updateCompanyFull(id: string, formData: FormData) {
    const response = await api.put<{ success: boolean; data: Company }>(`/superadmin/companies/${id}/full`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  // Document APIs
  async getDocuments() {
    const response = await api.get<{ success: boolean; data: any[] }>('/superadmin/documents')
    return response.data
  },

  async uploadDocument(formData: FormData) {
    const response = await api.post<{ success: boolean; data: any }>('/superadmin/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async replaceDocument(id: string, formData: FormData) {
    const response = await api.post<{ success: boolean; data: any }>(`/superadmin/documents/${id}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async deleteDocument(id: string) {
    const response = await api.delete<{ success: boolean }>(`/superadmin/documents/${id}`)
    return response.data
  },
}
