export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'EMPLOYEE'

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string
  lastName: string
  tenantId: string | null
}
