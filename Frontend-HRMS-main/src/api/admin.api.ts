import api from './axios'

export type AdminDashboardData = {
  employeesCount: number
  hrsCount: number
  creditsBalance: number
  companyName: string
  status: string
  pendingInvitations: number
  creditsThisMonth: number
  activityFeed: Array<{ type: string; title: string; subtitle: string; time: string }>
  headcountTrend: Array<{ date: string; headcount: number }>
}

export type HRUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  hrProfile?: {
    id: string
    department: string
    employeeLimit: number
  }
}

export const adminApi = {
  async getDashboard() {
    const response = await api.get<{ success: boolean; data: AdminDashboardData }>('/admin/dashboard')
    return response.data.data
  },

  async getHRs() {
    const response = await api.get<{ success: boolean; data: HRUser[] }>('/admin/hrs')
    return response.data.data
  },

  async createHR(data: {
    email: string
    password?: string
    firstName: string
    lastName: string
    department?: string
    employeeLimit?: number
  }) {
    const response = await api.post<{ success: boolean; data: HRUser }>('/admin/hrs', data)
    return response.data.data
  },

  async provisionHROperator(formData: FormData) {
    const response = await api.post<{ success: boolean; data: any }>('/admin/hr-operators/provision', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },

  async deleteHR(id: string) {
    const response = await api.delete<{ success: boolean; message: string }>(`/admin/hrs/${id}`)
    return response.data
  },

  async getDepartments() {
    const response = await api.get<{ success: boolean; data: any[] }>('/admin/departments')
    return response.data.data
  },

  async getBranches() {
    const response = await api.get<{ success: boolean; data: any[] }>('/admin/branches')
    return response.data.data
  },

  async getRoles() {
    const response = await api.get<{ success: boolean; data: any[] }>('/admin/roles')
    return response.data.data
  },

  async getPermissions() {
    const response = await api.get<{ success: boolean; data: any[] }>('/admin/permissions')
    return response.data.data
  },

  async getAttendanceSummary(year: number, month: number) {
    const response = await api.get<{ success: boolean; data: Record<string, { activeCount: number, leaveCount: number }> }>(
      `/admin/attendance-summary?year=${year}&month=${month}`
    )
    return response.data.data
  },

  async getAttendanceDetails(date: string, type: 'active' | 'leave' | 'inactive') {
    const response = await api.get<{ success: boolean; data: any[] }>(`/admin/attendance/details?date=${date}&type=${type}`)
    return response.data.data
  },

  async getEmployeePortfolio(id: string) {
    const response = await api.get<{ success: boolean; data: any }>(`/admin/employees/${id}/portfolio`)
    return response.data.data
  },
}
