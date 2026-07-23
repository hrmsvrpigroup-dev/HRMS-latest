import api from './axios'

export interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
}

export interface DocumentData {
  id: string
  tenantId: string
  employeeId: string
  name: string
  type: string
  fileUrl: string
  fileSize: number | null
  verified: boolean
  uploadedAt: string
  employee?: EmployeeData
}

export const documentApi = {
  list: () => api.get<{ data: DocumentData[] }>('/documents'),
  upload: (data: FormData) => api.post<{ data: DocumentData }>('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  replace: (id: string, data: FormData) => api.put<{ data: DocumentData }>(`/documents/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete<{ message: string }>(`/documents/${id}`),
  verify: (id: string) => api.put<{ data: DocumentData }>(`/documents/${id}/verify`),
}
