import { prisma } from '../config/database'

export const employeeService = {
  async countByTenant(tenantId: string) {
    return prisma.employee.count({ where: { tenantId } })
  },
}

